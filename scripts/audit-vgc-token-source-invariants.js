#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

const invariantLabels = {
  tokenIdentityInvariant: "token identity invariant",
  initialSupplyInvariant: "initial supply invariant",
  feeDenominatorInvariant: "fee denominator invariant",
  sellOnlyFeeInvariant: "sell-only fee invariant",
  tierUpdaterInitialStateInvariant: "tier updater initial state invariant",
  tierUpdaterContractOnlyInvariant: "tier updater contract-only invariant",
  tierUpdaterLastRemovalInvariant: "tier updater last-removal invariant",
  factoryRegistrationInvariant: "factory registration invariant",
  pairValidationInvariant: "pair validation invariant",
  feeExemptGovernanceInvariant: "fee exempt governance invariant",
  deployValidateOnlyBoundary: "deploy validate-only boundary",
  deployRuntimeBoundary: "deploy runtime boundary",
  configureValidateOnlyBoundary: "configure validate-only boundary",
  configureRuntimeBoundary: "configure runtime boundary",
  configureTierUpdaterValidateOnlyGap: "configure tier updater validate-only gap",
  workflowNoDeployBoundary: "workflow no-deploy boundary",
  ownerDecisionBoundary: "owner decision boundary",
  preflightToolchainBoundary: "preflight toolchain boundary",
  forbiddenClaimBoundary: "forbidden claim boundary",
  secretSafetyBoundary: "secret safety boundary",
};

const invariants = Object.fromEntries(Object.keys(invariantLabels).map((key) => [key, "pass"]));
const hardFailures = [];
const manualReviewItems = [];
const blockedActions = [];

const nonActions = {
  deployPerformed: false,
  fundedTransactionPerformed: false,
  governanceTransactionPerformed: false,
  bscScanVerificationPerformed: false,
  releaseCreated: false,
  publicVisibilityChanged: false,
  runtimeReadinessClaimed: false,
  stagingReadinessClaimed: false,
  testnetReadinessClaimed: false,
  mainnetReadinessClaimed: false,
};

function fail(category, filePath, reasonCode) {
  hardFailures.push({ category, filePath, reasonCode });
  invariants[category] = "fail";
}

function markManual(category, reasonCode, summary) {
  invariants[category] = "manual_review_required";
  manualReviewItems.push({ category, reasonCode, summary });
}

function markBlocked(category, reasonCode, summary) {
  invariants[category] = "blocked_by_owner_approval";
  blockedActions.push({ category, reasonCode, summary });
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    fail("secretSafetyBoundary", null, "git-ls-files-failed");
    return [];
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function requireIncludes(category, content, needle, filePath, reasonCode) {
  if (!content.includes(needle)) {
    fail(category, filePath, reasonCode);
  }
}

function requireRegex(category, content, regex, filePath, reasonCode) {
  if (!regex.test(content)) {
    fail(category, filePath, reasonCode);
  }
}

function assertValidateOnlyBeforeRuntime(category, content, runtimeRegexes, filePath, reasonCode) {
  const validateIndex = content.indexOf("if (isValidateOnly())");
  if (validateIndex === -1) {
    fail(category, filePath, `${reasonCode}-missing-validate-only`);
    return;
  }
  for (const regex of runtimeRegexes) {
    const match = regex.exec(content);
    if (!match || match.index < validateIndex) {
      fail(category, filePath, reasonCode);
      return;
    }
  }
}

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  fail("secretSafetyBoundary", null, "unsupported-argument");
}

const contractPath = "contracts/funky/funky.sol";
const deployPath = "contracts/scripts/deploy-funky.js";
const configurePath = "contracts/scripts/configure-funky-governance.js";
const workflowPath = ".github/workflows/token-validation.yml";

const contract = read(contractPath);
const deployScript = read(deployPath);
const configureScript = read(configurePath);
const workflow = read(workflowPath);

requireIncludes("tokenIdentityInvariant", contract, 'ERC20("FUNKY RAVE", "FUNKY")', contractPath, "token-identity-mismatch");
requireIncludes("initialSupplyInvariant", contract, "_mint(initialAdmin, 30_000_000_000e18)", contractPath, "initial-supply-mismatch");

requireRegex("feeDenominatorInvariant", contract, /\/\s*1000\b/, contractPath, "fee-denominator-missing");
requireRegex("feeDenominatorInvariant", contract, /if\s*\(_newFeePercent\s*>\s*1000\)/, contractPath, "fee-max-boundary-missing");
if (invariants.feeDenominatorInvariant !== "fail") {
  markManual("feeDenominatorInvariant", "fee-model-owner-policy", "fee model requires owner policy confirmation");
}

requireRegex("sellOnlyFeeInvariant", contract, /isDex\[to\]\s*&&\s*!isFeeExempt\[from\]/, contractPath, "sell-only-fee-condition-missing");
if (invariants.sellOnlyFeeInvariant !== "fail") {
  markManual("sellOnlyFeeInvariant", "sell-lp-add-owner-policy", "sell/LP-add-only fee behavior requires business confirmation");
}

requireIncludes("tierUpdaterInitialStateInvariant", contract, "tierUpdaterCount = 0", contractPath, "tier-updater-initial-state-missing");
requireIncludes("tierUpdaterContractOnlyInvariant", contract, "updater.code.length == 0", contractPath, "tier-updater-contract-check-missing");
requireIncludes("tierUpdaterLastRemovalInvariant", contract, "tierUpdaterCount == 1", contractPath, "tier-updater-last-removal-boundary-missing");
if (invariants.tierUpdaterLastRemovalInvariant !== "fail") {
  markManual("tierUpdaterLastRemovalInvariant", "last-updater-removal-policy", "last updater removal policy requires owner confirmation");
}

requireIncludes("factoryRegistrationInvariant", contract, "if (factory == address(0))", contractPath, "factory-zero-address-check-missing");
if (invariants.factoryRegistrationInvariant !== "fail") {
  markManual("factoryRegistrationInvariant", "trusted-factory-owner-policy", "trusted factory policy requires owner confirmation");
}

for (const expected of ["IDexPair(pair).token0()", "IDexPair(pair).token1()", "IDexPair(pair).factory()", "PairDoesNotContainToken", "FactoryNotRegistered"]) {
  requireIncludes("pairValidationInvariant", contract, expected, contractPath, "pair-validation-check-missing");
}

for (const expected of ["reasonCode == bytes32(0)", "requestId == bytes32(0)", "_isAllowedExemptCategory(categoryCode)", "proposer", "approver"]) {
  requireIncludes("feeExemptGovernanceInvariant", contract, expected, contractPath, "fee-exempt-governance-check-missing");
}
if (invariants.feeExemptGovernanceInvariant !== "fail") {
  markManual("feeExemptGovernanceInvariant", "fee-exempt-owner-policy", "fee exemption proposer/approver policy requires owner confirmation");
}

assertValidateOnlyBeforeRuntime(
  "deployValidateOnlyBoundary",
  deployScript,
  [/ethers\.getSigners\(\)/, /ethers\.getContractFactory\(/, /\.deploy\(/],
  deployPath,
  "deploy-validate-only-order-invalid",
);
markBlocked("deployRuntimeBoundary", "explicit-owner-deploy-instruction-required", "deploy script must remain blocked until explicit owner deploy instruction");

assertValidateOnlyBeforeRuntime(
  "configureValidateOnlyBoundary",
  configureScript,
  [/ethers\.getSigners\(\)/, /new ethers\.Contract\(/],
  configurePath,
  "configure-validate-only-order-invalid",
);
markBlocked("configureRuntimeBoundary", "explicit-owner-governance-instruction-required", "configure script must remain blocked until explicit owner governance instruction");
blockedActions.push(
  { category: "fundedTransactionBoundary", reasonCode: "explicit-owner-funded-transaction-approval-required", summary: "funded transactions remain blocked until explicit owner approval" },
  { category: "bscScanVerificationBoundary", reasonCode: "explicit-owner-bscscan-approval-required", summary: "BscScan verification remains blocked until explicit owner approval" },
  { category: "readinessBoundary", reasonCode: "readiness-claim-not-approved", summary: "runtime, staging, testnet, and mainnet readiness claims remain blocked" },
);
markManual("configureTierUpdaterValidateOnlyGap", "tier-updater-code-presence-rpc-limitation", "testnet preflight should document that validate-only cannot prove tier updater code presence without RPC");

if (!/FUNKY_VALIDATE_ONLY:\s*"true"/.test(workflow) || /secrets\.|PRIVATE_KEY\s*:|hardhat verify|bscscan/i.test(workflow)) {
  fail("workflowNoDeployBoundary", workflowPath, "workflow-no-deploy-boundary-missing");
}

const ownerDocs = [
  "docs/deployment-readiness-checklist.md",
  "docs/testnet-preflight-owner-decisions.md",
  "docs/owner-testnet-preflight-submission-template.md",
  "docs/testnet-preflight-review-packet-runbook.md",
].map((file) => read(file)).join("\n");
for (const expected of [
  "BNB Smart Chain testnet approval",
  "initialAdmin",
  "initialFeeRecipient",
  "deploy command approval",
  "BscScan verification plan",
]) {
  requireIncludes("ownerDecisionBoundary", ownerDocs, expected, "docs", "owner-decision-boundary-missing");
}

for (const filePath of [
  "scripts/validate-testnet-preflight-values.js",
  "scripts/generate-testnet-preflight-summary.js",
  "scripts/parse-testnet-preflight-issue.js",
  "scripts/build-testnet-preflight-review-packet.js",
  "scripts/export-testnet-preflight-safe-artifact.js",
  "scripts/check-testnet-preflight-gate.js",
  "scripts/test-testnet-preflight-safe-artifact-schema.js",
  "scripts/build-owner-preflight-handoff-packet.js",
  "scripts/audit-vgc-token-repo-safety.js",
]) {
  if (!fs.existsSync(filePath)) {
    fail("preflightToolchainBoundary", filePath, "preflight-tool-missing");
  }
}

function isIntentionalSafetyVocabularyFile(filePath) {
  return filePath.startsWith("scripts/test-")
    || filePath.startsWith("test/")
    || filePath === "scripts/audit-testnet-preflight-safe-output.js"
    || filePath === "scripts/audit-vgc-token-repo-safety.js"
    || filePath === "scripts/audit-vgc-token-source-invariants.js";
}

for (const filePath of trackedFiles().filter((file) => /\.(md|js|json|yml|yaml|txt)$/.test(file))) {
  if (isIntentionalSafetyVocabularyFile(filePath)) {
    continue;
  }
  const lines = read(filePath).split(/\r?\n/);
  for (const line of lines) {
    const hasClaim = /(deployment approval|readiness approval|bscscan verification approval|funded transaction approval|governance transaction approval|(?:runtime|staging|testnet|mainnet) readiness (?:approval|claim|claimed|ready|approved|met|passed)|(?:runtime|staging|testnet|mainnet) ready)/i.test(line);
    const isNegative = /\b(no|not|non|does not|do not|is not|are not|without|still required|blocked|pending)\b/i.test(line);
    if (hasClaim && !isNegative) {
      fail("forbiddenClaimBoundary", filePath, "affirmative-readiness-or-approval-claim");
    }
  }
}

const rpcProtocol = "(?:ht" + "tps?|wss?)://";
const forbiddenPatterns = [
  { reason: "private-key-assignment", regex: /private[_ -]?key\s*[:=]/i },
  { reason: "mnemonic-assignment", regex: /mnemonic\s*[:=]/i },
  { reason: "real-rpc-url", regex: new RegExp(`\\b${rpcProtocol}[^\\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\\s"'<>]*`, "i") },
  { reason: "api-key-value-assignment", regex: /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i },
  { reason: "db-url", regex: /\b(?:postgres|mysql|mongodb|redis):\/\//i },
  { reason: "jwt-literal", regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { reason: "cookie-assignment", regex: /\bcookie\s*[:=]/i },
  { reason: "env-content", regex: /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m },
  { reason: "private-key-hex", regex: /0x[a-fA-F0-9]{64}/ },
];

for (const filePath of trackedFiles()) {
  if (isIntentionalSafetyVocabularyFile(filePath) || filePath === "contracts/hardhat.config.js") {
    continue;
  }
  const content = read(filePath);
  for (const pattern of forbiddenPatterns) {
    if (pattern.regex.test(content)) {
      fail("secretSafetyBoundary", filePath, pattern.reason);
    }
  }
}

function printText() {
  console.log("VGC-FUNKY-TOKEN source invariant audit");
  for (const [category, label] of Object.entries(invariantLabels)) {
    console.log(`${label}: ${invariants[category]}`);
  }
  console.log("overall: pass_with_manual_review_items");
  console.log("no deploy performed");
  console.log("no funded transaction performed");
  console.log("no governance transaction performed");
  console.log("no BscScan verification performed");
  console.log("no release created");
  console.log("no public visibility change performed");
  console.log("no runtime readiness claimed");
  console.log("no staging readiness claimed");
  console.log("no testnet readiness claimed");
  console.log("no mainnet readiness claimed");
}

if (hardFailures.length > 0) {
  if (jsonMode) {
    console.log(JSON.stringify({ overall: "fail", hardFailures, valueEchoed: false }));
  } else {
    console.log("VGC-FUNKY-TOKEN source invariant audit");
    console.log("overall: fail");
    console.log(`hard failure count: ${hardFailures.length}`);
    console.log("no value echoed");
  }
  process.exit(1);
}

if (jsonMode) {
  console.log(JSON.stringify({
    overall: "pass_with_manual_review_items",
    hardFailures,
    manualReviewItems,
    blockedActions,
    invariants,
    nonActions,
  }));
} else {
  printText();
}
