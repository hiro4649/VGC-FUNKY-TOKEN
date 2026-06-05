#!/usr/bin/env node

const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const pretty = args.length === 1 && args[0] === "--pretty";

if (args.length > 1 || (args.length === 1 && !pretty)) {
  console.log("validation-fail: unsupported argument");
  console.log("no value echoed");
  process.exit(1);
}

const checks = [
  {
    label: "preTestnetStatus",
    command: ["scripts/show-testnet-preflight-status.js"],
  },
  {
    label: "safeOutputAudit",
    command: ["scripts/audit-testnet-preflight-safe-output.js"],
  },
  {
    label: "aggregateToolingCheck",
    command: ["scripts/run-testnet-preflight-tooling-checks.js"],
  },
];

function runCheck(check) {
  const result = spawnSync(process.execPath, check.command, {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    console.log("validation-fail: safe preflight artifact export blocked");
    console.log(`failed check: ${check.label}`);
    console.log("no value echoed");
    process.exit(1);
  }
}

for (const check of checks) {
  runCheck(check);
}

const artifact = {
  schemaVersion: "1.0.0",
  artifactType: "vgc-funky-token-testnet-preflight-safe-artifact",
  repositoryScope: "token-only",
  tokenIdentity: {
    name: "FUNKY RAVE",
    symbol: "FUNKY",
  },
  sourceContract: "contracts/funky/funky.sol",
  tooling: {
    preTestnetStatusCommand: "present",
    ownerValuesValidator: "present",
    summaryGenerator: "present",
    issueParser: "present",
    reviewPacketBuilder: "present",
    aggregateToolingCheck: "present",
    e2eFixture: "present",
    safeOutputAudit: "present",
  },
  checks: {
    preTestnetStatus: "pass",
    safeOutputAudit: "pass",
    aggregateToolingCheck: "pass",
  },
  ownerDecisionStatus: {
    bnbSmartChainTestnetApproval: "pending",
    initialAdmin: "pending",
    initialFeeRecipient: "pending",
    deployCommandApproval: "pending",
    deployerWalletFunding: "handled_separately_by_owner_pending",
    bscScanVerificationPlan: "pending",
    multisigOwnerPolicy: "pending",
    adminRotationPolicy: "pending",
    feeRecipientPolicy: "pending",
    tierUpdaterDeployerPolicy: "pending",
    tierUpdaterOwnerPolicy: "pending",
    trustedFactoryPolicy: "pending",
    initialDexPairPolicy: "pending",
    feeExemptionPolicy: "pending",
  },
  nonApproval: {
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
  },
  safety: {
    rawOwnerJsonPrinted: false,
    rawIssueBodyPrinted: false,
    fullPublicAddressesPrinted: false,
    secretsPrinted: false,
    rpcUsed: false,
    bscScanUsed: false,
    deployScriptUsed: false,
    configureScriptUsed: false,
    fundedTransactionPerformed: false,
    governanceTransactionPerformed: false,
  },
};

process.stdout.write(JSON.stringify(artifact, null, pretty ? 2 : 0));
process.stdout.write("\n");
