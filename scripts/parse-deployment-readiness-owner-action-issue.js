#!/usr/bin/env node

const fs = require("fs");

const fields = [
  ["approveBscTestnetUse", "BNB Smart Chain testnet approval", "OWNER_ACTION_PENDING"],
  ["initialAdmin", "initialAdmin public address", "INITIAL_ADMIN_TBD"],
  ["initialFeeRecipient", "initialFeeRecipient public address", "INITIAL_FEE_RECIPIENT_TBD"],
  ["deployCommandApprovalText", "deploy command approval text", "DEPLOY_COMMAND_DECISION_TBD"],
  ["bscScanVerificationPlanText", "BscScan verification plan text", "BSC_SCAN_VERIFICATION_PLAN_TBD"],
  ["multisigPolicy", "multisig policy", "MULTISIG_POLICY_TBD"],
  ["adminRotationPolicy", "admin rotation policy", "ADMIN_ROTATION_POLICY_TBD"],
  ["feeRecipientPolicy", "feeRecipient policy", "FEE_RECIPIENT_POLICY_TBD"],
  ["tierUpdaterPolicy", "TierUpdater policy", "TIER_UPDATER_POLICY_TBD"],
  ["trustedFactoryPolicy", "trusted factory policy", "TRUSTED_FACTORY_POLICY_TBD"],
  ["pairPolicy", "pair policy", "PAIR_POLICY_TBD"],
  ["feeExemptionPolicy", "fee exemption policy", "FEE_EXEMPTION_POLICY_TBD"],
  ["feeMaxPolicy", "fee max policy", "FEE_MAX_POLICY_TBD"],
  ["feeDenominatorPolicy", "fee denominator policy", "FEE_DENOMINATOR_POLICY_TBD"],
  ["sellLpAddFeeBehaviorPolicy", "sell/LP-add fee behavior policy", "SELL_LP_ADD_FEE_BEHAVIOR_POLICY_TBD"],
  ["tierUpdaterLastRemovalPolicy", "tier updater last-removal policy", "TIER_UPDATER_LAST_REMOVAL_POLICY_TBD"],
  ["feeExemptionProposerApproverPolicy", "fee exemption proposer/approver policy", "FEE_EXEMPTION_PROPOSER_APPROVER_POLICY_TBD"],
  ["tierUpdaterCodePresenceValidationPolicy", "tier updater code-presence validation policy", "TIER_UPDATER_CODE_PRESENCE_VALIDATION_POLICY_TBD"],
  ["sourceOfTruthRepositoryDecision", "source-of-truth repository decision", "SOURCE_OF_TRUTH_REPOSITORY_DECISION_TBD"],
  ["repositoryVisibilityDecision", "repository visibility decision", "REPOSITORY_VISIBILITY_DECISION_TBD"],
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

function fail(reason) {
  console.error("deployment readiness owner action issue parser failed");
  console.error(`safe reason code: ${reason}`);
  console.error("no value echoed");
  process.exit(1);
}

function normalizeLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseSections(body) {
  const headingRe = /^###\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(headingRe)];
  if (matches.length === 0) fail("issue-body-format-not-recognized");
  const sections = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const start = match.index + match[0].length;
    const end = next ? next.index : body.length;
    sections.set(normalizeLabel(match[1]), body.slice(start, end).trim());
  }
  return sections;
}

function cleanValue(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[-*]\s+\[[ xX]\]/.test(line))
    .join("\n")
    .trim();
}

function detectUnsafe(text) {
  const checks = [
    ["private-key-like", /\b0x[a-fA-F0-9]{64}\b|\b[a-fA-F0-9]{64}\b/],
    ["real-evm-address", /\b0x[a-fA-F0-9]{40}\b/],
    ["mnemonic", /\b(?:mnemonic|seed phrase|recovery phrase)\s*[:=]\s*\S+/i],
    ["rpc-url", /\b(?:https?|wss?):\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)[^\s"'<>]*/i],
    ["api-key-value", /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i],
    ["env-content", /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m],
    ["db-url", /\b(?:postgres|mysql|mongodb|redis):\/\//i],
    ["jwt", /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/],
    ["cookie", /\bcookie\s*[:=]\s*[^\s"'<>]+/i],
    ["wallet-funding-proof", /\b(?:tx hash|transaction hash|funding proof|wallet funding proof)\b/i],
  ];
  for (const [reason, pattern] of checks) {
    if (pattern.test(text)) fail(reason);
  }

  const approvalWord = "approval";
  const normalized = text.replace(
    new RegExp(`\\b(?:no|not|non|does not)\\b[^\\n]*(?:deployment|readiness) ${approvalWord}`, "gi"),
    "",
  );
  const deploymentApprovalPattern = new RegExp(`\\bdeployment ${approvalWord}\\b`, "i");
  const readinessApprovalPattern = new RegExp(`\\breadiness ${approvalWord}\\b`, "i");
  if (deploymentApprovalPattern.test(normalized)) fail("deployment-approval-wording");
  if (readinessApprovalPattern.test(normalized)) fail("readiness-approval-wording");
}

function fieldStatus(value, placeholder) {
  return value === placeholder || /(?:_TBD|OWNER_ACTION_PENDING)$/.test(value)
    ? "pending_owner_action"
    : "pending_owner_action";
}

const filePath = process.argv[2];
const jsonMode = process.argv.includes("--json");
if (!filePath) fail("usage");

let body;
try {
  body = fs.readFileSync(filePath, "utf8");
} catch {
  fail("issue-read-failed");
}

detectUnsafe(body);
const sections = parseSections(body);
const ownerActions = {};

for (const [key, label, placeholder] of fields) {
  const section = sections.get(normalizeLabel(label));
  const value = cleanValue(section || placeholder) || placeholder;
  detectUnsafe(value);
  ownerActions[key] = {
    status: fieldStatus(value, placeholder),
    value,
    unsafeInputAccepted: false,
    secretInputAccepted: false,
  };
}

const output = {
  status: "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING",
  ownerActions,
  safeToDeploy: false,
  safeToPerformFundedTransaction: false,
  safeToPerformGovernanceTransaction: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
  nonApproval: Object.fromEntries(nonApprovalFields.map((field) => [field, true])),
};

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} else {
  console.log("VGC-FUNKY-TOKEN deployment readiness owner action issue parse");
  console.log(`status: ${output.status}`);
  for (const [key, action] of Object.entries(ownerActions)) {
    console.log(`${key}: ${action.status}`);
  }
  for (const field of safeToFields) {
    console.log(`${field}: false`);
  }
  console.log("nonApproval: true");
}
