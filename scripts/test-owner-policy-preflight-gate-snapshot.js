#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedTextPath = "test/owner-policy-preflight-gate.expected.txt";
const expectedJsonPath = "test/owner-policy-preflight-gate.expected.json";

const requiredPolicyFields = [
  "feeMaxPolicy",
  "feeDenominatorPolicy",
  "sellLpAddFeeBehaviorPolicy",
  "tierUpdaterLastRemovalPolicy",
  "trustedFactoryRegistrationPolicy",
  "feeExemptionProposerApproverPolicy",
  "tierUpdaterCodePresenceValidationPolicy",
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

const forbiddenPatterns = [
  ["private-key-like-64-hex", /0x[0-9a-fA-F]{64}/],
  ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["db-url", /\b(postgres|postgresql|mysql|mongodb|redis):\/\//i],
  ["real-rpc-url", /https?:\/\/[^\s]*\b(bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s]*/i],
  ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s]+/i],
  ["env-content", /^\s*(PRIVATE_KEY|MNEMONIC|RPC_URL|DATABASE_URL|DB_URL|JWT|COOKIE|API_KEY)\s*=\s*[^\s]+/im],
  ["api-key-value-assignment", /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i],
  ["raw-owner-json", /{\s*"targetNetwork"\s*:/],
  ["raw-issue-body", /###\s+Target network approval/i],
];

function fail(reason) {
  console.log("owner policy preflight gate snapshot guard failed");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function runGate(args = []) {
  const result = spawnSync(process.execPath, ["scripts/check-owner-policy-preflight-gate.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail("owner policy preflight gate command failed");
  }

  return result.stdout.replace(/\r\n/g, "\n").trimEnd();
}

function assertNoForbiddenValues(label, text) {
  for (const [, pattern] of forbiddenPatterns) {
    if (pattern.test(text)) {
      fail(`${label} contains forbidden output`);
    }
  }
}

function assertJsonShape(actual, expected) {
  if (JSON.stringify(Object.keys(actual).sort()) !== JSON.stringify(Object.keys(expected).sort())) {
    fail("JSON top-level field mismatch");
  }

  if (actual.status !== "BLOCKED_OWNER_POLICY_DECISIONS_PENDING") {
    fail("unexpected owner policy gate status");
  }

  if (actual.testnetPreflightGateStatus !== "BLOCKED_OWNER_DECISIONS_PENDING") {
    fail("unexpected testnet preflight gate status");
  }

  if (actual.ownerPolicyDecisionStatus !== "OWNER_POLICY_DECISIONS_PENDING") {
    fail("unexpected owner policy decision status");
  }

  for (const field of requiredPolicyFields) {
    const decision = actual.policyDecisionFields?.[field];
    if (!decision || decision.status !== "pending_owner_decision") {
      fail("required policy field missing or not pending");
    }
  }

  if (Object.keys(actual.policyDecisionFields || {}).length !== requiredPolicyFields.length) {
    fail("policy field count mismatch");
  }

  for (const field of safeToFields) {
    if (actual[field] !== false) {
      fail("safeTo flag is not false");
    }
  }

  for (const field of nonApprovalFields) {
    if (actual.nonApproval?.[field] !== true) {
      fail("nonApproval field is not true");
    }
  }

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("JSON snapshot mismatch");
  }
}

const actualText = runGate();
const expectedText = fs.readFileSync(expectedTextPath, "utf8").replace(/\r\n/g, "\n").trimEnd();

if (actualText !== expectedText) {
  fail("text snapshot mismatch");
}

assertNoForbiddenValues("text output", actualText);

const actualJsonText = runGate(["--json"]);
assertNoForbiddenValues("JSON output", actualJsonText);

let actualJson;
let expectedJson;
try {
  actualJson = JSON.parse(actualJsonText);
  expectedJson = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8"));
} catch {
  fail("JSON snapshot could not be parsed");
}

assertJsonShape(actualJson, expectedJson);

console.log("owner policy preflight gate snapshot guard passed");
