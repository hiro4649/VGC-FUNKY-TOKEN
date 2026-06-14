#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const builderPath = path.join(__dirname, "build-deployment-readiness-owner-action-review-packet.js");
const samplePath = "test/deployment-readiness-owner-action-issue.sample.md";
const expectedJsonPath = "test/deployment-readiness-owner-action-review-packet.expected.json";

const requiredFields = [
  "approveBscTestnetUse",
  "initialAdmin",
  "initialFeeRecipient",
  "deployCommandApprovalText",
  "bscScanVerificationPlanText",
  "multisigPolicy",
  "adminRotationPolicy",
  "feeRecipientPolicy",
  "tierUpdaterPolicy",
  "trustedFactoryPolicy",
  "pairPolicy",
  "feeExemptionPolicy",
  "feeMaxPolicy",
  "feeDenominatorPolicy",
  "sellLpAddFeeBehaviorPolicy",
  "tierUpdaterLastRemovalPolicy",
  "feeExemptionProposerApproverPolicy",
  "tierUpdaterCodePresenceValidationPolicy",
  "sourceOfTruthRepositoryDecision",
  "repositoryVisibilityDecision",
];

const safeToFields = [
  "safeToDeploy",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToVerifyBscScan",
  "safeToClaimReadiness",
];

const nonApprovalFields = [
  "deployment",
  "fundedTransaction",
  "governanceTransaction",
  "bscScanVerification",
  "release",
  "publicVisibility",
  "runtimeReadiness",
  "stagingReadiness",
  "testnetReadiness",
  "mainnetReadiness",
];

function fail(reason) {
  console.log("deployment readiness owner action review packet test failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function assert(condition, reason) {
  if (!condition) fail(reason);
}

function runBuilder(args) {
  return spawnSync(process.execPath, [builderPath, ...args], { encoding: "utf8" });
}

function assertSafeOutput(text) {
  const forbidden = [
    /0x[a-fA-F0-9]{40}/,
    /0x[a-fA-F0-9]{64}/,
    /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i,
    /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i,
    /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m,
    /\b(?:postgres|mysql|mongodb|redis):\/\//i,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    /\bcookie\s*[:=]\s*[^\s"'<>]+/i,
  ];
  for (const pattern of forbidden) {
    assert(!pattern.test(text), "unsafe-output-detected");
  }
}

const textRun = runBuilder([samplePath]);
assert(textRun.status === 0, "text-builder-failed");
assertSafeOutput(textRun.stdout);
assert(textRun.stdout.includes("OWNER_ACTION_REVIEW_REQUIRED"), "text-status-missing");
assert(textRun.stdout.includes("source parse status: OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING"), "text-source-status-missing");
assert(textRun.stdout.includes("no deployment approval"), "text-non-approval-missing");

const jsonRun = runBuilder([samplePath, "--json"]);
assert(jsonRun.status === 0, "json-builder-failed");
assertSafeOutput(jsonRun.stdout);

let actual;
let expected;
try {
  actual = JSON.parse(jsonRun.stdout);
  expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8").replace(/^\uFEFF/, ""));
} catch {
  fail("json-parse-failed");
}

assert(JSON.stringify(actual) === JSON.stringify(expected), "json-snapshot-mismatch");
assert(actual.status === "OWNER_ACTION_REVIEW_REQUIRED", "status-mismatch");
assert(actual.sourceStatus === "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING", "source-status-mismatch");
assert(actual.pendingActionCount === requiredFields.length, "pending-count-mismatch");
assert(actual.unsafeInputAccepted === false, "unsafe-boundary-mismatch");
assert(actual.secretInputAccepted === false, "secret-boundary-mismatch");
assert(actual.containsSecrets === false, "contains-secrets-mismatch");
assert(actual.containsRealOwnerValues === false, "contains-real-owner-values-mismatch");
assert(actual.requiresLaterExplicitDeployInstruction === true, "deploy-instruction-boundary-mismatch");
assert(actual.requiresOwnerReview === true, "owner-review-boundary-mismatch");

for (const field of requiredFields) {
  const action = actual.ownerActionsSummary && actual.ownerActionsSummary[field];
  assert(action, "required-field-missing");
  assert(action.status === "pending_owner_action", "field-status-mismatch");
  assert(action.unsafeInputAccepted === false, "field-unsafe-boundary-mismatch");
  assert(action.secretInputAccepted === false, "field-secret-boundary-mismatch");
}

for (const field of safeToFields) {
  assert(actual[field] === false, "safe-to-flag-mismatch");
}
for (const field of nonApprovalFields) {
  assert(actual.nonApproval && actual.nonApproval[field] === true, "non-approval-mismatch");
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "owner-action-review-packet-"));
try {
  const base = fs.readFileSync(samplePath, "utf8");
  const malicious = [
    ["private-key", `0x${"a".repeat(64)}`],
    ["rpc-url", ["ht", "tps://", "rpc.example.invalid/path"].join("")],
    ["api-key", ["api", "Key=", "dummysecretvalue"].join("")],
    ["env-content", ["PRIVATE", "_KEY=", "dummy"].join("")],
    ["jwt", ["ey", "Jabc", ".def", ".ghi"].join("")],
    ["cookie", ["coo", "kie=", "value"].join("")],
    ["funding-proof", "wallet funding proof attached"],
    ["approval", ["deployment", " approval granted"].join("")],
    ["readiness", ["readiness", " approval granted"].join("")],
  ];
  for (const [name, value] of malicious) {
    const filePath = path.join(tempDir, `${name}.md`);
    fs.writeFileSync(filePath, `${base}\n### malicious\n\n${value}\n`);
    const result = runBuilder([filePath]);
    assert(result.status !== 0, `${name}-not-rejected`);
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    assert(output.includes("safe reason code:"), `${name}-missing-safe-reason`);
    assert(!output.includes(value), `${name}-unsafe-echo`);
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("deployment readiness owner action review packet tests passed");
