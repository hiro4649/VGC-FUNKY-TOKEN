#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const VALIDATOR_PATH = path.join(__dirname, "validate-testnet-preflight-values.js");

const PRIVATE_KEY_RE = /\b0x[0-9a-fA-F]{64}\b|\b[0-9a-fA-F]{64}\b/;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const DB_URL_RE = /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\/\S+/i;
const URL_RE = /\b(?:https?|wss?):\/\/[^\s"'<>]+/i;
const RPC_HOST_HINT_RE = /\b(?:rpc|alchemy|infura|quicknode|nodereal|ankr|moralis|getblock|chainstack)\b/i;
const ENV_LINE_RE = /^\s*[A-Z0-9_]+\s*=\s*.+/m;
const KEY_ASSIGNMENT_RE =
  /\b(?:private[_ -]?key|api[_ -]?key|secret|password|cookie)\s*[:=]\s*\S+/i;
const MNEMONIC_HINT_RE = /\b(?:mnemonic|seed phrase|recovery phrase)\s*[:=]\s*\S+/i;

const FIELD_LABELS = {
  targetNetworkApproval: "Target network approval",
  initialAdmin: "initialAdmin public EVM address",
  initialFeeRecipient: "initialFeeRecipient public EVM address",
  deployCommandApproval: "deploy command approval",
  deployerFunding: "deployer wallet funding confirmation",
  bscScanVerificationPlan: "BscScan verification plan",
  multisigOwnerPolicy: "multisig owner policy",
  adminRotationPolicy: "admin rotation policy",
  feeRecipientPolicy: "feeRecipient policy",
  tierUpdaterDeployerPolicy: "TierUpdater deployer policy",
  tierUpdaterOwnerPolicy: "TierUpdater owner policy",
  trustedFactoryPolicy: "trusted factory policy",
  initialDexPairPolicy: "initial DEX pair policy",
  feeExemptionPolicy: "fee exemption policy",
};

function failSecret(category) {
  console.error("secret-risk");
  console.error(`unsafe field category: ${category}`);
  console.error("no value echoed");
  process.exit(1);
}

function failValidation(message) {
  console.error(`validation-fail: ${message}`);
  console.error("no value echoed");
  process.exit(1);
}

function secretCategory(value) {
  if (PRIVATE_KEY_RE.test(value)) return "private-key-like";
  if (JWT_RE.test(value)) return "jwt";
  if (DB_URL_RE.test(value)) return "db-url";
  if (KEY_ASSIGNMENT_RE.test(value)) return "key-assignment";
  if (MNEMONIC_HINT_RE.test(value)) return "mnemonic";
  if (ENV_LINE_RE.test(value)) return ".env-content";
  if (URL_RE.test(value) && RPC_HOST_HINT_RE.test(value)) return "rpc-endpoint";
  return null;
}

function normalizeLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseSections(body) {
  const headingRe = /^###\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(headingRe)];
  if (matches.length === 0) {
    failValidation("issue body format not recognized");
  }

  const sections = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const label = match[1].trim();
    const start = match.index + match[0].length;
    const end = next ? next.index : body.length;
    sections.set(normalizeLabel(label), body.slice(start, end).trim());
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

function firstLine(value) {
  return cleanValue(value).split(/\r?\n/).find(Boolean) || "";
}

function getField(sections, label, defaultValue, multiLine = false) {
  const section = sections.get(normalizeLabel(label));
  if (!section) return defaultValue;
  const value = multiLine ? cleanValue(section) : firstLine(section);
  return value || defaultValue;
}

function approvalValue(value) {
  if (value === "APPROVED") return true;
  if (value === "NOT_APPROVED") return false;
  if (value === "OWNER_APPROVAL_PENDING") return "OWNER_APPROVAL_PENDING";
  failValidation("issue body format not recognized");
}

function fundingValue(value) {
  if (value === "HANDLED_SEPARATELY_BY_OWNER") return true;
  if (value === "NOT_APPROVED") return false;
  if (value === "OWNER_APPROVAL_PENDING") return "OWNER_APPROVAL_PENDING";
  failValidation("issue body format not recognized");
}

function validateOutput(data) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "funky-issue-parser-"));
  const tempJson = path.join(tempDir, "owner-values.json");
  try {
    fs.writeFileSync(tempJson, JSON.stringify(data, null, 2));
    const result = spawnSync(process.execPath, [VALIDATOR_PATH, tempJson], { encoding: "utf8" });
    if (result.status !== 0) {
      const safeLines = `${result.stderr || ""}${result.stdout || ""}`
        .split(/\r?\n/)
        .filter((line) =>
          /^(secret-risk|unsafe field category:|no value echoed|validation-fail:)/.test(line),
        );
      if (safeLines.length > 0) {
        console.error(safeLines.join("\n"));
      } else {
        failValidation("issue body format not recognized");
      }
      process.exit(result.status || 1);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const filePath = process.argv[2];
if (!filePath) {
  failValidation("usage: node scripts/parse-testnet-preflight-issue.js <issue-body-file>");
}

let issueBody;
try {
  issueBody = fs.readFileSync(filePath, "utf8");
} catch {
  failValidation("issue body format not recognized");
}

const category = secretCategory(issueBody);
if (category) failSecret(category);

const sections = parseSections(issueBody);
const targetApproval = getField(
  sections,
  FIELD_LABELS.targetNetworkApproval,
  "OWNER_APPROVAL_PENDING",
);
const deployApproval = getField(sections, FIELD_LABELS.deployCommandApproval, targetApproval);

const output = {
  targetNetwork: "BNB Smart Chain testnet",
  chainId: 97,
  initialAdmin: getField(sections, FIELD_LABELS.initialAdmin, "INITIAL_ADMIN_TBD"),
  initialFeeRecipient: getField(
    sections,
    FIELD_LABELS.initialFeeRecipient,
    "INITIAL_FEE_RECIPIENT_TBD",
  ),
  deployCommandApproved: approvalValue(deployApproval),
  deployerFundingHandledByOwner: fundingValue(
    getField(sections, FIELD_LABELS.deployerFunding, "OWNER_APPROVAL_PENDING"),
  ),
  bscScanVerificationPlan: getField(
    sections,
    FIELD_LABELS.bscScanVerificationPlan,
    "VERIFICATION_PLAN_TBD",
    true,
  ),
  multisigOwnerPolicy: getField(sections, FIELD_LABELS.multisigOwnerPolicy, "PENDING", true),
  adminRotationPolicy: getField(sections, FIELD_LABELS.adminRotationPolicy, "PENDING", true),
  feeRecipientPolicy: getField(sections, FIELD_LABELS.feeRecipientPolicy, "PENDING", true),
  tierUpdaterDeployerPolicy: getField(
    sections,
    FIELD_LABELS.tierUpdaterDeployerPolicy,
    "PENDING",
    true,
  ),
  tierUpdaterOwnerPolicy: getField(sections, FIELD_LABELS.tierUpdaterOwnerPolicy, "PENDING", true),
  trustedFactoryPolicy: getField(sections, FIELD_LABELS.trustedFactoryPolicy, "PENDING", true),
  initialDexPairPolicy: getField(sections, FIELD_LABELS.initialDexPairPolicy, "PENDING", true),
  feeExemptionPolicy: getField(sections, FIELD_LABELS.feeExemptionPolicy, "PENDING", true),
};

validateOutput(output);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
