#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const finalGateScript = "scripts/check-deployment-readiness-owner-action-intake-final-gate.js";
const expectedTextPath = "test/deployment-readiness-owner-action-intake-final-gate.expected.txt";
const expectedJsonPath = "test/deployment-readiness-owner-action-intake-final-gate.expected.json";

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

const requiredTextFragments = [
  "VGC-FUNKY-TOKEN deployment readiness owner action intake final gate",
  "status: OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED",
  "artifact: blocked or pending",
  "intake checks: blocked or pending",
  "parser: blocked or pending",
  "review packet: review required",
  "owner action packet: owner actions required",
  "blocker registry: deployment readiness blocked",
  "testnet preflight gate: blocked",
  "owner policy preflight gate: blocked",
  "safeToDeploy: false",
  "safeToPerformFundedTransaction: false",
  "safeToPerformGovernanceTransaction: false",
  "safeToVerifyBscScan: false",
  "safeToClaimReadiness: false",
  "owner review required: true",
  "later explicit deploy instruction required: true",
  "no deployment approval",
  "no funded transaction approval",
  "no governance transaction approval",
  "no BscScan verification approval",
  "no release approval",
  "no public visibility approval",
  "no runtime readiness approval",
  "no staging readiness approval",
  "no testnet readiness approval",
  "no mainnet readiness approval",
];

const forbiddenPatterns = [
  ["private-key-like-64-hex", /0x[0-9a-fA-F]{64}/],
  ["full-evm-address", /0x[0-9a-fA-F]{40}/],
  ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["db-url", /\b(postgres|postgresql|mysql|mongodb|redis):\/\//i],
  ["real-rpc-url", /\b(?:http|https|ws|wss):\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s"'<>]*/i],
  ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s"'<>]+/i],
  ["env-content", /^\s*(PRIVATE_KEY|MNEMONIC|RPC_URL|DATABASE_URL|DB_URL|JWT|COOKIE|API_KEY)\s*=\s*[^\s]+/im],
  ["api-key-value-assignment", /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i],
  ["raw-owner-json", /{\s*"targetNetwork"\s*:/],
  ["raw-issue-body", /###\s+Target network approval/i],
  ["local-machine-path", /[A-Z]:\\/],
  ["timestamp", /\b20\d{2}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/],
];

function fail(reason) {
  console.log("deployment readiness owner action intake final gate snapshot test failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function assert(condition, reason) {
  if (!condition) fail(reason);
}

function normalizeText(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trimEnd();
}

function runFinalGate(args = []) {
  const result = spawnSync(process.execPath, [finalGateScript, ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
  assert(result.status === 0, "final-gate-command-failed");
  return normalizeText(result.stdout);
}

function assertNoForbiddenValues(text) {
  for (const [, pattern] of forbiddenPatterns) {
    assert(!pattern.test(text), "forbidden-output-detected");
  }
}

function assertNoApprovalClaim(text) {
  const approvalPhrases = [
    "deployment approval",
    "funded transaction approval",
    "governance transaction approval",
    "BscScan verification approval",
    "release approval",
    "public visibility approval",
    "runtime readiness approval",
    "staging readiness approval",
    "testnet readiness approval",
    "mainnet readiness approval",
  ];

  for (const phrase of approvalPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nonApprovalPattern = new RegExp(`\\b(no|non|not)[-\\s]+${escaped}\\b`, "gi");
    const normalized = text.replace(nonApprovalPattern, "");
    assert(!new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(normalized), "approval-claim-detected");
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(normalizeText(fs.readFileSync(filePath, "utf8")));
  } catch {
    fail("expected-json-parse-failed");
  }
}

const text = runFinalGate();
const expectedText = normalizeText(fs.readFileSync(expectedTextPath, "utf8"));
assert(text === expectedText, "text-snapshot-mismatch");
for (const fragment of requiredTextFragments) {
  assert(text.includes(fragment), "required-text-fragment-missing");
}
assertNoForbiddenValues(text);
assertNoApprovalClaim(text);

const jsonText = runFinalGate(["--json"]);
assertNoForbiddenValues(jsonText);
assertNoApprovalClaim(jsonText);

let actual;
try {
  actual = JSON.parse(jsonText);
} catch {
  fail("generated-json-parse-failed");
}

const expected = readJson(expectedJsonPath);
assert(JSON.stringify(actual) === JSON.stringify(expected), "json-snapshot-mismatch");

assert(actual.status === "OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED", "status-mismatch");
assert(actual.artifactStatus === "OWNER_ACTION_INTAKE_ARTIFACT_BLOCKED_OR_PENDING", "artifact-status-mismatch");
assert(actual.intakeChecksStatus === "OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING", "intake-checks-status-mismatch");
assert(actual.parserStatus === "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING", "parser-status-mismatch");
assert(actual.reviewPacketStatus === "OWNER_ACTION_REVIEW_REQUIRED", "review-packet-status-mismatch");
assert(actual.ownerActionPacketStatus === "OWNER_ACTIONS_REQUIRED", "owner-action-packet-status-mismatch");
assert(actual.blockerRegistryStatus === "DEPLOYMENT_READINESS_BLOCKED", "blocker-registry-status-mismatch");
assert(actual.testnetPreflightGateStatus === "BLOCKED_OWNER_DECISIONS_PENDING", "testnet-gate-status-mismatch");
assert(actual.ownerPolicyPreflightGateStatus === "BLOCKED_OWNER_POLICY_DECISIONS_PENDING", "owner-policy-gate-status-mismatch");

for (const field of safeToFields) {
  assert(actual[field] === false, "safe-to-flag-mismatch");
}

assert(actual.requiresOwnerReview === true, "owner-review-mismatch");
assert(actual.requiresLaterExplicitDeployInstruction === true, "deploy-instruction-mismatch");
assert(actual.containsSecrets === false, "contains-secrets-mismatch");
assert(actual.containsRealOwnerValues === false, "contains-real-owner-values-mismatch");
assert(actual.unsafeInputAccepted === false, "unsafe-input-mismatch");
assert(actual.secretInputAccepted === false, "secret-input-mismatch");

for (const field of nonApprovalFields) {
  assert(actual.nonApproval && actual.nonApproval[field] === true, "non-approval-mismatch");
}

console.log("deployment readiness owner action intake final gate snapshot tests passed");
