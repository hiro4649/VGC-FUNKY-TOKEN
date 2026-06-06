#!/usr/bin/env node

const { spawnSync } = require("child_process");

const categoryLines = [
  "repository scope: pass",
  "token identity: pass",
  "contract source boundary: pass",
  "deploy script boundary: pass",
  "configure script boundary: pass",
  "workflow boundary: pass",
  "preflight tooling boundary: pass",
  "owner input boundary: pass",
  "secret safety boundary: pass",
  "readiness claim boundary: pass",
  "forbidden content boundary: pass",
  "package/lockfile boundary: pass",
  "visibility documentation boundary: pass",
  "remaining owner decision boundary: pass",
];

function fail(reason) {
  console.log("VGC-TOKEN repository safety audit self-test failed");
  console.log(`safe reason code: ${reason}`);
  process.exit(1);
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

function assertSafe(text) {
  const forbidden = [
    { reason: "private-key-output", regex: /private[_ -]?key\s*[:=]/i },
    { reason: "mnemonic-output", regex: /mnemonic\s*[:=]/i },
    { reason: "rpc-url-output", regex: /\b(?:https?|wss?):\/\/[^\s"'`<>]+/i },
    { reason: "api-key-value-output", regex: /\b(?:api[_-]?key|apikey|token|secret)\s*[:=]\s*[^\s"'`<>]+/i },
    { reason: "env-content-output", regex: /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m },
    { reason: "full-evm-address-output", regex: /0x[a-fA-F0-9]{40}/ },
  ];

  for (const item of forbidden) {
    if (item.regex.test(text)) {
      fail(item.reason);
    }
  }

  const claimPattern = /(?:^|\n)(?![^\n]*(?:no|not|non)\s+)(?:deployment approval|readiness approval|runtime readiness|staging readiness|testnet readiness|mainnet readiness)/i;
  if (claimPattern.test(text)) {
    fail("affirmative-readiness-or-approval-output");
  }
}

const text = runAudit();
assertSafe(text);

if (!text.includes("VGC-FUNKY-TOKEN repository safety audit")) {
  fail("missing-title");
}
for (const line of categoryLines) {
  if (!text.includes(line)) {
    fail("missing-category-pass");
  }
}
for (const line of [
  "overall: pass",
  "no deploy performed",
  "no funded transaction performed",
  "no governance transaction performed",
  "no BscScan verification performed",
  "no runtime readiness claimed",
  "no staging readiness claimed",
  "no testnet readiness claimed",
  "no mainnet readiness claimed",
]) {
  if (!text.includes(line)) {
    fail("missing-non-action");
  }
}

const jsonText = runAudit(["--json"]);
assertSafe(jsonText);

let report;
try {
  report = JSON.parse(jsonText);
} catch {
  fail("json-output-not-parseable");
}

if (report.overall !== "pass") {
  fail("json-overall-not-pass");
}
if (!report.categories || Object.values(report.categories).some((value) => value !== "pass")) {
  fail("json-category-not-pass");
}
if (!report.nonActions || Object.values(report.nonActions).some((value) => value !== false)) {
  fail("json-non-action-not-false");
}
if (!Array.isArray(report.remainingOwnerDecisions) || report.remainingOwnerDecisions.length === 0) {
  fail("json-owner-decisions-missing");
}

console.log("VGC-TOKEN repository safety audit self-tests passed");
