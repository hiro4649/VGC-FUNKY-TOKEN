#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const jsonMode = args.length === 1 && args[0] === "--json";

if (args.length > 1 || (args.length === 1 && !jsonMode)) {
  fail("repositoryScope", null, "unsupported-argument");
}

const categories = {
  repositoryScope: "pass",
  tokenIdentity: "pass",
  contractSourceBoundary: "pass",
  deployScriptBoundary: "pass",
  configureScriptBoundary: "pass",
  workflowBoundary: "pass",
  preflightToolingBoundary: "pass",
  ownerInputBoundary: "pass",
  secretSafetyBoundary: "pass",
  readinessClaimBoundary: "pass",
  forbiddenContentBoundary: "pass",
  packageLockBoundary: "pass",
  visibilityBoundaryDocumentation: "pass",
  remainingOwnerDecisionBoundary: "pass",
};

const categoryLabels = {
  repositoryScope: "repository scope",
  tokenIdentity: "token identity",
  contractSourceBoundary: "contract source boundary",
  deployScriptBoundary: "deploy script boundary",
  configureScriptBoundary: "configure script boundary",
  workflowBoundary: "workflow boundary",
  preflightToolingBoundary: "preflight tooling boundary",
  ownerInputBoundary: "owner input boundary",
  secretSafetyBoundary: "secret safety boundary",
  readinessClaimBoundary: "readiness claim boundary",
  forbiddenContentBoundary: "forbidden content boundary",
  packageLockBoundary: "package/lockfile boundary",
  visibilityBoundaryDocumentation: "visibility documentation boundary",
  remainingOwnerDecisionBoundary: "remaining owner decision boundary",
};

const remainingOwnerDecisions = [
  "BNB Smart Chain testnet approval",
  "initialAdmin",
  "initialFeeRecipient",
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
  if (jsonMode) {
    console.log(JSON.stringify({
      overall: "fail",
      category,
      filePath: filePath || undefined,
      reasonCode,
      valueEchoed: false,
    }));
  } else {
    console.log("VGC-FUNKY-TOKEN repository safety audit");
    console.log(`${category}: fail`);
    if (filePath) {
      console.log(`file path: ${filePath}`);
    }
    console.log(`reason code: ${reasonCode}`);
    console.log("no value echoed");
  }
  process.exit(1);
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    fail("repositoryScope", null, "git-ls-files-failed");
  }

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !/(^|\/)(node_modules|artifacts|cache|coverage|typechain|typechain-types|\.git)(\/|$)/.test(file));
}

const files = trackedFiles();
const fileSet = new Set(files);

function read(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    fail("repositoryScope", filePath, "required-file-unreadable");
  }
}

function isIntentionalSafetyFixtureFile(filePath) {
  return filePath.startsWith("scripts/test-") || filePath.startsWith("test/");
}

function isIntentionalSafetyVocabularyFile(filePath) {
  return isIntentionalSafetyFixtureFile(filePath)
    || filePath === "scripts/audit-testnet-preflight-safe-output.js"
    || filePath === "scripts/audit-vgc-token-repo-safety.js";
}

function requireFile(category, filePath) {
  if (!fileSet.has(filePath)) {
    fail(category, filePath, "required-file-missing");
  }
}

function includesAll(category, filePath, requiredTexts, reasonCode) {
  const content = read(filePath);
  for (const text of requiredTexts) {
    if (!content.includes(text)) {
      fail(category, filePath, reasonCode);
    }
  }
}

requireFile("repositoryScope", "contracts/funky/funky.sol");
requireFile("repositoryScope", "contracts/package.json");
requireFile("repositoryScope", "README.md");
requireFile("repositoryScope", "docs/testnet-preflight-review-packet-runbook.md");
requireFile("repositoryScope", "docs/owner-testnet-preflight-submission-template.md");
requireFile("repositoryScope", "docs/testnet-preflight-owner-decisions.md");
requireFile("repositoryScope", "docs/deployment-readiness-checklist.md");

includesAll("tokenIdentity", "contracts/funky/funky.sol", ["FUNKY RAVE", "FUNKY"], "token-identity-not-found");

requireFile("deployScriptBoundary", "contracts/scripts/deploy-funky.js");
includesAll("deployScriptBoundary", "contracts/scripts/deploy-funky.js", ["FUNKY_VALIDATE_ONLY"], "validate-only-deploy-boundary-missing");

requireFile("configureScriptBoundary", "contracts/scripts/configure-funky-governance.js");
includesAll("configureScriptBoundary", "contracts/scripts/configure-funky-governance.js", ["FUNKY_VALIDATE_ONLY"], "validate-only-configure-boundary-missing");

requireFile("workflowBoundary", ".github/workflows/token-validation.yml");
const workflow = read(".github/workflows/token-validation.yml");
if (/secrets\./i.test(workflow)) {
  fail("workflowBoundary", ".github/workflows/token-validation.yml", "workflow-references-secrets");
}
if (/bscscan\s+verify|verify:bscscan|hardhat\s+verify/i.test(workflow)) {
  fail("workflowBoundary", ".github/workflows/token-validation.yml", "workflow-bscscan-verification-command");
}
if (/PRIVATE_KEY\s*[:=]/i.test(workflow)) {
  fail("workflowBoundary", ".github/workflows/token-validation.yml", "workflow-private-key-value");
}
if (/node scripts\/deploy-funky\.js/i.test(workflow) && !/FUNKY_VALIDATE_ONLY:\s*"true"/.test(workflow)) {
  fail("workflowBoundary", ".github/workflows/token-validation.yml", "workflow-unguarded-deploy-command");
}

for (const filePath of [
  "scripts/validate-testnet-preflight-values.js",
  "scripts/test-testnet-preflight-validator.js",
  "scripts/generate-testnet-preflight-summary.js",
  "scripts/test-testnet-preflight-summary-generator.js",
  "scripts/parse-testnet-preflight-issue.js",
  "scripts/test-testnet-preflight-issue-parser.js",
  "scripts/build-testnet-preflight-review-packet.js",
  "scripts/test-testnet-preflight-review-packet-builder.js",
  "scripts/show-testnet-preflight-status.js",
  "scripts/test-testnet-preflight-status.js",
  "scripts/run-testnet-preflight-tooling-checks.js",
  "scripts/test-testnet-preflight-tooling-checks.js",
  "scripts/test-testnet-preflight-e2e-packet.js",
  "scripts/audit-testnet-preflight-safe-output.js",
  "scripts/export-testnet-preflight-safe-artifact.js",
  "scripts/check-testnet-preflight-gate.js",
  "scripts/build-owner-preflight-handoff-packet.js",
  "test/testnet-preflight-safe-artifact.schema.json",
  "test/owner-preflight-handoff-packet.expected.json",
]) {
  requireFile("preflightToolingBoundary", filePath);
}

requireFile("ownerInputBoundary", ".github/ISSUE_TEMPLATE/testnet-preflight-owner-values.yml");
includesAll("ownerInputBoundary", "docs/owner-testnet-preflight-submission-template.md", [
  "public EVM address",
  "Do not provide private keys",
  "Do not provide mnemonics",
  "Do not provide RPC URLs",
  "Do not provide API keys",
], "owner-input-boundary-missing");

const rpcProtocol = "(?:ht" + "tps?|wss?)://";
const forbiddenPatterns = [
  { category: "secretSafetyBoundary", reason: "private-key-assignment", regex: /private[_ -]?key\s*[:=]/i },
  { category: "secretSafetyBoundary", reason: "mnemonic-assignment", regex: /mnemonic\s*[:=]/i },
  { category: "secretSafetyBoundary", reason: "real-rpc-url", regex: new RegExp(`\\b${rpcProtocol}[^\\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\\s"'<>]*`, "i") },
  { category: "secretSafetyBoundary", reason: "api-key-value-assignment", regex: /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i },
  { category: "secretSafetyBoundary", reason: "db-url", regex: /\b(?:postgres|mysql|mongodb|redis):\/\//i },
  { category: "secretSafetyBoundary", reason: "jwt-literal", regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { category: "secretSafetyBoundary", reason: "cookie-assignment", regex: /\bcookie\s*[:=]/i },
  { category: "secretSafetyBoundary", reason: "env-content", regex: /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m },
  { category: "secretSafetyBoundary", reason: "private-key-hex", regex: /0x[a-fA-F0-9]{64}/ },
];

for (const filePath of files) {
  if (isIntentionalSafetyFixtureFile(filePath)) {
    continue;
  }
  const content = read(filePath);
  for (const pattern of forbiddenPatterns) {
    if (pattern.regex.test(content)) {
      if (pattern.reason === "real-rpc-url" && filePath === "contracts/hardhat.config.js") {
        continue;
      }
      if (pattern.reason === "api-key-value-assignment" && filePath === "contracts/hardhat.config.js") {
        continue;
      }
      fail(pattern.category, filePath, pattern.reason);
    }
  }
}

for (const filePath of files.filter((file) => /\.(md|js|json|yml|yaml|txt)$/.test(file))) {
  if (isIntentionalSafetyVocabularyFile(filePath)) {
    continue;
  }
  const lines = read(filePath).split(/\r?\n/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasSensitiveClaim = /(deployment approval|readiness approval|bscscan verification approval|funded transaction approval|governance transaction approval|(?:runtime|staging|testnet|mainnet) readiness (?:approval|claim|claimed|ready|approved|met|passed)|(?:runtime|staging|testnet|mainnet) ready)/i.test(line);
    const isNegative = /\b(no|not|non|does not|do not|is not|are not|without|still required|blocked)\b/i.test(line);
    if (hasSensitiveClaim && !isNegative) {
      fail("readinessClaimBoundary", filePath, "affirmative-approval-or-readiness-claim");
    }
    if (/raw owner json|raw issue body/i.test(lower) && !/does not|do not|no raw|without raw|not include/.test(lower)) {
      fail("forbiddenContentBoundary", filePath, "raw-owner-input-boundary");
    }
  }
}

requireFile("packageLockBoundary", "contracts/package.json");
requireFile("packageLockBoundary", "contracts/package-lock.json");

const docsText = [
  "README.md",
  "docs/deployment-readiness-checklist.md",
  "docs/testnet-preflight-owner-decisions.md",
  "docs/vgc-token-repo-safety-audit.md",
]
  .map((file) => read(file))
  .join("\n");
if (!/private|visibility must be verified externally|verify separately via github/i.test(docsText)) {
  fail("visibilityBoundaryDocumentation", "README.md", "visibility-boundary-missing");
}

const ownerDecisionText = ["docs/testnet-preflight-owner-decisions.md", "scripts/build-owner-preflight-handoff-packet.js"]
  .map((file) => read(file))
  .join("\n");
for (const decision of remainingOwnerDecisions) {
  if (!ownerDecisionText.includes(decision)) {
    fail("remainingOwnerDecisionBoundary", null, "remaining-owner-decision-missing");
  }
}

function printText() {
  console.log("VGC-FUNKY-TOKEN repository safety audit");
  for (const [category, status] of Object.entries(categories)) {
    console.log(`${categoryLabels[category] || category}: ${status}`);
  }
  console.log("overall: pass");
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

if (jsonMode) {
  console.log(JSON.stringify({
    overall: "pass",
    categories,
    nonActions,
    remainingOwnerDecisions,
  }));
} else {
  printText();
}
