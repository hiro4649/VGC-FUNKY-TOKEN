#!/usr/bin/env node

const fs = require("fs");

const templatePath = ".github/ISSUE_TEMPLATE/deployment-readiness-owner-actions.yml";

const requiredFields = [
  "BNB Smart Chain testnet approval",
  "initialAdmin public address",
  "initialFeeRecipient public address",
  "deploy command approval text",
  "BscScan verification plan text",
  "multisig policy",
  "admin rotation policy",
  "feeRecipient policy",
  "TierUpdater policy",
  "trusted factory policy",
  "pair policy",
  "fee exemption policy",
  "fee max policy",
  "fee denominator policy",
  "sell/LP-add fee behavior policy",
  "tier updater last-removal policy",
  "fee exemption proposer/approver policy",
  "tier updater code-presence validation policy",
  "source-of-truth repository decision",
  "repository visibility decision",
];

const requiredWarnings = [
  "Do not include private keys.",
  "Do not include mnemonics.",
  "Do not include RPC URLs.",
  "Do not include API keys.",
  "Do not include .env contents.",
  "Do not include DB URLs.",
  "Do not include JWTs.",
  "Do not include cookies.",
  "Do not include wallet funding proof.",
  "Deployer funding is handled separately by owner and must not be posted here.",
];

const nonApprovalBoundaries = [
  "This issue does not approve deployment.",
  "This issue does not approve funded transactions.",
  "This issue does not approve governance transactions.",
  "This issue does not approve BscScan verification.",
  "This issue does not approve releases.",
  "This issue does not approve public visibility changes.",
  "This issue does not approve runtime readiness.",
  "This issue does not approve staging readiness.",
  "This issue does not approve testnet readiness.",
  "This issue does not approve mainnet readiness.",
  "A later separate explicit deploy instruction is still required.",
];

function fail(reason) {
  console.log("deployment readiness owner action issue template test failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function assertIncludes(text, values, reason) {
  for (const value of values) {
    if (!text.includes(value)) {
      fail(reason);
    }
  }
}

let text;
try {
  text = fs.readFileSync(templatePath, "utf8");
} catch {
  fail("template-read-failed");
}

assertIncludes(text, requiredFields, "required-public-field-missing");
assertIncludes(text, requiredWarnings, "secret-warning-missing");
assertIncludes(text, nonApprovalBoundaries, "non-approval-boundary-missing");

const forbidden = [
  ["real-evm-address", /0x[a-fA-F0-9]{40}/],
  ["private-key-like-64-hex", /0x[a-fA-F0-9]{64}/],
  ["mnemonic-phrase-like", /\b(?:abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident)(?:\s+\w+){11,23}\b/i],
  ["rpc-url", /\b(?:https?|wss?):\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)/i],
  ["api-key-value", /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i],
  ["env-content", /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m],
  ["db-url", /\b(?:postgres|mysql|mongodb|redis):\/\//i],
  ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["cookie-value", /\bcookie\s*[:=]\s*[^\s"'<>]+/i],
];

for (const [reason, pattern] of forbidden) {
  if (pattern.test(text)) {
    fail(reason);
  }
}

const approvalClaims = [
  "deployment approval",
  "funded transaction approval",
  "governance transaction approval",
  "BscScan verification approval",
  "release approval",
  "public visibility approval",
  "runtime readiness approval",
  "staging readiness approval",
  "testnet readiness approval",
  "mainnet readiness approval",
];

for (const phrase of approvalClaims) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const negative = new RegExp(`\\b(no|not|non|does not)\\b[^\\n]*${escaped}`, "i");
  const claim = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");
  if (claim.test(text) && !negative.test(text)) {
    fail("approval-wording-not-negative");
  }
}

console.log("deployment readiness owner action issue template test passed");
