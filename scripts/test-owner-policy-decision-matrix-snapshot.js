#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedTextPath = "test/owner-policy-decision-matrix.expected.txt";
const expectedJsonPath = "test/owner-policy-decision-matrix.expected.json";

const requiredDecisionFields = [
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

function normalizeTextSnapshot(text) {
  return text.replace(/\r\n?/g, "\n");
}

function fail(reason, fieldPath) {
  console.log("owner policy decision matrix snapshot guard failed");
  console.log(`safe reason code: ${reason}`);
  if (fieldPath) {
    console.log(`field path: ${fieldPath}`);
  }
  process.exit(1);
}

function runMatrix(args = []) {
  const result = spawnSync(process.execPath, ["scripts/build-owner-policy-decision-matrix.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail("matrix-command-failed");
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

function assertMatrixJson(matrix) {
  if (matrix.status !== "OWNER_POLICY_DECISIONS_PENDING") {
    fail("status-not-pending", "status");
  }

  for (const field of requiredDecisionFields) {
    const decision = matrix.decisionFields && matrix.decisionFields[field];
    if (!decision) {
      fail("decision-field-missing", `decisionFields.${field}`);
    }
    if (decision.status !== "pending_owner_decision") {
      fail("decision-field-not-pending", `decisionFields.${field}.status`);
    }
    if (decision.ownerDecisionRequired !== true) {
      fail("decision-field-not-required", `decisionFields.${field}.ownerDecisionRequired`);
    }
  }

  for (const field of safeToFields) {
    if (matrix[field] !== false) {
      fail("safe-to-flag-not-false", field);
    }
  }

  for (const field of nonApprovalFields) {
    if (!matrix.nonApproval || matrix.nonApproval[field] !== true) {
      fail("non-approval-not-true", `nonApproval.${field}`);
    }
  }
}

let expectedText;
let expectedMatrix;
try {
  expectedText = fs.readFileSync(expectedTextPath, "utf8");
  expectedMatrix = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8"));
} catch {
  fail("snapshot-fixture-read-failed");
}

const text = runMatrix();
assertSafeOutput(text);
if (normalizeTextSnapshot(text) !== normalizeTextSnapshot(expectedText)) {
  fail("text-snapshot-mismatch");
}

const jsonText = runMatrix(["--json"]);
assertSafeOutput(jsonText);

let matrix;
try {
  matrix = JSON.parse(jsonText);
} catch {
  fail("json-parse-failed");
}

assertMatrixJson(matrix);
assertDeepEqual(matrix, expectedMatrix, "root");

console.log("owner policy decision matrix snapshot guard passed");
