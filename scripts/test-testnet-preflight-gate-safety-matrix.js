#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const GATE_PATH = path.join(__dirname, "check-testnet-preflight-gate.js");
const EXPORTER_PATH = path.join(__dirname, "export-testnet-preflight-safe-artifact.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runNode(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

function assertSafeOutput(output) {
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
    assert(!forbidden.test(output), "gate matrix output should not include forbidden content");
  }

  for (const line of output.split(/\r?\n/)) {
    const normalized = line.trim().toLowerCase();
    const negativeBoundary =
      normalized.startsWith("no ") ||
      normalized.startsWith("non-") ||
      normalized.startsWith("not ");
    if (!negativeBoundary) {
      assert(!/\bdeployment approval\b/.test(normalized), "deployment approval claim detected");
      assert(!/\breadiness approval\b/.test(normalized), "readiness approval claim detected");
    }
  }
}

function runGate(args, expectedStatus, expectedExit) {
  const result = runNode(GATE_PATH, args);
  assert(result.status === expectedExit, `${expectedStatus} exit code mismatch`);
  const output = `${result.stdout}\n${result.stderr}`;
  assert(output.includes(expectedStatus), `${expectedStatus} status missing`);
  assertSafeOutput(output);
  return result;
}

function writeArtifact(dir, artifact, name) {
  const filePath = path.join(dir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
  return filePath;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const exporter = runNode(EXPORTER_PATH);
assert(exporter.status === 0, "base safe artifact exporter should pass");
const baseArtifact = JSON.parse(exporter.stdout);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vgc-preflight-gate-"));

try {
  runGate([], "BLOCKED_OWNER_DECISIONS_PENDING", 0);

  const partialArtifact = clone(baseArtifact);
  partialArtifact.ownerDecisionStatus.bnbSmartChainTestnetApproval = "approved";
  partialArtifact.ownerDecisionStatus.initialAdmin = "provided";
  runGate(
    ["--artifact", writeArtifact(tempDir, partialArtifact, "partial")],
    "BLOCKED_OWNER_DECISIONS_INCOMPLETE",
    0,
  );

  const completeArtifact = clone(baseArtifact);
  for (const key of Object.keys(completeArtifact.ownerDecisionStatus)) {
    completeArtifact.ownerDecisionStatus[key] = key.toLowerCase().includes("approval")
      ? "approved"
      : "provided";
  }
  const completePath = writeArtifact(tempDir, completeArtifact, "complete");
  runGate(
    ["--artifact", completePath],
    "BLOCKED_EXPLICIT_DEPLOY_INSTRUCTION_REQUIRED",
    0,
  );

  const approvalClaimArtifact = clone(baseArtifact);
  approvalClaimArtifact.nonApproval.deployment = false;
  runGate(
    ["--artifact", writeArtifact(tempDir, approvalClaimArtifact, "approval-claim")],
    "FAIL_UNSAFE_APPROVAL_CLAIM",
    1,
  );

  const unsafeActionArtifact = clone(baseArtifact);
  unsafeActionArtifact.safety.deployScriptUsed = true;
  runGate(
    ["--artifact", writeArtifact(tempDir, unsafeActionArtifact, "unsafe-action")],
    "FAIL_UNSAFE_ACTION",
    1,
  );

  const wrongNameArtifact = clone(baseArtifact);
  wrongNameArtifact.tokenIdentity.name = "WRONG";
  runGate(
    ["--artifact", writeArtifact(tempDir, wrongNameArtifact, "wrong-name")],
    "FAIL_TOKEN_IDENTITY_MISMATCH",
    1,
  );

  const wrongSymbolArtifact = clone(baseArtifact);
  wrongSymbolArtifact.tokenIdentity.symbol = "WRONG";
  runGate(
    ["--artifact", writeArtifact(tempDir, wrongSymbolArtifact, "wrong-symbol")],
    "FAIL_TOKEN_IDENTITY_MISMATCH",
    1,
  );

  const wrongSourceArtifact = clone(baseArtifact);
  wrongSourceArtifact.sourceContract = "contracts/funky/other.sol";
  runGate(
    ["--artifact", writeArtifact(tempDir, wrongSourceArtifact, "wrong-source")],
    "FAIL_SOURCE_CONTRACT_MISMATCH",
    1,
  );

  const wrongTypeArtifact = clone(baseArtifact);
  wrongTypeArtifact.artifactType = "wrong-artifact-type";
  runGate(
    ["--artifact", writeArtifact(tempDir, wrongTypeArtifact, "wrong-type")],
    "FAIL_ARTIFACT_SCHEMA_MISMATCH",
    1,
  );

  const malformedPath = path.join(tempDir, "malformed.json");
  fs.writeFileSync(malformedPath, "{not-json");
  runGate(["--artifact", malformedPath], "validation-fail", 1);

  const jsonResult = runGate(
    ["--artifact", completePath, "--json"],
    "BLOCKED_EXPLICIT_DEPLOY_INSTRUCTION_REQUIRED",
    0,
  );
  const payload = JSON.parse(jsonResult.stdout);
  for (const key of [
    "safeToDeploy",
    "safeToVerifyBscScan",
    "safeToPerformFundedTransaction",
    "safeToPerformGovernanceTransaction",
    "safeToClaimReadiness",
  ]) {
    assert(payload[key] === false, `${key} should stay false`);
  }

  console.log("testnet preflight gate safety matrix passed");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
