#!/usr/bin/env node

const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  printFailure("unsupported argument");
  process.exit(1);
}

const remainingOwnerDecisions = [
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

const ownerInputBoundary = {
  publicEvmAddressesOnlyForAddressFields: true,
  noPrivateKeys: true,
  noMnemonics: true,
  noRpcUrls: true,
  noApiKeys: true,
  noEnvContents: true,
  noDbUrls: true,
  noJwts: true,
  noCookies: true,
  noPrivateEndpoints: true,
};

const allowedInputFormats = [
  "owner-safe issue template",
  "owner-values JSON matching docs/owner-testnet-preflight-submission-template.md",
];

const nextSafeActions = [
  "validate",
  "summarize",
  "build review packet",
  "export safe artifact",
  "run preflight gate",
  "wait for explicit separate instruction",
];

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
    console.log(JSON.stringify({ status: "validation-fail", reason, safeToDeploy: false }));
    return;
  }

  console.log("VGC-FUNKY-TOKEN owner preflight handoff packet");
  console.log("status: validation-fail");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
}

function runSafeCommand(label, commandArgs) {
  const result = spawnSync(process.execPath, commandArgs, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    printFailure(`${label} failed`);
    process.exit(1);
  }

  return result.stdout;
}

function parseJsonOutput(label, text) {
  try {
    return JSON.parse(text);
  } catch {
    printFailure(`${label} output was not recognized`);
    process.exit(1);
  }
}

const artifact = parseJsonOutput(
  "safe artifact",
  runSafeCommand("safe artifact exporter", ["scripts/export-testnet-preflight-safe-artifact.js"]),
);
const gate = parseJsonOutput(
  "preflight gate",
  runSafeCommand("preflight gate", ["scripts/check-testnet-preflight-gate.js", "--json"]),
);

const status = gate.status || "validation-fail";

if (status !== "BLOCKED_OWNER_DECISIONS_PENDING") {
  printFailure("current gate status is not the expected blocked pre-owner state");
  process.exit(1);
}

const packet = {
  status,
  tokenIdentity: {
    name: artifact.tokenIdentity?.name,
    symbol: artifact.tokenIdentity?.symbol,
  },
  repositoryScope: artifact.repositoryScope,
  sourceContract: artifact.sourceContract,
  remainingOwnerDecisions,
  ownerInputBoundary,
  allowedInputFormats,
  nextSafeActions,
  nonApproval,
  safeToDeploy: false,
  safeToPerformFundedTransaction: false,
  safeToPerformGovernanceTransaction: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
};

if (jsonMode) {
  console.log(JSON.stringify(packet));
  process.exit(0);
}

console.log("VGC-FUNKY-TOKEN owner preflight handoff packet");
console.log(`current status: ${packet.status}`);
console.log(`token identity: ${packet.tokenIdentity.name} / ${packet.tokenIdentity.symbol}`);
console.log(`repository scope: ${packet.repositoryScope}`);
console.log(`source contract: ${packet.sourceContract}`);
console.log("");
console.log("current safe tooling:");
console.log("owner-values validator: present");
console.log("summary generator: present");
console.log("issue parser: present");
console.log("review packet builder: present");
console.log("safe artifact exporter: present");
console.log("preflight gate: present");
console.log("");
console.log("remaining owner decisions:");
for (const decision of remainingOwnerDecisions) {
  console.log(`- ${decision}`);
}
console.log("");
console.log("owner input boundary:");
console.log("- provide public EVM addresses only for address fields");
console.log("- do not provide private keys");
console.log("- do not provide mnemonics");
console.log("- do not provide RPC URLs");
console.log("- do not provide API keys");
console.log("- do not provide .env contents");
console.log("- do not provide DB URLs");
console.log("- do not provide JWTs");
console.log("- do not provide cookies");
console.log("- do not provide private endpoints");
console.log("");
console.log("allowed next owner input formats:");
for (const format of allowedInputFormats) {
  console.log(`- ${format}`);
}
console.log("");
console.log("next safe action after owner input:");
for (const action of nextSafeActions) {
  console.log(`- ${action}`);
}
console.log("");
console.log("non-approval boundaries:");
for (const line of nonApprovalLines) {
  console.log(`- ${line}`);
}
