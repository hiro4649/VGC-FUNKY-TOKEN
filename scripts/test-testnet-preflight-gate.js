#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const GATE_PATH = path.join(__dirname, "check-testnet-preflight-gate.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runGate(args = []) {
  return spawnSync(process.execPath, [GATE_PATH, ...args], { encoding: "utf8" });
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
    assert(!forbidden.test(text), "gate output should not include forbidden content");
  }
}

const textResult = runGate();
assert(textResult.status === 0, "text gate should exit 0 for expected blocked state");
const textOutput = textResult.stdout;
assert(textOutput.includes("status: BLOCKED_OWNER_DECISIONS_PENDING"), "text gate should be blocked");
for (const expected of [
  "BNB Smart Chain testnet approval",
  "initialAdmin",
  "initialFeeRecipient",
  "deploy command approval",
  "deployer wallet funding handled separately by owner",
  "BscScan verification command or plan",
  "multisig owner policy",
  "admin rotation policy",
  "feeRecipient policy",
  "TierUpdater deployer policy",
  "TierUpdater owner policy",
  "trusted factory policy",
  "initial DEX pair policy",
  "fee exemption policy",
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
  assert(textOutput.includes(expected), `text gate should include ${expected}`);
}
assertSafeText(textOutput);

const jsonResult = runGate(["--json"]);
assert(jsonResult.status === 0, "json gate should exit 0 for expected blocked state");
assertSafeText(jsonResult.stdout);
const payload = JSON.parse(jsonResult.stdout);
assert(payload.status === "BLOCKED_OWNER_DECISIONS_PENDING", "json gate should be blocked");
for (const key of [
  "safeToDeploy",
  "safeToVerifyBscScan",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToClaimReadiness",
]) {
  assert(payload[key] === false, `${key} should be false`);
}
assert(Array.isArray(payload.remainingOwnerDecisions), "remaining decisions should be an array");
assert(payload.remainingOwnerDecisions.length > 0, "remaining decisions should be non-empty");

console.log("testnet preflight gate self-tests passed");
