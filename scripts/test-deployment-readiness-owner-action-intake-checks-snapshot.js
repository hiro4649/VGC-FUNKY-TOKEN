#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const commandPath = path.join(__dirname, "run-deployment-readiness-owner-action-intake-checks.js");
const expectedTextPath = "test/deployment-readiness-owner-action-intake-checks.expected.txt";
const expectedJsonPath = "test/deployment-readiness-owner-action-intake-checks.expected.json";

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

const passChecks = [
  "templateGuard",
  "parser",
  "parserSnapshot",
  "reviewPacket",
  "reviewPacketSnapshot",
  "ownerActionPacket",
  "ownerActionPacketSnapshot",
  "blockerRegistry",
  "blockerRegistrySnapshot",
];

const blockedChecks = [
  "testnetPreflightGate",
  "ownerPolicyPreflightGate",
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
  console.log("deployment readiness owner action intake checks snapshot test failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function assert(condition, reason) {
  if (!condition) fail(reason);
}

function normalizeLf(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trimEnd();
}

function runCommand(args) {
  const result = spawnSync(process.execPath, [commandPath, ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) fail("command-failed");
  return result.stdout;
}

function assertSafeOutput(text) {
  const forbidden = [
    ["full-evm-address", /0x[a-fA-F0-9]{40}/],
    ["private-key-like-64-hex", /0x[a-fA-F0-9]{64}/],
    ["rpc-url", /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i],
    ["api-key-assignment", /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i],
    ["env-assignment", /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m],
    ["db-url", /\b(?:postgres|mysql|mongodb|redis):\/\//i],
    ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
    ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s"'<>]+/i],
  ];

  for (const [, pattern] of forbidden) {
    assert(!pattern.test(text), "forbidden-output-detected");
  }
}

const text = normalizeLf(runCommand([]));
const expectedText = normalizeLf(fs.readFileSync(expectedTextPath, "utf8"));
assert(text === expectedText, "text-snapshot-mismatch");
assertSafeOutput(text);

const jsonText = runCommand(["--json"]);
assertSafeOutput(jsonText);

let actual;
let expected;
try {
  actual = JSON.parse(jsonText);
  expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8").replace(/^\uFEFF/, ""));
} catch {
  fail("json-parse-failed");
}

assert(JSON.stringify(actual) === JSON.stringify(expected), "json-snapshot-mismatch");
assert(actual.status === "OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING", "status-mismatch");

for (const check of requiredChecks) {
  assert(actual.checks && actual.checks[check], "required-check-missing");
}

for (const check of passChecks) {
  assert(actual.checks[check].status === "pass", "pass-check-status-mismatch");
}

for (const check of blockedChecks) {
  assert(actual.checks[check].status === "blocked", "blocked-check-status-mismatch");
}

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

console.log("deployment readiness owner action intake checks snapshot tests passed");
