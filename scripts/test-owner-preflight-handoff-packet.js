#!/usr/bin/env node

const { spawnSync } = require("child_process");

const requiredDecisions = [
  "BNB Smart Chain testnet approval",
  "initialAdmin public EVM address",
  "initialFeeRecipient public EVM address",
  "deploy command approval",
  "deployer wallet funding handled separately by owner",
  "BscScan verification command or plan",
  "multisig owner policy",
  "admin rotation policy",
  "feeRecipient policy",
  "TierUpdater deployer policy",
  "TierUpdater owner policy",
  "trusted factory policy",
  "initial DEX pair policy",
  "fee exemption policy",
];

const nonApprovalLines = [
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
];

function fail(reason) {
  console.log("owner preflight handoff packet self-test failed");
  console.log(`safe reason code: ${reason}`);
  process.exit(1);
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

function assertIncludes(text, needle, reason) {
  if (!text.includes(needle)) {
    fail(reason);
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

const textOutput = runPacket();
assertIncludes(textOutput, "VGC-FUNKY-TOKEN owner preflight handoff packet", "missing-title");
assertIncludes(textOutput, "BLOCKED_OWNER_DECISIONS_PENDING", "missing-blocked-status");
assertIncludes(textOutput, "FUNKY RAVE / FUNKY", "missing-token-identity");
assertIncludes(textOutput, "owner input boundary", "missing-owner-input-boundary");
assertIncludes(textOutput, "allowed next owner input formats", "missing-allowed-input-formats");
assertIncludes(textOutput, "next safe action", "missing-next-safe-actions");

for (const decision of requiredDecisions) {
  assertIncludes(textOutput, decision, "missing-owner-decision");
}

for (const line of nonApprovalLines) {
  assertIncludes(textOutput, line, "missing-non-approval-boundary");
}

assertSafeOutput(textOutput);

const jsonOutput = runPacket(["--json"]);
assertSafeOutput(jsonOutput);

let packet;
try {
  packet = JSON.parse(jsonOutput);
} catch {
  fail("json-output-not-parseable");
}

if (packet.status !== "BLOCKED_OWNER_DECISIONS_PENDING") {
  fail("json-status-mismatch");
}

for (const key of [
  "safeToDeploy",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToVerifyBscScan",
  "safeToClaimReadiness",
]) {
  if (packet[key] !== false) {
    fail("json-safe-flag-not-false");
  }
}

if (!Array.isArray(packet.remainingOwnerDecisions) || packet.remainingOwnerDecisions.length === 0) {
  fail("json-missing-owner-decisions");
}

if (!packet.nonApproval || Object.values(packet.nonApproval).some((value) => value !== true)) {
  fail("json-non-approval-not-true");
}

console.log("owner preflight handoff packet self-tests passed");
