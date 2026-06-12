#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedTextPath = "test/deployment-readiness-owner-action-packet.expected.txt";
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
  console.log("deployment readiness owner action packet snapshot test failed");
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
const expectedText = fs.readFileSync(expectedTextPath, "utf8").replace(/\r\n/g, "\n").trimEnd();
if (text !== expectedText) {
  fail("text snapshot mismatch");
}
assertNoForbiddenValues("text output", text);
assertNoApprovalClaim(text);

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

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  fail("JSON snapshot mismatch");
}

assertExactKeys("top-level", Object.keys(actual), [
  "status",
  "ownerActions",
  ...safeToFields,
  "nonApproval",
]);
assertExactKeys("ownerActions", Object.keys(actual.ownerActions || {}), requiredOwnerActions);
assertExactKeys("nonApproval", Object.keys(actual.nonApproval || {}), nonApprovalFields);

if (actual.status !== "OWNER_ACTIONS_REQUIRED") {
  fail("status mismatch");
}

for (const action of requiredOwnerActions) {
  const value = actual.ownerActions[action];
  if (!value || value.status !== "pending_owner_action") {
    fail("owner action status mismatch");
  }
  if (value.unsafeInputAccepted !== false || value.secretInputAccepted !== false) {
    fail("owner action safety boundary mismatch");
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

console.log("deployment readiness owner action packet snapshot tests passed");
