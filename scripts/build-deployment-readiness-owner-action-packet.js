#!/usr/bin/env node

const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  printFailure("unsupported argument");
  process.exit(1);
}

const requiredOwnerActions = {
  approveBscTestnetUse: "approve BNB Smart Chain testnet use",
  provideInitialAdmin: "provide initialAdmin",
  provideInitialFeeRecipient: "provide initialFeeRecipient",
  approveDeployCommand: "approve deploy command",
  handleDeployerFundingSeparately: "deployer funding",
  provideBscScanVerificationPlan: "BscScan verification plan",
  resolveMultisigPolicy: "multisig policy",
  resolveAdminRotationPolicy: "admin rotation policy",
  resolveFeeRecipientPolicy: "feeRecipient policy",
  resolveTierUpdaterPolicy: "TierUpdater policy",
  resolveTrustedFactoryPolicy: "trusted factory policy",
  resolvePairPolicy: "pair policy",
  resolveFeeExemptionPolicy: "fee exemption policy",
  resolveFeeMaxPolicy: "fee max policy",
  resolveFeeDenominatorPolicy: "fee denominator policy",
  resolveSellLpAddFeeBehaviorPolicy: "sell/LP-add fee behavior policy",
  resolveTierUpdaterLastRemovalPolicy: "tier updater last-removal policy",
  resolveFeeExemptionProposerApproverPolicy: "fee exemption proposer/approver policy",
  resolveTierUpdaterCodePresenceValidationPolicy: "tier updater code-presence validation policy",
  resolveSourceOfTruthRepositoryDecision: "source-of-truth repository decision",
  resolveRepositoryVisibilityDecision: "repository visibility decision",
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

  console.log("VGC-FUNKY-TOKEN deployment readiness owner action packet");
  console.log("status: validation-fail");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
}

function fail(reason) {
  printFailure(reason);
  process.exit(1);
}

function runJson(label, commandArgs) {
  const result = spawnSync(process.execPath, commandArgs, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail(`${label} failed`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail(`${label} output was not recognized`);
  }
}

const blockerRegistry = runJson("deployment readiness blocker registry", [
  "scripts/build-deployment-readiness-blocker-registry.js",
  "--json",
]);
const sourceOfTruth = runJson("source-of-truth repository decision", [
  "scripts/build-source-of-truth-repository-decision.js",
  "--json",
]);
const ownerPolicyMatrix = runJson("owner policy decision matrix", [
  "scripts/build-owner-policy-decision-matrix.js",
  "--json",
]);
const ownerPolicyGate = runJson("owner policy preflight gate", [
  "scripts/check-owner-policy-preflight-gate.js",
  "--json",
]);
const testnetGate = runJson("testnet preflight gate", [
  "scripts/check-testnet-preflight-gate.js",
  "--json",
]);

if (blockerRegistry.status !== "DEPLOYMENT_READINESS_BLOCKED") {
  fail("deployment readiness blocker registry is not blocked");
}

if (sourceOfTruth.status !== "SOURCE_OF_TRUTH_DECISION_PENDING") {
  fail("source-of-truth decision is not pending");
}

if (ownerPolicyGate.status !== "BLOCKED_OWNER_POLICY_DECISIONS_PENDING") {
  fail("owner policy gate is not blocked");
}

if (testnetGate.status !== "BLOCKED_OWNER_DECISIONS_PENDING") {
  fail("testnet preflight gate is not blocked");
}

if (ownerPolicyMatrix.status !== "OWNER_POLICY_DECISIONS_PENDING") {
  fail("owner policy matrix is not pending");
}

for (const [field, value] of Object.entries(safeTo)) {
  for (const artifact of [blockerRegistry, sourceOfTruth, ownerPolicyMatrix, ownerPolicyGate, testnetGate]) {
    if (Object.prototype.hasOwnProperty.call(artifact, field) && artifact[field] !== value) {
      fail("safeTo flag mismatch");
    }
  }
}

for (const [field, value] of Object.entries(nonApproval)) {
  if (blockerRegistry.nonApproval?.[field] !== value) {
    fail("nonApproval boundary mismatch");
  }
}

function makeOwnerAction(label) {
  return {
    status: "pending_owner_action",
    inputType: "owner_decision_or_public_value",
    unsafeInputAccepted: false,
    secretInputAccepted: false,
    safeSummary: `${label}: pending owner action`,
  };
}

const ownerActions = Object.fromEntries(
  Object.entries(requiredOwnerActions).map(([key, label]) => [key, makeOwnerAction(label)]),
);

ownerActions.handleDeployerFundingSeparately.safeSummary = "deployer funding: owner handled separately";

const packet = {
  status: "OWNER_ACTIONS_REQUIRED",
  ownerActions,
  ...safeTo,
  nonApproval,
};

if (jsonMode) {
  console.log(JSON.stringify(packet, null, 2));
  process.exit(0);
}

console.log("VGC-FUNKY-TOKEN deployment readiness owner action packet");
console.log(`status: ${packet.status}`);
console.log("approve BNB Smart Chain testnet use: pending owner action");
console.log("provide initialAdmin: pending owner action");
console.log("provide initialFeeRecipient: pending owner action");
console.log("approve deploy command: pending owner action");
console.log("deployer funding: owner handled separately");
console.log("BscScan verification plan: pending owner action");
console.log("multisig policy: pending owner action");
console.log("admin rotation policy: pending owner action");
console.log("feeRecipient policy: pending owner action");
console.log("TierUpdater policy: pending owner action");
console.log("trusted factory policy: pending owner action");
console.log("pair policy: pending owner action");
console.log("fee exemption policy: pending owner action");
console.log("fee max policy: pending owner action");
console.log("fee denominator policy: pending owner action");
console.log("sell/LP-add fee behavior policy: pending owner action");
console.log("tier updater last-removal policy: pending owner action");
console.log("fee exemption proposer/approver policy: pending owner action");
console.log("tier updater code-presence validation policy: pending owner action");
console.log("source-of-truth repository decision: pending owner action");
console.log("repository visibility decision: pending owner action");
console.log(`safeToDeploy: ${packet.safeToDeploy}`);
console.log(`safeToPerformFundedTransaction: ${packet.safeToPerformFundedTransaction}`);
console.log(`safeToPerformGovernanceTransaction: ${packet.safeToPerformGovernanceTransaction}`);
console.log(`safeToVerifyBscScan: ${packet.safeToVerifyBscScan}`);
console.log(`safeToClaimReadiness: ${packet.safeToClaimReadiness}`);
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
