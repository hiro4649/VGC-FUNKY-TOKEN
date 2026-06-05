#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const EXPORTER_PATH = path.join(__dirname, "export-testnet-preflight-safe-artifact.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runExporter(args = []) {
  return spawnSync(process.execPath, [EXPORTER_PATH, ...args], { encoding: "utf8" });
}

function assertSafeJsonText(text) {
  for (const forbidden of [
    /private\s*key/i,
    /mnemonic/i,
    /https?:\/\/[^\s]*\b(bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s]*/i,
    /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i,
    /\.env\s*=/i,
    /0x0000000000000000000000000000000000000001/i,
    /0x0000000000000000000000000000000000000002/i,
    /###\s+Target network approval/i,
    /{\s*"targetNetwork"\s*:/,
  ]) {
    assert(!forbidden.test(text), "safe artifact JSON should not include forbidden content");
  }
}

function assertArtifact(artifact, rawText) {
  assert(artifact.schemaVersion === "1.0.0", "schemaVersion should be 1.0.0");
  assert(
    artifact.artifactType === "vgc-funky-token-testnet-preflight-safe-artifact",
    "artifactType should match",
  );
  assert(artifact.tokenIdentity.name === "FUNKY RAVE", "token name should match");
  assert(artifact.tokenIdentity.symbol === "FUNKY", "token symbol should match");

  for (const key of [
    "preTestnetStatusCommand",
    "ownerValuesValidator",
    "summaryGenerator",
    "issueParser",
    "reviewPacketBuilder",
    "aggregateToolingCheck",
    "e2eFixture",
    "safeOutputAudit",
  ]) {
    assert(artifact.tooling[key] === "present", `tooling ${key} should be present`);
  }

  for (const key of ["preTestnetStatus", "safeOutputAudit", "aggregateToolingCheck"]) {
    assert(artifact.checks[key] === "pass", `check ${key} should pass`);
  }

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

  assertSafeJsonText(rawText);
}

for (const args of [[], ["--pretty"]]) {
  const result = runExporter(args);
  assert(result.status === 0, "safe artifact exporter should exit 0");
  assertSafeJsonText(result.stdout);
  const artifact = JSON.parse(result.stdout);
  assertArtifact(artifact, result.stdout);
}

console.log("testnet preflight safe artifact exporter self-tests passed");
