#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const parserPath = path.join(__dirname, "parse-deployment-readiness-owner-action-issue.js");
const defaultInputPath = "test/deployment-readiness-owner-action-issue.sample.md";

const requiredFields = [
  "approveBscTestnetUse",
  "initialAdmin",
  "initialFeeRecipient",
  "deployCommandApprovalText",
  "bscScanVerificationPlanText",
  "multisigPolicy",
  "adminRotationPolicy",
  "feeRecipientPolicy",
  "tierUpdaterPolicy",
  "trustedFactoryPolicy",
  "pairPolicy",
  "feeExemptionPolicy",
  "feeMaxPolicy",
  "feeDenominatorPolicy",
  "sellLpAddFeeBehaviorPolicy",
  "tierUpdaterLastRemovalPolicy",
  "feeExemptionProposerApproverPolicy",
  "tierUpdaterCodePresenceValidationPolicy",
  "sourceOfTruthRepositoryDecision",
  "repositoryVisibilityDecision",
];

const safeToFields = [
  "safeToDeploy",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToVerifyBscScan",
  "safeToClaimReadiness",
];

const nonApprovalFields = [
  "deployment",
  "fundedTransaction",
  "governanceTransaction",
  "bscScanVerification",
  "release",
  "publicVisibility",
  "runtimeReadiness",
  "stagingReadiness",
  "testnetReadiness",
  "mainnetReadiness",
];

const nonApprovalTextLines = [
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
  console.error("deployment readiness owner action review packet failed");
  console.error(`safe reason code: ${reason}`);
  console.error("no value echoed");
  process.exit(1);
}

function assertSafeParserOutput(text) {
  const forbidden = [
    /0x[a-fA-F0-9]{40}/,
    /0x[a-fA-F0-9]{64}/,
    /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i,
    /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i,
    /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m,
    /\b(?:postgres|mysql|mongodb|redis):\/\//i,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    /\bcookie\s*[:=]\s*[^\s"'<>]+/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(text)) fail("unsafe-parser-output");
  }
}

function runParser(inputPath) {
  const result = spawnSync(process.execPath, [parserPath, inputPath, "--json"], { encoding: "utf8" });
  const combinedOutput = `${result.stdout || ""}${result.stderr || ""}`;
  assertSafeParserOutput(combinedOutput);
  if (result.status !== 0) fail("source-parse-failed");
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("source-json-parse-failed");
  }
}

function classifyAction(action) {
  if (!action || action.status !== "pending_owner_action") return "unknown";
  return /(?:_TBD|OWNER_ACTION_PENDING)$/.test(action.value || "")
    ? "placeholder_safe"
    : "pending_owner_action";
}

const jsonMode = process.argv.includes("--json");
const inputPath = process.argv.find((arg) => arg !== "--json" && arg !== process.argv[0] && arg !== process.argv[1]) || defaultInputPath;
const parsed = runParser(inputPath);

if (parsed.status !== "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING") fail("source-status-mismatch");

const ownerActionsSummary = {};
for (const field of requiredFields) {
  const action = parsed.ownerActions && parsed.ownerActions[field];
  if (!action) fail("owner-action-missing");
  ownerActionsSummary[field] = {
    status: action.status,
    valueClass: classifyAction(action),
    unsafeInputAccepted: false,
    secretInputAccepted: false,
  };
}

const placeholderSafeActionCount = Object.values(ownerActionsSummary).filter(
  (action) => action.valueClass === "placeholder_safe",
).length;

const output = {
  status: "OWNER_ACTION_REVIEW_REQUIRED",
  sourceStatus: parsed.status,
  ownerActionsSummary,
  pendingActionCount: requiredFields.length,
  placeholderSafeActionCount,
  unsafeInputAccepted: false,
  secretInputAccepted: false,
  safeToDeploy: false,
  safeToPerformFundedTransaction: false,
  safeToPerformGovernanceTransaction: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
  nonApproval: Object.fromEntries(nonApprovalFields.map((field) => [field, true])),
  requiresLaterExplicitDeployInstruction: true,
  requiresOwnerReview: true,
  containsSecrets: false,
  containsRealOwnerValues: false,
};

for (const field of safeToFields) {
  if (parsed[field] !== false) fail("source-safe-to-mismatch");
}
for (const field of nonApprovalFields) {
  if (!parsed.nonApproval || parsed.nonApproval[field] !== true) fail("source-non-approval-mismatch");
}

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} else {
  console.log("VGC-FUNKY-TOKEN deployment readiness owner action review packet");
  console.log(`status: ${output.status}`);
  console.log(`source parse status: ${output.sourceStatus}`);
  console.log("owner actions: pending or placeholder-safe");
  console.log("unsafe input accepted: false");
  console.log("secret input accepted: false");
  for (const field of safeToFields) {
    console.log(`${field}: false`);
  }
  console.log("later explicit deploy instruction required: true");
  console.log("owner review required: true");
  for (const line of nonApprovalTextLines) {
    console.log(line);
  }
}
