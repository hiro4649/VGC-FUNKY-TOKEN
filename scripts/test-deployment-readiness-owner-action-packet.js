#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedJsonPath = "test/deployment-readiness-owner-action-packet.expected.json";

const requiredOwnerActions = [
  "approveBscTestnetUse",
  "provideInitialAdmin",
  "provideInitialFeeRecipient",
  "approveDeployCommand",
  "handleDeployerFundingSeparately",
  "provideBscScanVerificationPlan",
  "resolveMultisigPolicy",
  "resolveAdminRotationPolicy",
  "resolveFeeRecipientPolicy",
  "resolveTierUpdaterPolicy",
  "resolveTrustedFactoryPolicy",
  "resolvePairPolicy",
  "resolveFeeExemptionPolicy",
  "resolveFeeMaxPolicy",
  "resolveFeeDenominatorPolicy",
  "resolveSellLpAddFeeBehaviorPolicy",
  "resolveTierUpdaterLastRemovalPolicy",
  "resolveFeeExemptionProposerApproverPolicy",
  "resolveTierUpdaterCodePresenceValidationPolicy",
  "resolveSourceOfTruthRepositoryDecision",
  "resolveRepositoryVisibilityDecision",
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

const networkProtocol = "(?:ht" + "tps?|wss?)://";
const forbiddenPatterns = [
  ["private-key-like-64-hex", /0x[0-9a-fA-F]{64}/],
  ["full-evm-address", /0x[0-9a-fA-F]{40}/],
  ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["db-url", /\b(postgres|postgresql|mysql|mongodb|redis):\/\//i],
  ["real-rpc-url", new RegExp(`\\b${networkProtocol}[^\\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\\s"'<>]*`, "i")],
  ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s]+/i],
  ["env-content", /^\s*(PRIVATE_KEY|MNEMONIC|RPC_URL|DATABASE_URL|DB_URL|JWT|COOKIE|API_KEY)\s*=\s*[^\s]+/im],
  ["api-key-value-assignment", /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i],
  ["raw-owner-json", /{\s*"targetNetwork"\s*:/],
  ["raw-issue-body", /###\s+Target network approval/i],
  ["local-machine-path", /[A-Z]:\\/],
  ["timestamp", /\b20\d{2}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/],
];

function fail(reason) {
  console.log("deployment readiness owner action packet test failed");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function runPacket(args = []) {
  const result = spawnSync(process.execPath, ["scripts/build-deployment-readiness-owner-action-packet.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail("owner action packet command failed");
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

function assertExactKeys(label, actualKeys, expectedKeys) {
  const actual = [...actualKeys].sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} keys mismatch`);
  }
}

const text = runPacket();
assertNoForbiddenValues("text output", text);
assertNoApprovalClaim(text);

for (const required of [
  "status: OWNER_ACTIONS_REQUIRED",
  "approve BNB Smart Chain testnet use: pending owner action",
  "provide initialAdmin: pending owner action",
  "provide initialFeeRecipient: pending owner action",
  "approve deploy command: pending owner action",
  "deployer funding: owner handled separately",
  "BscScan verification plan: pending owner action",
  "multisig policy: pending owner action",
  "admin rotation policy: pending owner action",
  "feeRecipient policy: pending owner action",
  "TierUpdater policy: pending owner action",
  "trusted factory policy: pending owner action",
  "pair policy: pending owner action",
  "fee exemption policy: pending owner action",
  "fee max policy: pending owner action",
  "fee denominator policy: pending owner action",
  "sell/LP-add fee behavior policy: pending owner action",
  "tier updater last-removal policy: pending owner action",
  "fee exemption proposer/approver policy: pending owner action",
  "tier updater code-presence validation policy: pending owner action",
  "source-of-truth repository decision: pending owner action",
  "repository visibility decision: pending owner action",
  "safeToDeploy: false",
  "safeToPerformFundedTransaction: false",
  "safeToPerformGovernanceTransaction: false",
  "safeToVerifyBscScan: false",
  "safeToClaimReadiness: false",
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
]) {
  if (!text.includes(required)) {
    fail("required text output missing");
  }
}

const jsonText = runPacket(["--json"]);
assertNoForbiddenValues("JSON output", jsonText);
assertNoApprovalClaim(jsonText);

let actual;
let expected;
try {
  actual = JSON.parse(jsonText);
  expected = JSON.parse(fs.readFileSync(expectedJsonPath, "utf8"));
} catch {
  fail("JSON parse failed");
}

assertExactKeys("top-level", Object.keys(actual), [
  "status",
  "ownerActions",
  ...safeToFields,
  "nonApproval",
]);
assertExactKeys("ownerActions", Object.keys(actual.ownerActions || {}), requiredOwnerActions);
assertExactKeys("nonApproval", Object.keys(actual.nonApproval || {}), nonApprovalFields);

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  fail("JSON snapshot mismatch");
}

if (actual.status !== "OWNER_ACTIONS_REQUIRED") {
  fail("status mismatch");
}

for (const action of requiredOwnerActions) {
  const value = actual.ownerActions[action];
  if (!value || value.status !== "pending_owner_action") {
    fail("owner action status mismatch");
  }
  if (value.inputType !== "owner_decision_or_public_value") {
    fail("owner action input type mismatch");
  }
  if (value.unsafeInputAccepted !== false || value.secretInputAccepted !== false) {
    fail("owner action safety boundary mismatch");
  }
  if (typeof value.safeSummary !== "string" || !value.safeSummary) {
    fail("owner action safe summary missing");
  }
}

for (const field of safeToFields) {
  if (actual[field] !== false) {
    fail("safeTo flag mismatch");
  }
}

for (const field of nonApprovalFields) {
  if (actual.nonApproval[field] !== true) {
    fail("nonApproval boundary mismatch");
  }
}

console.log("deployment readiness owner action packet self-tests passed");
