#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const commandPath = path.join(__dirname, "run-deployment-readiness-owner-action-intake-checks.js");
const expectedJsonPath = "test/deployment-readiness-owner-action-intake-checks.expected.json";
const AGGREGATE_CHILD_TIMEOUT_MS = 900000;
const CHILD_MAX_BUFFER = 1048576;

const requiredChecks = [
  "templateGuard",
  "parser",
  "parserJson",
  "parserSelfTest",
  "parserSnapshot",
  "reviewPacket",
  "reviewPacketJson",
  "reviewPacketSelfTest",
  "reviewPacketSnapshot",
  "ownerActionPacket",
  "ownerActionPacketJson",
  "ownerActionPacketSelfTest",
  "ownerActionPacketSnapshot",
  "blockerRegistry",
  "blockerRegistryJson",
  "blockerRegistrySelfTest",
  "blockerRegistrySnapshot",
  "testnetPreflightGate",
  "testnetPreflightGateJson",
  "ownerPolicyPreflightGate",
  "ownerPolicyPreflightGateJson",
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
  console.log("deployment readiness owner action intake checks test failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function assert(condition, reason) {
  if (!condition) fail(reason);
}

function runCommand(args) {
  const result = spawnSync(process.execPath, [commandPath, ...args], {
    encoding: "utf8",
    timeout: AGGREGATE_CHILD_TIMEOUT_MS,
    maxBuffer: CHILD_MAX_BUFFER,
  });
  if (result.error && result.error.code === "ETIMEDOUT") {
    fail("deployment_readiness_child_timeout:intakeChecks");
  }
  return result;
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

const textRun = runCommand([]);
assert(textRun.status === 0, "text-command-failed");
assertSafeOutput(textRun.stdout);
assert(textRun.stdout.includes("OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING"), "text-status-missing");
assert(textRun.stdout.includes("testnet preflight gate: blocked"), "text-testnet-gate-missing");
assert(textRun.stdout.includes("owner policy preflight gate: blocked"), "text-owner-gate-missing");
assert(textRun.stdout.includes("no deployment approval"), "text-non-approval-missing");

const jsonRun = runCommand(["--json"]);
assert(jsonRun.status === 0, "json-command-failed");
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
assert(actual.status === "OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING", "status-mismatch");
for (const check of requiredChecks) {
  assert(actual.checks && actual.checks[check], "required-check-missing");
}
assert(actual.checks.testnetPreflightGate.status === "blocked", "testnet-gate-status-mismatch");
assert(actual.checks.ownerPolicyPreflightGate.status === "blocked", "owner-gate-status-mismatch");
for (const field of safeToFields) {
  assert(actual[field] === false, "safe-to-flag-mismatch");
}
for (const field of nonApprovalFields) {
  assert(actual.nonApproval && actual.nonApproval[field] === true, "non-approval-mismatch");
}
assert(actual.containsSecrets === false, "contains-secrets-mismatch");
assert(actual.containsRealOwnerValues === false, "contains-real-owner-values-mismatch");
assert(actual.requiresOwnerReview === true, "owner-review-mismatch");
assert(actual.requiresLaterExplicitDeployInstruction === true, "deploy-instruction-mismatch");

console.log("deployment readiness owner action intake checks tests passed");
