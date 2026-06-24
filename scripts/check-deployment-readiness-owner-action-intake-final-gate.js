#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const jsonMode = process.argv.includes("--json");
const sampleIssuePath = "test/deployment-readiness-owner-action-issue.sample.md";
const LEAF_CHILD_TIMEOUT_MS = 120000;
const AGGREGATE_CHILD_TIMEOUT_MS = 900000;
const CHILD_MAX_BUFFER = 1048576;

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

function fail(reason) {
  console.error("deployment readiness owner action intake final gate failed");
  console.error(`safe reason code: ${reason}`);
  console.error("no value echoed");
  process.exit(1);
}

function assert(condition, reason) {
  if (!condition) fail(reason);
}

function assertSafeText(text) {
  const forbidden = [
    ["raw-issue-body", /###\s+Target network approval/i],
    ["raw-owner-json", /{\s*"targetNetwork"\s*:/],
    ["full-evm-address", /0x[a-fA-F0-9]{40}/],
    ["private-key-like-64-hex", /0x[a-fA-F0-9]{64}/],
    ["rpc-url", /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i],
    ["api-key-assignment", /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i],
    ["env-assignment", /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m],
    ["db-url", /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\//i],
    ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
    ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s"'<>]+/i],
    ["local-machine-path", /[A-Z]:\\/],
    ["timestamp", /\b20\d{2}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/],
    ["approval-claim", /\b(deployment|funded transaction|governance transaction|BscScan verification|release|visibility|readiness)\s+approval\b/i],
  ];

  for (const [, pattern] of forbidden) {
    assert(!pattern.test(text), "unsafe-output-detected");
  }
}

function readReusableIntakeChecks() {
  const filePath = process.env.VGC_OWNER_ACTION_INTAKE_CHECKS_FILE;
  if (!filePath) return null;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    fail("reusable-intake-checks-json-parse-failed");
  }
  return parsed;
}

function timeoutForArgs(args) {
  return args[0] === "scripts/export-deployment-readiness-owner-action-intake-artifact.js" ||
    args[0] === "scripts/run-deployment-readiness-owner-action-intake-checks.js"
    ? AGGREGATE_CHILD_TIMEOUT_MS
    : LEAF_CHILD_TIMEOUT_MS;
}

function runJson(args) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    stdio: "pipe",
    timeout: timeoutForArgs(args),
    maxBuffer: CHILD_MAX_BUFFER,
  });
  if (result.error && result.error.code === "ETIMEDOUT") {
    fail(`deployment_readiness_child_timeout:${args[0]}`);
  }
  assertSafeText(`${result.stdout || ""}${result.stderr || ""}`);
  assert(result.status === 0, "source-command-failed");

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("source-json-parse-failed");
  }
}

function requireValue(value, expected, reason) {
  assert(value === expected, reason);
}

function requireFalse(source, field) {
  requireValue(source[field], false, `${field}-must-remain-false`);
}

function requireTrue(source, field) {
  requireValue(source[field], true, `${field}-must-remain-true`);
}

const artifact = runJson(["scripts/export-deployment-readiness-owner-action-intake-artifact.js"]);
const intakeChecks = readReusableIntakeChecks() || runJson(["scripts/run-deployment-readiness-owner-action-intake-checks.js", "--json"]);
const usingReusableIntakeChecks = Boolean(process.env.VGC_OWNER_ACTION_INTAKE_CHECKS_FILE);
const parser = usingReusableIntakeChecks
  ? { status: "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING" }
  : runJson(["scripts/parse-deployment-readiness-owner-action-issue.js", sampleIssuePath, "--json"]);
const reviewPacket = usingReusableIntakeChecks
  ? { status: "OWNER_ACTION_REVIEW_REQUIRED" }
  : runJson(["scripts/build-deployment-readiness-owner-action-review-packet.js", sampleIssuePath, "--json"]);
const ownerActionPacket = usingReusableIntakeChecks
  ? { status: "OWNER_ACTIONS_REQUIRED", nonApproval: Object.fromEntries(nonApprovalFields.map((field) => [field, true])) }
  : runJson(["scripts/build-deployment-readiness-owner-action-packet.js", "--json"]);
const blockerRegistry = usingReusableIntakeChecks
  ? { status: "DEPLOYMENT_READINESS_BLOCKED", nonApproval: Object.fromEntries(nonApprovalFields.map((field) => [field, true])) }
  : runJson(["scripts/build-deployment-readiness-blocker-registry.js", "--json"]);
const testnetPreflightGate = usingReusableIntakeChecks
  ? { status: "BLOCKED_OWNER_DECISIONS_PENDING" }
  : runJson(["scripts/check-testnet-preflight-gate.js", "--json"]);
const ownerPolicyPreflightGate = usingReusableIntakeChecks
  ? { status: "BLOCKED_OWNER_POLICY_DECISIONS_PENDING" }
  : runJson(["scripts/check-owner-policy-preflight-gate.js", "--json"]);

requireValue(artifact.status, "OWNER_ACTION_INTAKE_ARTIFACT_BLOCKED_OR_PENDING", "artifact-status-mismatch");
requireValue(intakeChecks.status, "OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING", "intake-checks-status-mismatch");
requireValue(parser.status, "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING", "parser-status-mismatch");
requireValue(reviewPacket.status, "OWNER_ACTION_REVIEW_REQUIRED", "review-packet-status-mismatch");
requireValue(ownerActionPacket.status, "OWNER_ACTIONS_REQUIRED", "owner-action-packet-status-mismatch");
requireValue(blockerRegistry.status, "DEPLOYMENT_READINESS_BLOCKED", "blocker-registry-status-mismatch");
requireValue(testnetPreflightGate.status, "BLOCKED_OWNER_DECISIONS_PENDING", "testnet-gate-status-mismatch");
requireValue(ownerPolicyPreflightGate.status, "BLOCKED_OWNER_POLICY_DECISIONS_PENDING", "owner-policy-gate-status-mismatch");

for (const field of safeToFields) {
  requireFalse(artifact, field);
  requireFalse(intakeChecks, field);
}

requireTrue(artifact, "requiresOwnerReview");
requireTrue(artifact, "requiresLaterExplicitDeployInstruction");
requireTrue(intakeChecks, "requiresOwnerReview");
requireTrue(intakeChecks, "requiresLaterExplicitDeployInstruction");
requireFalse(artifact, "containsSecrets");
requireFalse(artifact, "containsRealOwnerValues");
requireFalse(artifact, "unsafeInputAccepted");
requireFalse(artifact, "secretInputAccepted");
requireFalse(intakeChecks, "containsSecrets");
requireFalse(intakeChecks, "containsRealOwnerValues");

for (const field of nonApprovalFields) {
  requireTrue(artifact.nonApproval || {}, field);
  requireTrue(intakeChecks.nonApproval || {}, field);
  requireTrue(ownerActionPacket.nonApproval || {}, field);
  requireTrue(blockerRegistry.nonApproval || {}, field);
}

const output = {
  status: "OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED",
  artifactStatus: artifact.status,
  intakeChecksStatus: intakeChecks.status,
  parserStatus: parser.status,
  reviewPacketStatus: reviewPacket.status,
  ownerActionPacketStatus: ownerActionPacket.status,
  blockerRegistryStatus: blockerRegistry.status,
  testnetPreflightGateStatus: testnetPreflightGate.status,
  ownerPolicyPreflightGateStatus: ownerPolicyPreflightGate.status,
  safeToDeploy: false,
  safeToPerformFundedTransaction: false,
  safeToPerformGovernanceTransaction: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
  requiresOwnerReview: true,
  requiresLaterExplicitDeployInstruction: true,
  containsSecrets: false,
  containsRealOwnerValues: false,
  unsafeInputAccepted: false,
  secretInputAccepted: false,
  nonApproval: Object.fromEntries(nonApprovalFields.map((field) => [field, true])),
};

assertSafeText(JSON.stringify(output));

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} else {
  console.log("VGC-FUNKY-TOKEN deployment readiness owner action intake final gate");
  console.log(`status: ${output.status}`);
  console.log("artifact: blocked or pending");
  console.log("intake checks: blocked or pending");
  console.log("parser: blocked or pending");
  console.log("review packet: review required");
  console.log("owner action packet: owner actions required");
  console.log("blocker registry: deployment readiness blocked");
  console.log("testnet preflight gate: blocked");
  console.log("owner policy preflight gate: blocked");
  for (const field of safeToFields) {
    console.log(`${field}: false`);
  }
  console.log("owner review required: true");
  console.log("later explicit deploy instruction required: true");
  console.log("no deployment approval");
  console.log("no funded transaction approval");
  console.log("no governance transaction approval");
  console.log("no BscScan verification approval");
  console.log("no release approval");
  console.log("no public visibility approval");
  console.log("no runtime readiness approval");
  console.log("no staging readiness approval");
  console.log("no testnet readiness approval");
  console.log("no mainnet readiness approval");
}
