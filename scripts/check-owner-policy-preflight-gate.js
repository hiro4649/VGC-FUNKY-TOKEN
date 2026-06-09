#!/usr/bin/env node

const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  printFailure("unsupported argument");
  process.exit(1);
}

const policyDecisionLabels = {
  feeMaxPolicy: "fee max policy",
  feeDenominatorPolicy: "fee denominator policy",
  sellLpAddFeeBehaviorPolicy: "sell/LP-add fee behavior policy",
  tierUpdaterLastRemovalPolicy: "tier updater last-removal policy",
  trustedFactoryRegistrationPolicy: "trusted factory registration policy",
  feeExemptionProposerApproverPolicy: "fee exemption proposer/approver policy",
  tierUpdaterCodePresenceValidationPolicy: "tier updater code-presence validation policy",
};

const safeToFields = {
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

function printFailure(reason) {
  if (jsonMode) {
    console.log(JSON.stringify({ status: "validation-fail", reason, ...safeToFields }));
    return;
  }

  console.log("VGC-FUNKY-TOKEN owner policy preflight gate");
  console.log("status: validation-fail");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
}

function runJsonCommand(label, commandArgs) {
  const result = spawnSync(process.execPath, commandArgs, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    printFailure(`${label} failed`);
    process.exit(1);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    printFailure(`${label} output was not recognized`);
    process.exit(1);
  }
}

const testnetGate = runJsonCommand("testnet preflight gate", [
  "scripts/check-testnet-preflight-gate.js",
  "--json",
]);
const ownerPolicyMatrix = runJsonCommand("owner policy decision matrix", [
  "scripts/build-owner-policy-decision-matrix.js",
  "--json",
]);

if (testnetGate.status !== "BLOCKED_OWNER_DECISIONS_PENDING") {
  printFailure("testnet preflight gate is not in expected blocked state");
  process.exit(1);
}

if (ownerPolicyMatrix.status !== "OWNER_POLICY_DECISIONS_PENDING") {
  printFailure("owner policy decision matrix is not pending");
  process.exit(1);
}

for (const [field, decision] of Object.entries(ownerPolicyMatrix.decisionFields || {})) {
  if (!policyDecisionLabels[field] || decision.status !== "pending_owner_decision") {
    printFailure("owner policy decision field is not pending");
    process.exit(1);
  }
}

if (Object.keys(ownerPolicyMatrix.decisionFields || {}).length !== Object.keys(policyDecisionLabels).length) {
  printFailure("owner policy decision field count mismatch");
  process.exit(1);
}

const result = {
  status: "BLOCKED_OWNER_POLICY_DECISIONS_PENDING",
  testnetPreflightGateStatus: testnetGate.status,
  ownerPolicyDecisionStatus: ownerPolicyMatrix.status,
  policyDecisionFields: ownerPolicyMatrix.decisionFields,
  ...safeToFields,
  nonApproval,
};

if (jsonMode) {
  console.log(JSON.stringify(result));
  process.exit(0);
}

console.log("VGC-FUNKY-TOKEN owner policy preflight gate");
console.log(`status: ${result.status}`);
console.log(`testnet preflight gate: ${result.testnetPreflightGateStatus}`);
console.log("owner policy decisions: pending");
for (const [field, label] of Object.entries(policyDecisionLabels)) {
  const decision = result.policyDecisionFields[field];
  console.log(`${label}: ${decision.status.replaceAll("_", " ")}`);
}
for (const [field, value] of Object.entries(safeToFields)) {
  console.log(`${field}: ${value}`);
}
for (const line of nonApprovalLines) {
  console.log(line);
}
