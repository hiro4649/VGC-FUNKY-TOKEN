#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const builderPath = path.join(__dirname, "build-deployment-readiness-owner-action-review-packet.js");
const samplePath = "test/deployment-readiness-owner-action-issue.sample.md";
const expectedTextPath = "test/deployment-readiness-owner-action-review-packet.expected.txt";
const expectedJsonPath = "test/deployment-readiness-owner-action-review-packet.expected.json";

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
  console.log("deployment readiness owner action review packet snapshot test failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function assert(condition, reason) {
  if (!condition) fail(reason);
}

function normalizeLf(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
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
    assert(!pattern.test(text), "forbidden-output");
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableJson(value[key])]),
    );
  }
  return value;
}

const textResult = runBuilder([samplePath]);
assert(textResult.status === 0, "text-command-failed");
assertSafeOutput(textResult.stdout);
const actualText = normalizeLf(textResult.stdout);
const expectedText = `${normalizeLf(fs.readFileSync(expectedTextPath, "utf8")).replace(/\n*$/, "")}\n`;
assert(actualText === expectedText, "text-snapshot-mismatch");

const jsonResult = runBuilder([samplePath, "--json"]);
assert(jsonResult.status === 0, "json-command-failed");
assertSafeOutput(jsonResult.stdout);

let actual;
let expected;
try {
  actual = JSON.parse(jsonResult.stdout);
  expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8").replace(/^\uFEFF/, ""));
} catch {
  fail("json-parse-failed");
}

assert(JSON.stringify(stableJson(actual)) === JSON.stringify(stableJson(expected)), "json-snapshot-mismatch");
assert(actual.status === "OWNER_ACTION_REVIEW_REQUIRED", "status-mismatch");
assert(actual.sourceStatus === "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING", "source-status-mismatch");
assert(actual.unsafeInputAccepted === false, "unsafe-boundary-mismatch");
assert(actual.secretInputAccepted === false, "secret-boundary-mismatch");
assert(actual.containsSecrets === false, "contains-secrets-mismatch");
assert(actual.containsRealOwnerValues === false, "contains-real-owner-values-mismatch");
assert(actual.requiresLaterExplicitDeployInstruction === true, "deploy-instruction-boundary-mismatch");
assert(actual.requiresOwnerReview === true, "owner-review-boundary-mismatch");

for (const field of safeToFields) {
  assert(actual[field] === false, `safe-to-${field}`);
}

for (const field of nonApprovalFields) {
  assert(actual.nonApproval && actual.nonApproval[field] === true, `non-approval-${field}`);
}

console.log("deployment readiness owner action review packet snapshot tests passed");
