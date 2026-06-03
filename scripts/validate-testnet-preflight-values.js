#!/usr/bin/env node

const fs = require("fs");

const REQUIRED_FIELDS = [
  "targetNetwork",
  "chainId",
  "initialAdmin",
  "initialFeeRecipient",
  "deployCommandApproved",
  "deployerFundingHandledByOwner",
  "bscScanVerificationPlan",
  "multisigOwnerPolicy",
  "adminRotationPolicy",
  "feeRecipientPolicy",
  "tierUpdaterDeployerPolicy",
  "tierUpdaterOwnerPolicy",
  "trustedFactoryPolicy",
  "initialDexPairPolicy",
  "feeExemptionPolicy",
];

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

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const PRIVATE_KEY_RE = /\b0x[0-9a-fA-F]{64}\b|\b[0-9a-fA-F]{64}\b/;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const URL_RE = /\b(?:https?|wss?):\/\/\S+/i;
const ENV_LINE_RE = /^\s*[A-Z0-9_]+\s*=\s*.+/m;
const MNEMONIC_HINT_RE = /\b(?:mnemonic|seed phrase|recovery phrase)\b/i;
const SECRET_HINT_RE = /\b(?:private[_ -]?key|api[_ -]?key|secret|password|cookie|jwt|bearer|token)\b/i;
const DB_URL_RE = /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\/\S+/i;

function fail(category) {
  console.error("secret-risk");
  console.error(`unsafe field category: ${category}`);
  console.error("no value echoed");
  process.exit(1);
}

function failValidation(message) {
  console.error(`validation-fail: ${message}`);
  process.exit(1);
}

function secretCategory(value) {
  if (typeof value !== "string") return null;
  if (PRIVATE_KEY_RE.test(value)) return "private-key-like";
  if (JWT_RE.test(value)) return "jwt";
  if (DB_URL_RE.test(value)) return "db-url";
  if (URL_RE.test(value)) return "url-or-private-endpoint";
  if (ENV_LINE_RE.test(value)) return ".env-content";
  if (MNEMONIC_HINT_RE.test(value)) return "mnemonic";
  if (SECRET_HINT_RE.test(value)) return "secret-like-text";
  return null;
}

function assertNoSecrets(path, value) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecrets(`${path}[${index}]`, entry));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertNoSecrets(`${path}.${key}`, entry);
    }
    return;
  }
  const category = secretCategory(value);
  if (category) fail(`${path}:${category}`);
}

function isApprovalValue(value) {
  return value === true || value === false || value === "OWNER_APPROVAL_PENDING";
}

function assertTextOrPending(data, field, pendingValue = "PENDING") {
  const value = data[field];
  if (value === pendingValue) return;
  if (typeof value !== "string" || value.trim().length === 0) {
    failValidation(`${field} must be non-empty text or ${pendingValue}`);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  failValidation("usage: node scripts/validate-testnet-preflight-values.js <json-file>");
}

let data;
try {
  data = JSON.parse(fs.readFileSync(filePath, "utf8"));
} catch {
  failValidation("input file must be valid JSON");
}

assertNoSecrets("input", data);

for (const field of REQUIRED_FIELDS) {
  if (!Object.prototype.hasOwnProperty.call(data, field)) {
    failValidation(`${field} is required`);
  }
}

if (data.targetNetwork !== "BNB Smart Chain testnet") {
  failValidation("targetNetwork must equal BNB Smart Chain testnet");
}

if (data.chainId !== 97) {
  failValidation("chainId must equal 97");
}

if (data.initialAdmin !== "INITIAL_ADMIN_TBD" && !ADDRESS_RE.test(data.initialAdmin)) {
  failValidation("initialAdmin must be a public EVM address or INITIAL_ADMIN_TBD");
}

if (
  data.initialFeeRecipient !== "INITIAL_FEE_RECIPIENT_TBD" &&
  !ADDRESS_RE.test(data.initialFeeRecipient)
) {
  failValidation("initialFeeRecipient must be a public EVM address or INITIAL_FEE_RECIPIENT_TBD");
}

if (!isApprovalValue(data.deployCommandApproved)) {
  failValidation("deployCommandApproved must be true, false, or OWNER_APPROVAL_PENDING");
}

if (!isApprovalValue(data.deployerFundingHandledByOwner)) {
  failValidation("deployerFundingHandledByOwner must be true, false, or OWNER_APPROVAL_PENDING");
}

assertTextOrPending(data, "bscScanVerificationPlan", "VERIFICATION_PLAN_TBD");

for (const field of POLICY_FIELDS) {
  assertTextOrPending(data, field);
}

console.log("testnet preflight owner values validation passed");
console.log("format-only validation; no deployment approval");
