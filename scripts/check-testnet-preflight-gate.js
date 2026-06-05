#!/usr/bin/env node

const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

const remainingOwnerDecisions = [
  "BNB Smart Chain testnet approval",
  "initialAdmin",
  "initialFeeRecipient",
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

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  printFailure("FAIL", "unsupported argument");
  process.exit(1);
}

function printFailure(status, reason) {
  if (jsonMode) {
    console.log(JSON.stringify({ status, reason }));
  } else {
    console.log("VGC-FUNKY-TOKEN testnet preflight gate");
    console.log(`status: ${status}`);
    console.log(`reason: ${reason}`);
    console.log("no value echoed");
  }
}

function printBlocked() {
  const result = {
    status: "BLOCKED_OWNER_DECISIONS_PENDING",
    safeToDeploy: false,
    safeToVerifyBscScan: false,
    safeToPerformFundedTransaction: false,
    safeToPerformGovernanceTransaction: false,
    safeToClaimReadiness: false,
    remainingOwnerDecisions,
  };

  if (jsonMode) {
    console.log(JSON.stringify(result));
    return;
  }

  console.log("VGC-FUNKY-TOKEN testnet preflight gate");
  console.log("status: BLOCKED_OWNER_DECISIONS_PENDING");
  console.log("reason: owner decisions are still required before any testnet action");
  console.log("remaining owner decisions:");
  for (const decision of remainingOwnerDecisions) {
    console.log(`- ${decision}`);
  }
  for (const line of nonApprovalLines) {
    console.log(line);
  }
}

function fail(status, reason) {
  printFailure(status, reason);
  process.exit(1);
}

const exporter = spawnSync(process.execPath, ["scripts/export-testnet-preflight-safe-artifact.js"], {
  encoding: "utf8",
  stdio: "pipe",
});

if (exporter.status !== 0) {
  fail("FAIL", "safe artifact exporter failed");
}

let artifact;
try {
  artifact = JSON.parse(exporter.stdout);
} catch {
  fail("FAIL", "safe artifact parse failed");
}

if (artifact.tokenIdentity?.name !== "FUNKY RAVE" || artifact.tokenIdentity?.symbol !== "FUNKY") {
  fail("FAIL_TOKEN_IDENTITY_MISMATCH", "token identity mismatch");
}

if (artifact.sourceContract !== "contracts/funky/funky.sol") {
  fail("FAIL_SOURCE_CONTRACT_MISMATCH", "source contract mismatch");
}

for (const value of Object.values(artifact.nonApproval || {})) {
  if (value !== true) {
    fail("FAIL_UNSAFE_APPROVAL_CLAIM", "unsafe approval claim detected");
  }
}

for (const value of Object.values(artifact.safety || {})) {
  if (value !== false) {
    fail("FAIL_UNSAFE_ACTION", "unsafe action detected");
  }
}

for (const value of Object.values(artifact.ownerDecisionStatus || {})) {
  const allowed = value === "pending" || value === "handled_separately_by_owner_pending";
  if (!allowed) {
    fail("FAIL_UNEXPECTED_OWNER_DECISION_STATE", "unexpected owner decision state");
  }
}

for (const value of Object.values(artifact.checks || {})) {
  if (value !== "pass") {
    fail("FAIL", "safe artifact check did not pass");
  }
}

printBlocked();
