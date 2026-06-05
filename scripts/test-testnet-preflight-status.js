#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const STATUS_PATH = path.join(__dirname, "show-testnet-preflight-status.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const result = spawnSync(process.execPath, [STATUS_PATH], { encoding: "utf8" });
assert(result.status === 0, "status command should exit 0");

const output = result.stdout;
assert(output.includes("final ERC20 name: FUNKY RAVE"), "status output should include final name");
assert(output.includes("final ERC20 symbol: FUNKY"), "status output should include final symbol");

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
]) {
  assert(output.includes(expected), `status output should include owner decision: ${expected}`);
}

for (const expected of [
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
  assert(output.includes(expected), `status output should include boundary: ${expected}`);
}

for (const forbidden of [
  /private\s*key/i,
  /mnemonic/i,
  /https?:\/\//i,
  /\b[A-Z0-9_]*API[A-Z0-9_]*[_-]?KEY[A-Z0-9_]*\s*[:=]\s*\S+/i,
  /\.env\s*=/i,
  /0x0000000000000000000000000000000000000001/i,
  /0x0000000000000000000000000000000000000002/i,
]) {
  assert(!forbidden.test(output), "status output should not include forbidden content");
}

console.log("testnet preflight status self-tests passed");
