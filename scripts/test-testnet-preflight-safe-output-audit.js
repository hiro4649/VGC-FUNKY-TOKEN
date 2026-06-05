#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const AUDIT_PATH = path.join(__dirname, "audit-testnet-preflight-safe-output.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const result = spawnSync(process.execPath, [AUDIT_PATH], { encoding: "utf8" });
assert(result.status === 0, "safe-output audit should exit 0");

const output = result.stdout;

for (const expected of [
  "- pre-testnet status output: pass",
  "- owner-values validator sample output: pass",
  "- summary generator sample output: pass",
  "- review packet builder sample output: pass",
  "- preflight tooling checks output: pass",
  "- e2e preflight packet fixture output: pass",
  "safe-output audit passed",
  "no deployment approval",
  "no funded transaction approval",
  "no governance transaction approval",
  "no BscScan verification approval",
  "no runtime readiness approval",
  "no staging readiness approval",
  "no testnet readiness approval",
  "no mainnet readiness approval",
]) {
  assert(output.includes(expected), `audit output should include: ${expected}`);
}

for (const forbidden of [
  /private\s*key/i,
  /mnemonic/i,
  /https?:\/\/[^\s]*\b(bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s]*/i,
  /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i,
  /\.env\s*=/i,
  /0x0000000000000000000000000000000000000001/i,
  /0x0000000000000000000000000000000000000002/i,
  /{\s*"targetNetwork"\s*:/,
  /###\s+Target network approval/i,
]) {
  assert(!forbidden.test(output), "audit output should not include forbidden content");
}

console.log("testnet preflight safe-output audit self-tests passed");
