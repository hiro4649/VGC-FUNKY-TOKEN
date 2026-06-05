#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");
const EXPORTER_PATH = path.join(__dirname, "export-testnet-preflight-safe-artifact.js");
const SNAPSHOT_PATH = path.join(REPO_ROOT, "test", "testnet-preflight-safe-artifact.expected.json");

const EXPECTED_KEYS = {
  root: [
    "schemaVersion",
    "artifactType",
    "repositoryScope",
    "tokenIdentity",
    "sourceContract",
    "tooling",
    "checks",
    "ownerDecisionStatus",
    "nonApproval",
    "safety",
  ],
  tokenIdentity: ["name", "symbol"],
  tooling: [
    "preTestnetStatusCommand",
    "ownerValuesValidator",
    "summaryGenerator",
    "issueParser",
    "reviewPacketBuilder",
    "aggregateToolingCheck",
    "e2eFixture",
    "safeOutputAudit",
  ],
  checks: ["preTestnetStatus", "safeOutputAudit", "aggregateToolingCheck"],
  ownerDecisionStatus: [
    "bnbSmartChainTestnetApproval",
    "initialAdmin",
    "initialFeeRecipient",
    "deployCommandApproval",
    "deployerWalletFunding",
    "bscScanVerificationPlan",
    "multisigOwnerPolicy",
    "adminRotationPolicy",
    "feeRecipientPolicy",
    "tierUpdaterDeployerPolicy",
    "tierUpdaterOwnerPolicy",
    "trustedFactoryPolicy",
    "initialDexPairPolicy",
    "feeExemptionPolicy",
  ],
  nonApproval: [
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
  ],
  safety: [
    "rawOwnerJsonPrinted",
    "rawIssueBodyPrinted",
    "fullPublicAddressesPrinted",
    "secretsPrinted",
    "rpcUsed",
    "bscScanUsed",
    "deployScriptUsed",
    "configureScriptUsed",
    "fundedTransactionPerformed",
    "governanceTransactionPerformed",
  ],
};

function fail(message) {
  console.error(`validation-fail: ${message}`);
  console.error("no value echoed");
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runExporter(args = []) {
  const result = spawnSync(process.execPath, [EXPORTER_PATH, ...args], { encoding: "utf8" });
  if (result.status !== 0) fail("safe artifact exporter failed");
  return result.stdout;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label} did not produce valid JSON`);
  }
}

function assertNoUnexpectedKeys(object, allowedKeys, label) {
  const actual = Object.keys(object).sort();
  const expected = [...allowedKeys].sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} keys changed`);
}

function assertSafeText(text) {
  for (const forbidden of [
    /private\s*key/i,
    /mnemonic/i,
    /https?:\/\/[^\s]*\b(bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s]*/i,
    /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i,
    /\.env\s*=/i,
    /0x[0-9a-fA-F]{40}/,
    /###\s+Target network approval/i,
    /{\s*"targetNetwork"\s*:/,
  ]) {
    assert(!forbidden.test(text), "artifact output contained forbidden content");
  }
}

function assertShape(artifact) {
  assertNoUnexpectedKeys(artifact, EXPECTED_KEYS.root, "root");
  assertNoUnexpectedKeys(artifact.tokenIdentity, EXPECTED_KEYS.tokenIdentity, "tokenIdentity");
  assertNoUnexpectedKeys(artifact.tooling, EXPECTED_KEYS.tooling, "tooling");
  assertNoUnexpectedKeys(artifact.checks, EXPECTED_KEYS.checks, "checks");
  assertNoUnexpectedKeys(
    artifact.ownerDecisionStatus,
    EXPECTED_KEYS.ownerDecisionStatus,
    "ownerDecisionStatus",
  );
  assertNoUnexpectedKeys(artifact.nonApproval, EXPECTED_KEYS.nonApproval, "nonApproval");
  assertNoUnexpectedKeys(artifact.safety, EXPECTED_KEYS.safety, "safety");
}

function assertInvariants(artifact) {
  for (const [key, value] of Object.entries(artifact.ownerDecisionStatus)) {
    const allowed = value === "pending" || value === "handled_separately_by_owner_pending";
    assert(allowed, `owner decision ${key} should remain pending`);
  }

  for (const [key, value] of Object.entries(artifact.nonApproval)) {
    assert(value === true, `nonApproval ${key} should be true`);
  }

  for (const [key, value] of Object.entries(artifact.safety)) {
    assert(value === false, `safety ${key} should be false`);
  }
}

function assertStableFields(actual, expected) {
  assertShape(actual);
  assertShape(expected);
  assert(JSON.stringify(actual) === JSON.stringify(expected), "safe artifact snapshot changed");
  assertInvariants(actual);
}

const expectedText = fs.readFileSync(SNAPSHOT_PATH, "utf8");
assertSafeText(expectedText);
const expected = parseJson(expectedText, "snapshot");

const compactText = runExporter();
assertSafeText(compactText);
const compact = parseJson(compactText, "compact exporter");
assertStableFields(compact, expected);

const prettyText = runExporter(["--pretty"]);
assertSafeText(prettyText);
const pretty = parseJson(prettyText, "pretty exporter");
assertStableFields(pretty, expected);

console.log("testnet preflight safe artifact snapshot passed");
