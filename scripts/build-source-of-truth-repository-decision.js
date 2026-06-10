#!/usr/bin/env node

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  console.log("validation-fail: unsupported argument");
  console.log("no value echoed");
  process.exit(1);
}

const decision = {
  status: "SOURCE_OF_TRUTH_DECISION_PENDING",
  canonicalContractSourceRepo: "hiro4649/VGC-FUNKY-TOKEN",
  deployTargetRepo: "hiro4649/VGC-FUNKY-TOKEN",
  parentVgcRepoRole: "pending_or_docs_meta_only",
  duplicateContractSourcePolicy: "prohibited",
  migrationAllowedBeforeTestnet: "explicit_owner_approval_required",
  migrationAllowedAfterTestnet: "prohibited_without_formal_policy",
  bscScanSourceAlignmentPolicy: "must_match_canonical_source",
  ownerDecisionStatus: "pending_owner_decision",
  safeToDeploy: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
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
};

if (jsonMode) {
  console.log(JSON.stringify(decision));
  process.exit(0);
}

console.log("VGC-FUNKY-TOKEN source-of-truth repository decision");
console.log(`status: ${decision.status}`);
console.log(`canonical contract source repo: ${decision.canonicalContractSourceRepo}`);
console.log(`deploy target repo: ${decision.deployTargetRepo}`);
console.log("parent VGC repo role: pending or docs/meta only");
console.log("duplicate contract source policy: prohibited");
console.log("pre-testnet migration: explicit owner approval required");
console.log("post-testnet migration: prohibited without formal policy");
console.log("BscScan source alignment: must match canonical source");
console.log(`safeToDeploy: ${decision.safeToDeploy}`);
console.log(`safeToVerifyBscScan: ${decision.safeToVerifyBscScan}`);
console.log(`safeToClaimReadiness: ${decision.safeToClaimReadiness}`);
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
