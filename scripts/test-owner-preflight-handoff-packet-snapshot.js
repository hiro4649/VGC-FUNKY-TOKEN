#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedJsonKeys = [
  "status",
  "tokenIdentity",
  "repositoryScope",
  "sourceContract",
  "remainingOwnerDecisions",
  "ownerInputBoundary",
  "allowedInputFormats",
  "nextSafeActions",
  "nonApproval",
  "safeToDeploy",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToVerifyBscScan",
  "safeToClaimReadiness",
];

function fail(reason) {
  console.log("owner preflight handoff packet snapshot guard failed");
  console.log(`safe reason code: ${reason}`);
  process.exit(1);
}

function normalize(text) {
  return text.replace(/\r\n/g, "\n").trimEnd();
}

function runPacket(args = []) {
  const result = spawnSync(process.execPath, ["scripts/build-owner-preflight-handoff-packet.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail("handoff-packet-command-failed");
  }

  return result.stdout;
}

function assertExactKeys(value, keys, path) {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail(`unexpected-json-field:${path}`);
  }
}

function assertDeepEqual(actual, expected, path) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      fail(`snapshot-array-mismatch:${path}`);
    }
    for (let i = 0; i < expected.length; i += 1) {
      assertDeepEqual(actual[i], expected[i], `${path}[${i}]`);
    }
    return;
  }

  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      fail(`snapshot-object-mismatch:${path}`);
    }
    assertExactKeys(actual, Object.keys(expected), path);
    for (const key of Object.keys(expected)) {
      assertDeepEqual(actual[key], expected[key], `${path}.${key}`);
    }
    return;
  }

  if (actual !== expected) {
    fail(`snapshot-value-mismatch:${path}`);
  }
}

function assertSafeOutput(text) {
  const forbiddenPatterns = [
    { reason: "private-key-output", regex: /private[_ -]?key\s*[:=]/i },
    { reason: "mnemonic-output", regex: /mnemonic\s*[:=]/i },
    { reason: "rpc-url-output", regex: /\b(?:https?|wss?):\/\/[^\s"'`<>]+/i },
    { reason: "api-key-value-output", regex: /\b(?:api[_-]?key|apikey|token|secret)\s*[:=]\s*[^\s"'`<>]+/i },
    { reason: "env-assignment-output", regex: /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m },
    { reason: "db-url-output", regex: /\b(?:postgres|mysql|mongodb|redis):\/\//i },
    { reason: "jwt-output", regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
    { reason: "cookie-output", regex: /\bcookie\s*[:=]/i },
    { reason: "full-evm-address-output", regex: /0x[a-fA-F0-9]{40}/ },
    { reason: "raw-owner-json-output", regex: /raw owner JSON/i },
    { reason: "raw-issue-body-output", regex: /raw issue body/i },
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.regex.test(text)) {
      fail(pattern.reason);
    }
  }

  const approvalClaims = [
    "deployment approval",
    "funded transaction approval",
    "governance transaction approval",
    "BscScan verification approval",
    "runtime readiness approval",
    "staging readiness approval",
    "testnet readiness approval",
    "mainnet readiness approval",
  ];

  for (const claim of approvalClaims) {
    const claimPattern = new RegExp(`(?:^|\\n)(?![^\\n]*(?:no|non|not)\\s+)${claim}`, "i");
    if (claimPattern.test(text)) {
      fail("approval-claim-output");
    }
  }
}

const expectedText = normalize(fs.readFileSync("test/owner-preflight-handoff-packet.expected.txt", "utf8"));
const actualText = normalize(runPacket());

if (actualText !== expectedText) {
  fail("text-snapshot-mismatch");
}

assertSafeOutput(actualText);

const expectedJson = JSON.parse(fs.readFileSync("test/owner-preflight-handoff-packet.expected.json", "utf8"));
const jsonText = runPacket(["--json"]);
assertSafeOutput(jsonText);

let actualJson;
try {
  actualJson = JSON.parse(jsonText);
} catch {
  fail("json-output-not-parseable");
}

assertExactKeys(actualJson, expectedJsonKeys, "$");
assertDeepEqual(actualJson, expectedJson, "$");

if (!actualJson.remainingOwnerDecisions.length) {
  fail("remaining-owner-decisions-empty");
}

if (!actualJson.ownerInputBoundary || !actualJson.allowedInputFormats || !actualJson.nextSafeActions) {
  fail("missing-owner-boundary-or-actions");
}

for (const value of Object.values(actualJson.nonApproval)) {
  if (value !== true) {
    fail("non-approval-not-true");
  }
}

for (const key of [
  "safeToDeploy",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToVerifyBscScan",
  "safeToClaimReadiness",
]) {
  if (actualJson[key] !== false) {
    fail("safe-flag-not-false");
  }
}

console.log("owner preflight handoff packet snapshot guard passed");
