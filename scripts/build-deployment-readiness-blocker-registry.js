#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  printFailure("unsupported argument");
  process.exit(1);
}

const blockers = {
  ownerValuesPending: true,
  ownerPolicyDecisionsPending: true,
  sourceOfTruthDecisionPending: true,
  deployCommandApprovalPending: true,
  deployerFundingOwnerHandledSeparately: true,
  bscScanVerificationPlanPending: true,
  governancePolicyPending: true,
  repositoryVisibilityOwnerDecisionPending: true,
  testnetPreflightGateBlocked: true,
  ownerPolicyPreflightGateBlocked: true,
  readinessClaimBlocked: true,
};

const safeTo = {
  safeToDeploy: false,
  safeToPerformFundedTransaction: false,
  safeToPerformGovernanceTransaction: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
};

const nonApproval = {
  deployment: true,
  fundedTransaction: true,
  governanceTransaction: true,
  bscScanVerification: true,
  release: true,
  publicVisibility: true,
  runtimeReadiness: true,
  stagingReadiness: true,
  testnetReadiness: true,
  mainnetReadiness: true,
};

function printFailure(reason) {
  if (jsonMode) {
    console.log(JSON.stringify({
      status: "validation-fail",
      reason,
      ...safeTo,
    }));
    return;
  }

  console.log("VGC-FUNKY-TOKEN deployment readiness blocker registry");
  console.log("status: validation-fail");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
}

function fail(reason) {
  printFailure(reason);
  process.exit(1);
}

function runCommand(label, commandArgs, parseJson = true) {
  const result = spawnSync(process.execPath, commandArgs, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail(`${label} failed`);
  }

  if (!parseJson) {
    return result.stdout;
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail(`${label} output was not recognized`);
  }
}

const sourceOfTruthDecision = runCommand("source-of-truth repository decision", [
  "scripts/build-source-of-truth-repository-decision.js",
  "--json",
]);

runCommand("pre-testnet status", ["scripts/show-testnet-preflight-status.js"], false);

const repoSafety = runCommand("repository safety audit", [
  "scripts/audit-vgc-token-repo-safety.js",
  "--json",
]);

let ownerPolicyGate;
try {
  ownerPolicyGate = JSON.parse(fs.readFileSync("test/owner-policy-preflight-gate.expected.json", "utf8"));
} catch {
  fail("owner policy preflight gate snapshot could not be read");
}

if (ownerPolicyGate.testnetPreflightGateStatus !== "BLOCKED_OWNER_DECISIONS_PENDING") {
  fail("testnet preflight gate is not blocked");
}

if (ownerPolicyGate.status !== "BLOCKED_OWNER_POLICY_DECISIONS_PENDING") {
  fail("owner policy preflight gate is not blocked");
}

if (sourceOfTruthDecision.status !== "SOURCE_OF_TRUTH_DECISION_PENDING") {
  fail("source-of-truth decision is not pending");
}

if (repoSafety.overall !== "pass") {
  fail("repository safety audit did not pass");
}

if (
  ownerPolicyGate.safeToDeploy !== false
  || ownerPolicyGate.safeToPerformFundedTransaction !== false
  || ownerPolicyGate.safeToPerformGovernanceTransaction !== false
  || ownerPolicyGate.safeToVerifyBscScan !== false
  || ownerPolicyGate.safeToClaimReadiness !== false
) {
  fail("owner policy gate safeTo flag mismatch");
}

if (
  sourceOfTruthDecision.safeToDeploy !== false
  || sourceOfTruthDecision.safeToVerifyBscScan !== false
  || sourceOfTruthDecision.safeToClaimReadiness !== false
) {
  fail("source-of-truth safeTo flag mismatch");
}

const registry = {
  status: "DEPLOYMENT_READINESS_BLOCKED",
  blockers,
  ...safeTo,
  nonApproval,
};

if (jsonMode) {
  console.log(JSON.stringify(registry));
  process.exit(0);
}

console.log("VGC-FUNKY-TOKEN deployment readiness blocker registry");
console.log(`status: ${registry.status}`);
console.log("owner values: pending");
console.log("owner policy decisions: pending");
console.log("source-of-truth decision: pending");
console.log("deploy command approval: pending");
console.log("deployer funding: owner handled separately");
console.log("BscScan verification plan: pending");
console.log("governance policy: pending");
console.log("repository visibility owner decision: pending");
console.log("testnet preflight gate: blocked");
console.log("owner policy preflight gate: blocked");
console.log("readiness claim: blocked");
console.log(`safeToDeploy: ${registry.safeToDeploy}`);
console.log(`safeToPerformFundedTransaction: ${registry.safeToPerformFundedTransaction}`);
console.log(`safeToPerformGovernanceTransaction: ${registry.safeToPerformGovernanceTransaction}`);
console.log(`safeToVerifyBscScan: ${registry.safeToVerifyBscScan}`);
console.log(`safeToClaimReadiness: ${registry.safeToClaimReadiness}`);
console.log("no deployment approval");
console.log("no funded transaction approval");
console.log("no governance transaction approval");
console.log("no BscScan verification approval");
console.log("no release approval");
console.log("no public visibility approval");
console.log("no runtime readiness approval");
console.log("no staging readiness approval");
console.log("no testnet readiness approval");
console.log("no mainnet readiness approval");
