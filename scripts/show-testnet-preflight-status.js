#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

const requiredFiles = [
  ["validator", "scripts/validate-testnet-preflight-values.js"],
  ["validator self-test", "scripts/test-testnet-preflight-validator.js"],
  ["summary generator", "scripts/generate-testnet-preflight-summary.js"],
  ["summary generator self-test", "scripts/test-testnet-preflight-summary-generator.js"],
  ["issue parser", "scripts/parse-testnet-preflight-issue.js"],
  ["issue parser self-test", "scripts/test-testnet-preflight-issue-parser.js"],
  ["review packet builder", "scripts/build-testnet-preflight-review-packet.js"],
  ["review packet builder self-test", "scripts/test-testnet-preflight-review-packet-builder.js"],
  ["token validation workflow", ".github/workflows/token-validation.yml"],
  ["owner-safe issue template", ".github/ISSUE_TEMPLATE/testnet-preflight-owner-values.yml"],
  ["owner submission template", "docs/owner-testnet-preflight-submission-template.md"],
  ["review packet runbook", "docs/testnet-preflight-review-packet-runbook.md"],
  ["owner decisions document", "docs/testnet-preflight-owner-decisions.md"],
  ["deployment checklist", "docs/deployment-readiness-checklist.md"],
  ["source contract", "contracts/funky/funky.sol"],
];

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

const nonApprovalBoundaries = [
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

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

const fileStatus = requiredFiles.map(([label, relativePath]) => ({
  label,
  present: exists(relativePath),
}));

console.log("VGC-FUNKY-TOKEN pre-testnet status");
console.log("repository scope: token-only");
console.log("repository visibility: not checked locally, verify separately via GitHub if needed");
console.log("final ERC20 name: FUNKY RAVE");
console.log("final ERC20 symbol: FUNKY");
console.log("source contract: contracts/funky/funky.sol");
console.log("local tooling and documentation:");

for (const item of fileStatus) {
  console.log(`- ${item.label} available: ${item.present ? "yes" : "no"}`);
}

console.log("remaining owner decisions:");
for (const decision of remainingOwnerDecisions) {
  console.log(`- ${decision}`);
}

console.log("explicit non-approval boundaries:");
for (const boundary of nonApprovalBoundaries) {
  console.log(`- ${boundary}`);
}

const missing = fileStatus.filter((item) => !item.present);
if (missing.length > 0) {
  console.log("status result: missing required local files");
  process.exit(1);
}

console.log("status result: required local tooling and documentation present");
