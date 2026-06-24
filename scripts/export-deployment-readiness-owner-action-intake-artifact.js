#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");

const sampleIssuePath = "test/deployment-readiness-owner-action-issue.sample.md";
const LEAF_CHILD_TIMEOUT_MS = 120000;
const AGGREGATE_CHILD_TIMEOUT_MS = 900000;
const CHILD_MAX_BUFFER = 1048576;

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

const safeToFields = [
  "safeToDeploy",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToVerifyBscScan",
  "safeToClaimReadiness",
];

function fail(reason) {
  console.log("deployment readiness owner action intake artifact export failed");
  console.log(`safe reason code: ${reason}`);
  console.log("no value echoed");
  process.exit(1);
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
  return args[0] === "scripts/run-deployment-readiness-owner-action-intake-checks.js"
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

  if (result.status !== 0) {
    fail("source-command-failed");
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("source-json-parse-failed");
  }
}

function assertSafePayload(text) {
  const forbidden = [
    /###\s+Target network approval/i,
    /{\s*"targetNetwork"\s*:/,
    /0x[a-fA-F0-9]{40}/,
    /0x[a-fA-F0-9]{64}/,
    /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i,
    /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i,
    /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m,
    /\b(?:postgres|mysql|mongodb|redis):\/\//i,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    /\bcookie\s*[:=]\s*[^\s"'<>]+/i,
    /[A-Z]:\\/,
    /\b20\d{2}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      fail("unsafe-artifact-content");
    }
  }
}

function requireValue(value, expected, reason) {
  if (value !== expected) {
    fail(reason);
  }
}

const intakeChecks = readReusableIntakeChecks() || runJson(["scripts/run-deployment-readiness-owner-action-intake-checks.js", "--json"]);
const usingReusableIntakeChecks = Boolean(process.env.VGC_OWNER_ACTION_INTAKE_CHECKS_FILE);
const parser = usingReusableIntakeChecks
  ? { status: "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING" }
  : runJson(["scripts/parse-deployment-readiness-owner-action-issue.js", sampleIssuePath, "--json"]);
const reviewPacket = usingReusableIntakeChecks
  ? { status: "OWNER_ACTION_REVIEW_REQUIRED", pendingActionCount: 20, placeholderSafeActionCount: 20 }
  : runJson(["scripts/build-deployment-readiness-owner-action-review-packet.js", sampleIssuePath, "--json"]);
const ownerActionPacket = usingReusableIntakeChecks
  ? { status: "OWNER_ACTIONS_REQUIRED" }
  : runJson(["scripts/build-deployment-readiness-owner-action-packet.js", "--json"]);
const blockerRegistry = usingReusableIntakeChecks
  ? { status: "DEPLOYMENT_READINESS_BLOCKED" }
  : runJson(["scripts/build-deployment-readiness-blocker-registry.js", "--json"]);
const testnetPreflightGate = usingReusableIntakeChecks
  ? { status: "BLOCKED_OWNER_DECISIONS_PENDING" }
  : runJson(["scripts/check-testnet-preflight-gate.js", "--json"]);
const ownerPolicyPreflightGate = usingReusableIntakeChecks
  ? { status: "BLOCKED_OWNER_POLICY_DECISIONS_PENDING" }
  : runJson(["scripts/check-owner-policy-preflight-gate.js", "--json"]);

requireValue(intakeChecks.status, "OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING", "intake-status-mismatch");
requireValue(parser.status, "OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING", "parser-status-mismatch");
requireValue(reviewPacket.status, "OWNER_ACTION_REVIEW_REQUIRED", "review-packet-status-mismatch");
requireValue(ownerActionPacket.status, "OWNER_ACTIONS_REQUIRED", "owner-action-packet-status-mismatch");
requireValue(blockerRegistry.status, "DEPLOYMENT_READINESS_BLOCKED", "blocker-registry-status-mismatch");
requireValue(testnetPreflightGate.status, "BLOCKED_OWNER_DECISIONS_PENDING", "testnet-gate-status-mismatch");
requireValue(ownerPolicyPreflightGate.status, "BLOCKED_OWNER_POLICY_DECISIONS_PENDING", "owner-policy-gate-status-mismatch");

for (const field of safeToFields) {
  requireValue(intakeChecks[field], false, "safe-to-flag-mismatch");
}

for (const field of nonApprovalFields) {
  requireValue(intakeChecks.nonApproval && intakeChecks.nonApproval[field], true, "non-approval-mismatch");
}

const requiredCheckCount = Object.keys(intakeChecks.checks || {}).length;
const passedCheckCount = Object.values(intakeChecks.checks || {}).filter((check) => check.status === "pass").length;
const blockedGateCount = Object.values(intakeChecks.checks || {}).filter((check) => check.status === "blocked").length;

const artifact = {
  schemaName: "VGC_DEPLOYMENT_READINESS_OWNER_ACTION_INTAKE_ARTIFACT",
  schemaVersion: 1,
  status: "OWNER_ACTION_INTAKE_ARTIFACT_BLOCKED_OR_PENDING",
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
  containsSecrets: false,
  containsRealOwnerValues: false,
  unsafeInputAccepted: false,
  secretInputAccepted: false,
  requiresOwnerReview: true,
  requiresLaterExplicitDeployInstruction: true,
  nonApproval: Object.fromEntries(nonApprovalFields.map((field) => [field, true])),
  summary: {
    pendingOwnerActionCount: reviewPacket.pendingActionCount,
    placeholderSafeActionCount: reviewPacket.placeholderSafeActionCount,
    requiredCheckCount,
    passedCheckCount,
    blockedGateCount,
  },
};

const artifactText = JSON.stringify(artifact);
assertSafePayload(artifactText);

const pretty = process.argv.includes("--pretty");
console.log(pretty ? JSON.stringify(artifact, null, 2) : artifactText);
