#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const VALIDATOR_PATH = path.join(__dirname, "validate-testnet-preflight-values.js");
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const POLICY_FIELDS = [
  "multisigOwnerPolicy",
  "adminRotationPolicy",
  "feeRecipientPolicy",
  "tierUpdaterDeployerPolicy",
  "tierUpdaterOwnerPolicy",
  "trustedFactoryPolicy",
  "initialDexPairPolicy",
  "feeExemptionPolicy",
];

function failValidation(message) {
  console.error(`summary-fail: ${message}`);
  process.exit(1);
}

function runValidator(filePath) {
  const result = spawnSync(process.execPath, [VALIDATOR_PATH, filePath], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const safeLines = `${result.stderr || ""}${result.stdout || ""}`
      .split(/\r?\n/)
      .filter((line) => /^(secret-risk|unsafe field category:|no value echoed|validation-fail:)/.test(line));

    if (safeLines.length > 0) {
      console.error(safeLines.join("\n"));
    } else {
      console.error("summary-fail: validation failed");
      console.error("no value echoed");
    }

    process.exit(result.status || 1);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    failValidation("input file must be valid JSON");
  }
}

function shortenAddress(value) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function addressStatus(value, placeholder) {
  if (value === placeholder) return placeholder;
  if (ADDRESS_RE.test(value)) return `PUBLIC_ADDRESS_SUPPLIED (${shortenAddress(value)})`;
  return "INVALID_AFTER_VALIDATION";
}

function textStatus(value, placeholder) {
  if (value === placeholder) return placeholder;
  return "TEXT_SUPPLIED";
}

function policyStatus(value) {
  return value === "PENDING" ? "PENDING" : "PROVIDED";
}

const filePath = process.argv[2];
if (!filePath) {
  failValidation("usage: node scripts/generate-testnet-preflight-summary.js <json-file>");
}

runValidator(filePath);
const data = readJson(filePath);

console.log("Testnet preflight safe summary");
console.log(`targetNetwork: ${data.targetNetwork}`);
console.log(`chainId: ${data.chainId}`);
console.log(`initialAdmin: ${addressStatus(data.initialAdmin, "INITIAL_ADMIN_TBD")}`);
console.log(
  `initialFeeRecipient: ${addressStatus(
    data.initialFeeRecipient,
    "INITIAL_FEE_RECIPIENT_TBD",
  )}`,
);
console.log(`deployCommandApproved: ${data.deployCommandApproved}`);
console.log(`deployerFundingHandledByOwner: ${data.deployerFundingHandledByOwner}`);
console.log(
  `bscScanVerificationPlan: ${textStatus(
    data.bscScanVerificationPlan,
    "VERIFICATION_PLAN_TBD",
  )}`,
);

console.log("policyFields:");
for (const field of POLICY_FIELDS) {
  console.log(`- ${field}: ${policyStatus(data[field])}`);
}

console.log("no deployment approval");
console.log("no funded transaction approval");
console.log("no governance transaction approval");
console.log("no BscScan verification approval");
console.log("no runtime readiness approval");
console.log("no staging readiness approval");
console.log("no testnet readiness approval");
console.log("no mainnet readiness approval");
