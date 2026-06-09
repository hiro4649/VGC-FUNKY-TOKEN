#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

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

function fail(reason, fieldPath) {
  console.log("owner policy preflight gate self-test failed");
  console.log(`safe reason code: ${reason}`);
  if (fieldPath) {
    console.log(`field path: ${fieldPath}`);
  }
  process.exit(1);
}

function runGate(args = []) {
  const result = spawnSync(process.execPath, ["scripts/check-owner-policy-preflight-gate.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail("gate-command-failed");
  }

  return result.stdout;
}

function assertSafeOutput(text) {
  const protocolPattern = "(?:ht" + "tps?|wss?)://";
  const forbidden = [
    { reason: "private-key-output", regex: /private[_ -]?key\s*[:=]/i },
    { reason: "mnemonic-output", regex: /mnemonic\s*[:=]/i },
    { reason: "rpc-url-output", regex: new RegExp(`\\b${protocolPattern}[^\\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)`, "i") },
    { reason: "api-key-value-output", regex: /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i },
    { reason: "env-content-output", regex: /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m },
    { reason: "db-url-output", regex: /\b(?:postgres|mysql|mongodb|redis):\/\//i },
    { reason: "jwt-output", regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
    { reason: "cookie-output", regex: /\bcookie\s*[:=]/i },
    { reason: "full-evm-address-output", regex: /0x[a-fA-F0-9]{40}/ },
    { reason: "local-machine-path-output", regex: /\b[A-Z]:\\Users\\/i },
    { reason: "timestamp-output", regex: /\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ },
    { reason: "raw-source-output", regex: /\bcontract\s+FunkyRave\b|function\s+transferFrom\s*\(/i },
    { reason: "raw-owner-json-output", regex: /raw owner json|raw owner values|raw issue body/i },
  ];

  for (const item of forbidden) {
    if (item.regex.test(text)) {
      fail(item.reason);
    }
  }

  for (const line of text.split(/\r?\n/)) {
    const lower = line.toLowerCase();
    if (/readiness approval/.test(lower) && !/\b(no|not|non)\b/.test(lower)) {
      fail("readiness-approval-output");
    }
    if (/deployment approval/.test(lower) && !/\b(no|not|non)\b/.test(lower)) {
      fail("deployment-approval-output");
    }
  }
}

function assertExactKeys(actual, expected, fieldPath) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail("json-keys-mismatch", fieldPath);
  }
}

function assertDeepEqual(actual, expected, fieldPath) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail("json-array-mismatch", fieldPath);
    }
    return;
  }

  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      fail("json-object-mismatch", fieldPath);
    }
    assertExactKeys(actual, expected, fieldPath);
    for (const key of Object.keys(expected)) {
      assertDeepEqual(actual[key], expected[key], `${fieldPath}.${key}`);
    }
    return;
  }

  if (actual !== expected) {
    fail("json-value-mismatch", fieldPath);
  }
}

function assertGateJson(gate) {
  if (gate.status !== "BLOCKED_OWNER_POLICY_DECISIONS_PENDING") {
    fail("status-mismatch", "status");
  }
  if (gate.testnetPreflightGateStatus !== "BLOCKED_OWNER_DECISIONS_PENDING") {
    fail("testnet-gate-status-mismatch", "testnetPreflightGateStatus");
  }
  if (gate.ownerPolicyDecisionStatus !== "OWNER_POLICY_DECISIONS_PENDING") {
    fail("owner-policy-status-mismatch", "ownerPolicyDecisionStatus");
  }

  for (const field of requiredPolicyFields) {
    const decision = gate.policyDecisionFields && gate.policyDecisionFields[field];
    if (!decision) {
      fail("policy-field-missing", `policyDecisionFields.${field}`);
    }
    if (decision.status !== "pending_owner_decision") {
      fail("policy-field-not-pending", `policyDecisionFields.${field}.status`);
    }
  }

  for (const field of safeToFields) {
    if (gate[field] !== false) {
      fail("safe-to-flag-not-false", field);
    }
  }

  for (const field of nonApprovalFields) {
    if (!gate.nonApproval || gate.nonApproval[field] !== true) {
      fail("non-approval-not-true", `nonApproval.${field}`);
    }
  }
}

const text = runGate();
assertSafeOutput(text);
for (const expected of [
  "VGC-FUNKY-TOKEN owner policy preflight gate",
  "status: BLOCKED_OWNER_POLICY_DECISIONS_PENDING",
  "testnet preflight gate: BLOCKED_OWNER_DECISIONS_PENDING",
  "owner policy decisions: pending",
  "fee max policy: pending owner decision",
  "fee denominator policy: pending owner decision",
  "sell/LP-add fee behavior policy: pending owner decision",
  "tier updater last-removal policy: pending owner decision",
  "trusted factory registration policy: pending owner decision",
  "fee exemption proposer/approver policy: pending owner decision",
  "tier updater code-presence validation policy: pending owner decision",
  "safeToDeploy: false",
  "safeToPerformFundedTransaction: false",
  "safeToPerformGovernanceTransaction: false",
  "safeToVerifyBscScan: false",
  "safeToClaimReadiness: false",
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
]) {
  if (!text.includes(expected)) {
    fail("text-output-missing-expected-boundary");
  }
}

const jsonText = runGate(["--json"]);
assertSafeOutput(jsonText);

let gate;
let expectedGate;
try {
  gate = JSON.parse(jsonText);
  expectedGate = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8"));
} catch {
  fail("json-parse-failed");
}

assertGateJson(gate);
assertDeepEqual(gate, expectedGate, "root");

console.log("owner policy preflight gate self-tests passed");
