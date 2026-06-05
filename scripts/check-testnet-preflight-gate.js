#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
let jsonMode = false;
let artifactPath = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--json") {
    jsonMode = true;
  } else if (arg === "--artifact" && i + 1 < args.length) {
    artifactPath = args[i + 1];
    i += 1;
  } else {
    printFailure("FAIL", "unsupported argument");
    process.exit(1);
  }
}

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

function printFailure(status, reason) {
  if (jsonMode) {
    console.log(JSON.stringify(safeResult(status, reason, [])));
  } else {
    console.log("VGC-FUNKY-TOKEN testnet preflight gate");
    console.log(`status: ${status}`);
    console.log(`reason: ${reason}`);
    console.log("no value echoed");
  }
}

function safeResult(status, reason, remainingDecisions) {
  return {
    status,
    safeToDeploy: false,
    safeToVerifyBscScan: false,
    safeToPerformFundedTransaction: false,
    safeToPerformGovernanceTransaction: false,
    safeToClaimReadiness: false,
    remainingOwnerDecisions: remainingDecisions,
    reason,
  };
}

function printBlocked(status, reason, decisions) {
  const result = safeResult(status, reason, decisions);

  if (jsonMode) {
    console.log(JSON.stringify(result));
    return;
  }

  console.log("VGC-FUNKY-TOKEN testnet preflight gate");
  console.log(`status: ${status}`);
  console.log(`reason: ${reason}`);
  console.log("remaining owner decisions:");
  for (const decision of decisions) {
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

function readArtifactText() {
  if (artifactPath) {
    try {
      return fs.readFileSync(artifactPath, "utf8");
    } catch {
      fail("FAIL", "safe artifact file could not be read");
    }
  }

  const exporter = spawnSync(process.execPath, ["scripts/export-testnet-preflight-safe-artifact.js"], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (exporter.status !== 0) {
    fail("FAIL", "safe artifact exporter failed");
  }

  return exporter.stdout;
}

let artifact;
try {
  artifact = JSON.parse(readArtifactText());
} catch {
  fail("validation-fail", "artifact JSON format not recognized");
}

if (artifact.schemaVersion !== "1.0.0") {
  fail("FAIL_ARTIFACT_SCHEMA_MISMATCH", "artifact schema mismatch");
}

if (artifact.artifactType !== "vgc-funky-token-testnet-preflight-safe-artifact") {
  fail("FAIL_ARTIFACT_SCHEMA_MISMATCH", "artifact type mismatch");
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

for (const value of Object.values(artifact.checks || {})) {
  if (value !== "pass") {
    fail("FAIL", "safe artifact check did not pass");
  }
}

const ownerDecisionEntries = Object.entries(artifact.ownerDecisionStatus || {});
if (ownerDecisionEntries.length !== remainingOwnerDecisions.length) {
  fail("FAIL_UNEXPECTED_OWNER_DECISION_STATE", "unexpected owner decision state");
}

const pendingValues = new Set(["pending", "handled_separately_by_owner_pending"]);
let pendingCount = 0;
let completeCount = 0;

for (const [, value] of ownerDecisionEntries) {
  if (pendingValues.has(value)) {
    pendingCount += 1;
  } else if (value === "provided" || value === "approved") {
    completeCount += 1;
  } else {
    fail("FAIL_UNEXPECTED_OWNER_DECISION_STATE", "unexpected owner decision state");
  }
}

if (pendingCount === ownerDecisionEntries.length) {
  printBlocked(
    "BLOCKED_OWNER_DECISIONS_PENDING",
    "owner decisions are still required before any testnet action",
    remainingOwnerDecisions,
  );
} else if (pendingCount > 0 && completeCount > 0) {
  printBlocked(
    "BLOCKED_OWNER_DECISIONS_INCOMPLETE",
    "some owner decisions are still required before any testnet action",
    remainingOwnerDecisions,
  );
} else {
  printBlocked(
    "BLOCKED_EXPLICIT_DEPLOY_INSTRUCTION_REQUIRED",
    "explicit deploy instruction is still required before any testnet action",
    [],
  );
}
