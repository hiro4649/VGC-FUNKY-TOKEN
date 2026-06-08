#!/usr/bin/env node

const { spawnSync } = require("child_process");

function fail(reason) {
  console.log("VGC-TOKEN source invariant audit self-test failed");
  console.log(`safe reason code: ${reason}`);
  process.exit(1);
}

function runAudit(args = []) {
  const result = spawnSync(process.execPath, ["scripts/audit-vgc-token-source-invariants.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    fail("audit-command-failed");
  }
  return result.stdout;
}

function assertIncludes(text, needle, reason) {
  if (!text.includes(needle)) {
    fail(reason);
  }
}

function assertSafe(text) {
  const protocolPattern = "(?:ht" + "tps?|wss?)://";
  const forbidden = [
    { reason: "private-key-output", regex: /private[_ -]?key\s*[:=]/i },
    { reason: "mnemonic-output", regex: /mnemonic\s*[:=]/i },
    { reason: "rpc-url-output", regex: new RegExp(`\\b${protocolPattern}[^\\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)`, "i") },
    { reason: "api-key-value-output", regex: /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i },
    { reason: "env-content-output", regex: /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m },
    { reason: "full-evm-address-output", regex: /0x[a-fA-F0-9]{40}/ },
  ];
  for (const item of forbidden) {
    if (item.regex.test(text)) {
      fail(item.reason);
    }
  }
  const claimPattern = /(?:readiness approval|deployment approval)(?![^"\n]*(?:no|not|non))/i;
  if (claimPattern.test(text)) {
    fail("affirmative-readiness-or-deployment-approval-output");
  }
}

const text = runAudit();
assertSafe(text);

for (const [needle, reason] of [
  ["VGC-FUNKY-TOKEN source invariant audit", "missing-title"],
  ["token identity invariant: pass", "missing-token-identity-pass"],
  ["initial supply invariant: pass", "missing-initial-supply-pass"],
  ["fee denominator invariant: manual_review_required", "missing-fee-denominator-manual"],
  ["sell-only fee invariant: manual_review_required", "missing-sell-only-manual"],
  ["tier updater last-removal invariant: manual_review_required", "missing-tier-updater-last-removal-manual"],
  ["factory registration invariant: manual_review_required", "missing-factory-registration-manual"],
  ["fee exempt governance invariant: manual_review_required", "missing-fee-exempt-manual"],
  ["deploy runtime boundary: blocked_by_owner_approval", "missing-deploy-blocked"],
  ["configure runtime boundary: blocked_by_owner_approval", "missing-configure-blocked"],
  ["configure tier updater validate-only gap: manual_review_required", "missing-configure-gap-manual"],
  ["workflow no-deploy boundary: pass", "missing-workflow-pass"],
  ["overall: pass_with_manual_review_items", "missing-overall"],
  ["no deploy performed", "missing-no-deploy"],
  ["no funded transaction performed", "missing-no-funded"],
  ["no governance transaction performed", "missing-no-governance"],
  ["no BscScan verification performed", "missing-no-bscscan"],
  ["no release created", "missing-no-release"],
  ["no public visibility change performed", "missing-no-visibility-change"],
  ["no runtime readiness claimed", "missing-no-runtime"],
  ["no staging readiness claimed", "missing-no-staging"],
  ["no testnet readiness claimed", "missing-no-testnet"],
  ["no mainnet readiness claimed", "missing-no-mainnet"],
]) {
  assertIncludes(text, needle, reason);
}

const jsonText = runAudit(["--json"]);
assertSafe(jsonText);

let report;
try {
  report = JSON.parse(jsonText);
} catch {
  fail("json-not-parseable");
}

if (report.overall !== "pass_with_manual_review_items") {
  fail("json-overall-mismatch");
}
if (!Array.isArray(report.hardFailures) || report.hardFailures.length !== 0) {
  fail("json-hard-failures-not-empty");
}
if (!Array.isArray(report.manualReviewItems) || report.manualReviewItems.length === 0) {
  fail("json-manual-review-missing");
}
if (!Array.isArray(report.blockedActions) || report.blockedActions.length === 0) {
  fail("json-blocked-actions-missing");
}
const blockedText = JSON.stringify(report.blockedActions);
for (const required of ["deploy", "governance", "BscScan", "funded", "readiness"]) {
  if (!blockedText.toLowerCase().includes(required.toLowerCase())) {
    fail("json-blocked-boundary-missing");
  }
}
if (!report.nonActions || Object.values(report.nonActions).some((value) => value !== false)) {
  fail("json-non-actions-not-false");
}

console.log("VGC-TOKEN source invariant audit self-tests passed");
