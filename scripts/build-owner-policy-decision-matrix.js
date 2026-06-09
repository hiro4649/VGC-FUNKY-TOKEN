#!/usr/bin/env node

const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  fail("unsupported-argument");
}

const decisionFieldDefinitions = [
  {
    key: "feeMaxPolicy",
    label: "fee max policy",
    sourceInvariantCategory: "feeDenominatorInvariant",
    safeSummary: "owner must confirm max fee policy remains acceptable",
  },
  {
    key: "feeDenominatorPolicy",
    label: "fee denominator policy",
    sourceInvariantCategory: "feeDenominatorInvariant",
    safeSummary: "owner must confirm fee denominator policy remains acceptable",
  },
  {
    key: "sellLpAddFeeBehaviorPolicy",
    label: "sell/LP-add fee behavior policy",
    sourceInvariantCategory: "sellOnlyFeeInvariant",
    safeSummary: "owner must confirm sell/LP-add-only fee behavior",
  },
  {
    key: "tierUpdaterLastRemovalPolicy",
    label: "tier updater last-removal policy",
    sourceInvariantCategory: "tierUpdaterLastRemovalInvariant",
    safeSummary: "owner must confirm last tier updater removal policy",
  },
  {
    key: "trustedFactoryRegistrationPolicy",
    label: "trusted factory registration policy",
    sourceInvariantCategory: "factoryRegistrationInvariant",
    safeSummary: "owner must confirm trusted factory registration policy",
  },
  {
    key: "feeExemptionProposerApproverPolicy",
    label: "fee exemption proposer/approver policy",
    sourceInvariantCategory: "feeExemptGovernanceInvariant",
    safeSummary: "owner must confirm fee exemption proposer and approver policy",
  },
  {
    key: "tierUpdaterCodePresenceValidationPolicy",
    label: "tier updater code-presence validation policy",
    sourceInvariantCategory: "configureTierUpdaterValidateOnlyGap",
    safeSummary: "owner must confirm tier updater code-presence validation policy",
  },
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

function fail(reasonCode) {
  if (jsonMode) {
    console.log(JSON.stringify({
      status: "FAIL",
      reasonCode,
      valueEchoed: false,
    }));
  } else {
    console.log("VGC-FUNKY-TOKEN owner policy decision matrix");
    console.log("status: FAIL");
    console.log(`safe reason code: ${reasonCode}`);
    console.log("no value echoed");
  }
  process.exit(1);
}

function runSourceInvariantAudit() {
  const result = spawnSync(process.execPath, ["scripts/audit-vgc-token-source-invariants.js", "--json"], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    fail("source-invariant-audit-failed");
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("source-invariant-audit-json-unreadable");
  }
}

function buildDecisionFields(report) {
  const manualReviewCategories = new Set((report.manualReviewItems || []).map((item) => item.category));
  const decisionFields = {};

  for (const definition of decisionFieldDefinitions) {
    if (!manualReviewCategories.has(definition.sourceInvariantCategory)) {
      fail(`manual-review-category-missing-${definition.sourceInvariantCategory}`);
    }
    decisionFields[definition.key] = {
      status: "pending_owner_decision",
      sourceInvariantCategory: definition.sourceInvariantCategory,
      safeSummary: definition.safeSummary,
      ownerDecisionRequired: true,
    };
  }

  return decisionFields;
}

function buildMatrix() {
  const report = runSourceInvariantAudit();
  if (Array.isArray(report.hardFailures) && report.hardFailures.length > 0) {
    fail("source-invariant-hard-failures-present");
  }
  if (report.overall !== "pass_with_manual_review_items") {
    fail("source-invariant-audit-not-manual-review-pass");
  }

  return {
    status: "OWNER_POLICY_DECISIONS_PENDING",
    decisionFields: buildDecisionFields(report),
    safeToDeploy: false,
    safeToPerformFundedTransaction: false,
    safeToPerformGovernanceTransaction: false,
    safeToVerifyBscScan: false,
    safeToClaimReadiness: false,
    nonApproval,
  };
}

function printText(matrix) {
  console.log("VGC-FUNKY-TOKEN owner policy decision matrix");
  console.log(`status: ${matrix.status}`);
  for (const definition of decisionFieldDefinitions) {
    console.log(`${definition.label}: pending owner decision`);
  }
  console.log(`safeToDeploy: ${matrix.safeToDeploy}`);
  console.log(`safeToPerformFundedTransaction: ${matrix.safeToPerformFundedTransaction}`);
  console.log(`safeToPerformGovernanceTransaction: ${matrix.safeToPerformGovernanceTransaction}`);
  console.log(`safeToVerifyBscScan: ${matrix.safeToVerifyBscScan}`);
  console.log(`safeToClaimReadiness: ${matrix.safeToClaimReadiness}`);
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
}

const matrix = buildMatrix();
if (jsonMode) {
  console.log(JSON.stringify(matrix));
} else {
  printText(matrix);
}
