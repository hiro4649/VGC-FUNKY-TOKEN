#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedJsonPath = "test/source-of-truth-repository-decision.expected.json";

const forbiddenPatterns = [
  ["private-key-like-64-hex", /0x[0-9a-fA-F]{64}/],
  ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["db-url", /\b(postgres|postgresql|mysql|mongodb|redis):\/\//i],
  ["real-rpc-url", /https?:\/\/[^\s]*\b(bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s]*/i],
  ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s]+/i],
  ["env-content", /^\s*(PRIVATE_KEY|MNEMONIC|RPC_URL|DATABASE_URL|DB_URL|JWT|COOKIE|API_KEY)\s*=\s*[^\s]+/im],
  ["api-key-value-assignment", /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i],
  ["raw-owner-json", /{\s*"targetNetwork"\s*:/],
  ["raw-issue-body", /###\s+Target network approval/i],
  ["full-evm-address", /0x[0-9a-fA-F]{40}/],
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
  console.log("source-of-truth repository decision test failed");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function runDecision(args = []) {
  const result = spawnSync(process.execPath, ["scripts/build-source-of-truth-repository-decision.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail("decision command failed");
  }

  return result.stdout.replace(/\r\n/g, "\n").trimEnd();
}

function assertNoForbiddenValues(label, text) {
  for (const [, pattern] of forbiddenPatterns) {
    if (pattern.test(text)) {
      fail(`${label} contains forbidden output`);
    }
  }
}

function assertNoApprovalClaim(text) {
  const approvalPhrases = [
    "deployment approval",
    "funded transaction approval",
    "governance transaction approval",
    "BscScan verification approval",
    "runtime readiness approval",
    "staging readiness approval",
    "testnet readiness approval",
    "mainnet readiness approval",
  ];

  for (const phrase of approvalPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nonApprovalPattern = new RegExp(`\\b(no|non|not)[-\\s]+${escaped}\\b`, "gi");
    const normalized = text.replace(nonApprovalPattern, "");
    if (new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(normalized)) {
      fail("approval claim detected");
    }
  }
}

const text = runDecision();
assertNoForbiddenValues("text output", text);
assertNoApprovalClaim(text);

for (const required of [
  "status: SOURCE_OF_TRUTH_DECISION_PENDING",
  "canonical contract source repo: hiro4649/VGC-FUNKY-TOKEN",
  "deploy target repo: hiro4649/VGC-FUNKY-TOKEN",
  "duplicate contract source policy: prohibited",
  "pre-testnet migration: explicit owner approval required",
  "post-testnet migration: prohibited without formal policy",
  "BscScan source alignment: must match canonical source",
  "safeToDeploy: false",
  "safeToVerifyBscScan: false",
  "safeToClaimReadiness: false",
]) {
  if (!text.includes(required)) {
    fail("required text output missing");
  }
}

const jsonText = runDecision(["--json"]);
assertNoForbiddenValues("JSON output", jsonText);
assertNoApprovalClaim(jsonText);

let actual;
let expected;
try {
  actual = JSON.parse(jsonText);
  expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8"));
} catch {
  fail("JSON output could not be parsed");
}

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  fail("JSON snapshot mismatch");
}

if (actual.status !== "SOURCE_OF_TRUTH_DECISION_PENDING") {
  fail("status is not pending");
}

if (actual.canonicalContractSourceRepo !== "hiro4649/VGC-FUNKY-TOKEN") {
  fail("canonical source repo mismatch");
}

if (actual.deployTargetRepo !== "hiro4649/VGC-FUNKY-TOKEN") {
  fail("deploy target repo mismatch");
}

if (actual.duplicateContractSourcePolicy !== "prohibited") {
  fail("duplicate source policy mismatch");
}

if (actual.migrationAllowedBeforeTestnet !== "explicit_owner_approval_required") {
  fail("pre-testnet migration policy mismatch");
}

if (actual.migrationAllowedAfterTestnet !== "prohibited_without_formal_policy") {
  fail("post-testnet migration policy mismatch");
}

if (actual.bscScanSourceAlignmentPolicy !== "must_match_canonical_source") {
  fail("BscScan source alignment mismatch");
}

if (actual.safeToDeploy !== false || actual.safeToVerifyBscScan !== false || actual.safeToClaimReadiness !== false) {
  fail("safeTo flag is not false");
}

for (const field of nonApprovalFields) {
  if (actual.nonApproval?.[field] !== true) {
    fail("nonApproval field is not true");
  }
}

console.log("source-of-truth repository decision self-tests passed");
