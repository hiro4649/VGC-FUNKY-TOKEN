#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const exporterPath = path.join(__dirname, "export-deployment-readiness-owner-action-intake-artifact.js");
const expectedJsonPath = "test/deployment-readiness-owner-action-intake-artifact.expected.json";
const AGGREGATE_CHILD_TIMEOUT_MS = 900000;
const CHILD_MAX_BUFFER = 1048576;

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
  console.log("deployment readiness owner action intake artifact test failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function assert(condition, reason) {
  if (!condition) fail(reason);
}

function runExporter(args = []) {
  const result = spawnSync(process.execPath, [exporterPath, ...args], {
    encoding: "utf8",
    stdio: "pipe",
    timeout: AGGREGATE_CHILD_TIMEOUT_MS,
    maxBuffer: CHILD_MAX_BUFFER,
  });
  if (result.error && result.error.code === "ETIMEDOUT") {
    fail("deployment_readiness_child_timeout:artifactExporter");
  }
  assert(result.status === 0, "exporter-command-failed");
  return result.stdout;
}

function assertSafeOutput(text) {
  const forbidden = [
    ["raw-issue-body", /###\s+Target network approval/i],
    ["raw-owner-json", /{\s*"targetNetwork"\s*:/],
    ["full-evm-address", /0x[a-fA-F0-9]{40}/],
    ["private-key-like-64-hex", /0x[a-fA-F0-9]{64}/],
    ["rpc-url", /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i],
    ["api-key-assignment", /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i],
    ["env-assignment", /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m],
    ["db-url", /\b(?:postgres|mysql|mongodb|redis):\/\//i],
    ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
    ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s"'<>]+/i],
    ["local-machine-path", /[A-Z]:\\/],
    ["timestamp", /\b20\d{2}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/],
    ["approval-claim", /\b(deployment|readiness)\s+approval\b/i],
  ];

  for (const [, pattern] of forbidden) {
    assert(!pattern.test(text), "forbidden-output-detected");
  }
}

const jsonText = runExporter();
const prettyText = runExporter(["--pretty"]);
assertSafeOutput(jsonText);
assertSafeOutput(prettyText);

let actual;
let pretty;
let expected;
try {
  actual = JSON.parse(jsonText);
  pretty = JSON.parse(prettyText);
  expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8").replace(/^\uFEFF/, ""));
} catch {
  fail("json-parse-failed");
}

assert(JSON.stringify(actual) === JSON.stringify(pretty), "pretty-json-mismatch");
assert(JSON.stringify(actual) === JSON.stringify(expected), "expected-json-mismatch");

assert(actual.schemaName === "VGC_DEPLOYMENT_READINESS_OWNER_ACTION_INTAKE_ARTIFACT", "schema-name-mismatch");
assert(actual.schemaVersion === 1, "schema-version-mismatch");
assert(actual.status === "OWNER_ACTION_INTAKE_ARTIFACT_BLOCKED_OR_PENDING", "status-mismatch");
assert(actual.intakeChecksStatus === "OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING", "intake-status-mismatch");
assert(actual.parserStatus === "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING", "parser-status-mismatch");
assert(actual.reviewPacketStatus === "OWNER_ACTION_REVIEW_REQUIRED", "review-packet-status-mismatch");
assert(actual.ownerActionPacketStatus === "OWNER_ACTIONS_REQUIRED", "owner-action-packet-status-mismatch");
assert(actual.blockerRegistryStatus === "DEPLOYMENT_READINESS_BLOCKED", "blocker-registry-status-mismatch");
assert(actual.testnetPreflightGateStatus === "BLOCKED_OWNER_DECISIONS_PENDING", "testnet-gate-status-mismatch");
assert(actual.ownerPolicyPreflightGateStatus === "BLOCKED_OWNER_POLICY_DECISIONS_PENDING", "owner-policy-gate-status-mismatch");

for (const field of safeToFields) {
  assert(actual[field] === false, "safe-to-flag-mismatch");
}

assert(actual.containsSecrets === false, "contains-secrets-mismatch");
assert(actual.containsRealOwnerValues === false, "contains-real-owner-values-mismatch");
assert(actual.unsafeInputAccepted === false, "unsafe-input-mismatch");
assert(actual.secretInputAccepted === false, "secret-input-mismatch");
assert(actual.requiresOwnerReview === true, "owner-review-mismatch");
assert(actual.requiresLaterExplicitDeployInstruction === true, "deploy-instruction-mismatch");

for (const field of nonApprovalFields) {
  assert(actual.nonApproval && actual.nonApproval[field] === true, "non-approval-mismatch");
}

for (const field of [
  "pendingOwnerActionCount",
  "placeholderSafeActionCount",
  "requiredCheckCount",
  "passedCheckCount",
  "blockedGateCount",
]) {
  assert(Number.isInteger(actual.summary && actual.summary[field]), "summary-count-missing");
  assert(actual.summary[field] >= 0, "summary-count-negative");
}

console.log("deployment readiness owner action intake artifact tests passed");
