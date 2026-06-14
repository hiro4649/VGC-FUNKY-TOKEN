#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const parserPath = path.join(__dirname, "parse-deployment-readiness-owner-action-issue.js");
const samplePath = "test/deployment-readiness-owner-action-issue.sample.md";
const expectedTextPath = "test/deployment-readiness-owner-action-issue.expected.txt";
const expectedJsonPath = "test/deployment-readiness-owner-action-issue.expected.json";

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
  console.log("deployment readiness owner action issue parser snapshot test failed");
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

function runParser(args) {
  return spawnSync(process.execPath, [parserPath, ...args], { encoding: "utf8" });
}

function assertSafeOutput(text) {
  const forbidden = [
    /0x[a-fA-F0-9]{40}/,
    /0x[a-fA-F0-9]{64}/,
    /\b(?:https?|wss?):\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i,
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

const textResult = runParser([samplePath]);
assert(textResult.status === 0, "text-command-failed");
assertSafeOutput(textResult.stdout);
const actualText = normalizeLf(textResult.stdout);
const expectedText = `${normalizeLf(fs.readFileSync(expectedTextPath, "utf8")).replace(/\n*$/, "")}\n`;
assert(actualText === expectedText, "text-snapshot-mismatch");

const jsonResult = runParser([samplePath, "--json"]);
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
assert(actual.status === "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING", "status-mismatch");

for (const field of requiredFields) {
  const action = actual.ownerActions && actual.ownerActions[field];
  assert(action, `missing-owner-action-${field}`);
  assert(action.status === "pending_owner_action", `owner-action-status-${field}`);
  assert(action.unsafeInputAccepted === false, `unsafe-input-${field}`);
  assert(action.secretInputAccepted === false, `secret-input-${field}`);
}

for (const field of safeToFields) {
  assert(actual[field] === false, `safe-to-${field}`);
}

for (const field of nonApprovalFields) {
  assert(actual.nonApproval && actual.nonApproval[field] === true, `non-approval-${field}`);
}

console.log("deployment readiness owner action issue parser snapshot tests passed");
