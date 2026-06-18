#!/usr/bin/env node

const fs = require("fs");

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

function fail(reason) {
  console.log("deployment readiness owner action intake final gate test failed");
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

function assertSafeOutput(text) {
  const forbidden = [
    ["full-evm-address", /0x[a-fA-F0-9]{40}/],
    ["private-key-like-64-hex", /0x[a-fA-F0-9]{64}/],
    ["mnemonic", /\bmnemonic\b/i],
    ["rpc-url", /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i],
    ["api-key-assignment", /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i],
    ["env-assignment", /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m],
    ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ];

  for (const [, pattern] of forbidden) {
    assert(!pattern.test(text), "forbidden-output-detected");
  }

  const approvalPhrases = [
    "deployment approval",
    "funded transaction approval",
    "governance transaction approval",
    "BscScan verification approval",
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

const text = normalizeText(fs.readFileSync(expectedTextPath, "utf8"));
assertSafeOutput(text);
assert(text.includes("status: OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED"), "text-status-missing");
assert(text.includes("safeToDeploy: false"), "text-safe-to-deploy-missing");
assert(text.includes("owner review required: true"), "text-owner-review-missing");
assert(text.includes("later explicit deploy instruction required: true"), "text-later-instruction-missing");

const jsonText = normalizeText(fs.readFileSync(expectedJsonPath, "utf8"));
assertSafeOutput(jsonText);

let actual;
let expected;
try {
  actual = JSON.parse(jsonText);
  expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8").replace(/^\uFEFF/, ""));
} catch {
  fail("json-parse-failed");
}

assert(JSON.stringify(actual) === JSON.stringify(expected), "expected-json-mismatch");
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
assert(actual.requiresLaterExplicitDeployInstruction === true, "later-instruction-mismatch");
assert(actual.containsSecrets === false, "contains-secrets-mismatch");
assert(actual.containsRealOwnerValues === false, "contains-real-owner-values-mismatch");
assert(actual.unsafeInputAccepted === false, "unsafe-input-mismatch");
assert(actual.secretInputAccepted === false, "secret-input-mismatch");

for (const field of nonApprovalFields) {
  assert(actual.nonApproval && actual.nonApproval[field] === true, "non-approval-mismatch");
}

console.log("deployment readiness owner action intake final gate tests passed");
