#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const CHECKS_PATH = path.join(__dirname, "run-testnet-preflight-tooling-checks.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const result = spawnSync(process.execPath, [CHECKS_PATH], { encoding: "utf8" });
assert(result.status === 0, "tooling checks should exit 0");

const output = result.stdout;

for (const expected of [
  "- pre-testnet status: pass",
  "- pre-testnet status self-test: pass",
  "- owner-values validator sample: pass",
  "- owner-values validator self-test: pass",
  "- summary generator sample: pass",
  "- summary generator self-test: pass",
  "- issue parser self-test: pass",
  "- review packet builder sample: pass",
  "- review packet builder self-test: pass",
  "- contract tests: skipped unless --include-contract-checks",
  "- compile: skipped unless --include-contract-checks",
  "- targeted FunkyRave test: skipped unless --include-contract-checks",
  "no deployment approval",
  "no funded transaction approval",
  "no governance transaction approval",
  "no BscScan verification approval",
  "no runtime readiness approval",
  "no staging readiness approval",
  "no testnet readiness approval",
  "no mainnet readiness approval",
]) {
  assert(output.includes(expected), `tooling check output should include: ${expected}`);
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
  assert(!forbidden.test(output), "tooling check output should not include forbidden content");
}

console.log("testnet preflight tooling checks self-tests passed");
