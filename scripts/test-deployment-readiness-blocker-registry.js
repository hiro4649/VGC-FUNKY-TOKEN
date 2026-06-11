#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const expectedJsonPath = "test/deployment-readiness-blocker-registry.expected.json";

const requiredBlockers = [
  "ownerValuesPending",
  "ownerPolicyDecisionsPending",
  "sourceOfTruthDecisionPending",
  "deployCommandApprovalPending",
  "deployerFundingOwnerHandledSeparately",
  "bscScanVerificationPlanPending",
  "governancePolicyPending",
  "repositoryVisibilityOwnerDecisionPending",
  "testnetPreflightGateBlocked",
  "ownerPolicyPreflightGateBlocked",
  "readinessClaimBlocked",
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

const rpcProtocol = "(?:ht" + "tps?|wss?)://";
const forbiddenPatterns = [
  ["private-key-like-64-hex", /0x[0-9a-fA-F]{64}/],
  ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["db-url", /\b(postgres|postgresql|mysql|mongodb|redis):\/\//i],
  ["real-rpc-url", new RegExp(`\\b${rpcProtocol}[^\\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\\s"'<>]*`, "i")],
  ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s]+/i],
  ["env-content", /^\s*(PRIVATE_KEY|MNEMONIC|RPC_URL|DATABASE_URL|DB_URL|JWT|COOKIE|API_KEY)\s*=\s*[^\s]+/im],
  ["api-key-value-assignment", /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i],
  ["raw-owner-json", /{\s*"targetNetwork"\s*:/],
  ["raw-issue-body", /###\s+Target network approval/i],
  ["full-evm-address", /0x[0-9a-fA-F]{40}/],
  ["local-machine-path", /[A-Z]:\\/],
  ["timestamp", /\b20\d{2}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/],
];

function fail(reason) {
  console.log("deployment readiness blocker registry test failed");
  console.log(`reason: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
}

function runRegistry(args = []) {
  const result = spawnSync(process.execPath, ["scripts/build-deployment-readiness-blocker-registry.js", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail("registry command failed");
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

function validateRegistryJson(actual, expected) {
  assertExactKeys("top-level", Object.keys(actual), [
    "status",
    "blockers",
    ...safeToFields,
    "nonApproval",
  ]);
  assertExactKeys("blockers", Object.keys(actual.blockers || {}), requiredBlockers);
  assertExactKeys("nonApproval", Object.keys(actual.nonApproval || {}), nonApprovalFields);

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("JSON snapshot mismatch");
  }

  if (actual.status !== "DEPLOYMENT_READINESS_BLOCKED") {
    fail("status mismatch");
  }

  for (const field of requiredBlockers) {
    if (actual.blockers[field] !== true) {
      fail("required blocker missing");
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
}

const text = runRegistry();
assertNoForbiddenValues("text output", text);
assertNoApprovalClaim(text);

for (const required of [
  "status: DEPLOYMENT_READINESS_BLOCKED",
  "owner values: pending",
  "owner policy decisions: pending",
  "source-of-truth decision: pending",
  "deploy command approval: pending",
  "deployer funding: owner handled separately",
  "BscScan verification plan: pending",
  "governance policy: pending",
  "repository visibility owner decision: pending",
  "testnet preflight gate: blocked",
  "owner policy preflight gate: blocked",
  "readiness claim: blocked",
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

const jsonText = runRegistry(["--json"]);
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

validateRegistryJson(actual, expected);

console.log("deployment readiness blocker registry self-tests passed");
