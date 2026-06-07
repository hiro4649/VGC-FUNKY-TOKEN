#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedTextPath = "test/vgc-token-repo-safety-audit.expected.txt";
const expectedJsonPath = "test/vgc-token-repo-safety-audit.expected.json";

function fail(reason, fieldPath) {
  console.log("VGC-TOKEN repository safety audit snapshot test failed");
  console.log(`safe reason code: ${reason}`);
  if (fieldPath) {
    console.log(`field path: ${fieldPath}`);
  }
  process.exit(1);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function runAudit(args = []) {
  const result = spawnSync(process.execPath, ["scripts/audit-vgc-token-repo-safety.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    fail("audit-command-failed");
  }
  return result.stdout;
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
    { reason: "timestamp-output", regex: /\b20\d{2}-\d{2}-\d{2}[T ]\d{2}:\d{2}/ },
  ];

  for (const item of forbidden) {
    if (item.regex.test(text)) {
      fail(item.reason);
    }
  }

  for (const line of text.split(/\r?\n/)) {
    const lower = line.toLowerCase();
    if (/raw owner json|raw issue body/.test(lower) && !/no raw|not include|does not|do not|without/.test(lower)) {
      fail("raw-owner-input-output");
    }
    if (/readiness approval/.test(lower) && !/\b(no|not|non)\b/.test(lower)) {
      fail("readiness-approval-output");
    }
    if (/deployment approval/.test(lower) && !/\b(no|not|non)\b/.test(lower)) {
      fail("deployment-approval-output");
    }
  }
}

const text = runAudit();
const expectedText = read(expectedTextPath);
assertSafeOutput(text);
if (text !== expectedText) {
  fail("text-snapshot-mismatch");
}

const jsonText = runAudit(["--json"]);
assertSafeOutput(jsonText);

let actualJson;
let expectedJson;
try {
  actualJson = JSON.parse(jsonText);
  expectedJson = JSON.parse(read(expectedJsonPath));
} catch {
  fail("json-parse-failed");
}

assertDeepEqual(actualJson, expectedJson, "root");

if (actualJson.overall !== "pass") {
  fail("overall-not-pass", "overall");
}
for (const [key, value] of Object.entries(actualJson.categories)) {
  if (value !== "pass") {
    fail("category-not-pass", `categories.${key}`);
  }
}
for (const [key, value] of Object.entries(actualJson.nonActions)) {
  if (value !== false) {
    fail("non-action-not-false", `nonActions.${key}`);
  }
}
if (!Array.isArray(actualJson.remainingOwnerDecisions) || actualJson.remainingOwnerDecisions.length === 0) {
  fail("remaining-owner-decisions-empty", "remainingOwnerDecisions");
}

console.log("VGC-TOKEN repository safety audit snapshot test passed");
