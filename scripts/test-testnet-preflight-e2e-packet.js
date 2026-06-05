#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const sampleIssue = path.join(repoRoot, "test", "testnet-preflight-owner-issue.sample.md");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runScript(args) {
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function combinedOutput(result) {
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function assertNoUnsafeOutput(output, label) {
  for (const forbidden of [
    /private\s*key/i,
    /mnemonic/i,
    /https?:\/\//i,
    /\b[A-Z0-9_]*API[A-Z0-9_]*[_-]?KEY[A-Z0-9_]*\s*[:=]\s*\S+/i,
    /\.env\s*=/i,
    /0x0000000000000000000000000000000000000001/i,
    /0x0000000000000000000000000000000000000002/i,
  ]) {
    assert(!forbidden.test(output), `${label} should not include forbidden content`);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "funky-e2e-packet-"));
const tempJson = path.join(tempDir, "owner-values.json");

try {
  const parser = runScript(["scripts/parse-testnet-preflight-issue.js", sampleIssue]);
  assert(parser.status === 0, "parser should pass for sample issue");
  assertNoUnsafeOutput(combinedOutput(parser), "parser output");

  let parsed;
  assert.doesNotThrow = (fn, message) => {
    try {
      fn();
    } catch {
      throw new Error(message);
    }
  };
  assert.doesNotThrow(() => {
    parsed = JSON.parse(parser.stdout);
  }, "parser output should be valid JSON");
  assert(parsed.initialAdmin === "INITIAL_ADMIN_TBD", "parser should keep initialAdmin placeholder");
  assert(parsed.initialFeeRecipient === "INITIAL_FEE_RECIPIENT_TBD", "parser should keep initialFeeRecipient placeholder");

  fs.writeFileSync(tempJson, parser.stdout);

  const validator = runScript(["scripts/validate-testnet-preflight-values.js", tempJson]);
  assert(validator.status === 0, "validator should pass parser output");
  assertNoUnsafeOutput(combinedOutput(validator), "validator output");

  const summary = runScript(["scripts/generate-testnet-preflight-summary.js", tempJson]);
  assert(summary.status === 0, "summary generator should pass parser output");
  assertNoUnsafeOutput(combinedOutput(summary), "summary output");

  const packet = runScript(["scripts/build-testnet-preflight-review-packet.js", "--issue-body", sampleIssue]);
  assert(packet.status === 0, "review packet builder should pass sample issue");
  assertNoUnsafeOutput(combinedOutput(packet), "review packet output");

  for (const expected of [
    "Testnet preflight review packet",
    "validation result: pass",
    "summary result: pass",
    "no deployment approval",
    "no funded transaction approval",
    "no governance transaction approval",
    "no BscScan verification approval",
    "no runtime readiness approval",
    "no staging readiness approval",
    "no testnet readiness approval",
    "no mainnet readiness approval",
  ]) {
    assert(packet.stdout.includes(expected), `review packet should include: ${expected}`);
  }

  const sampleIssueBody = fs.readFileSync(sampleIssue, "utf8").trim();
  assert(!packet.stdout.includes(sampleIssueBody), "review packet should not include raw issue body");
  assert(!packet.stdout.includes(parser.stdout.trim()), "review packet should not include raw JSON");

  const tooling = runScript(["scripts/run-testnet-preflight-tooling-checks.js"]);
  assert(tooling.status === 0, "aggregate tooling check should pass");
  assertNoUnsafeOutput(combinedOutput(tooling), "aggregate tooling output");
} finally {
  if (fs.existsSync(tempJson)) fs.unlinkSync(tempJson);
  if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
}

assert(!fs.existsSync(tempJson), "temporary JSON should be removed");
assert(!fs.existsSync(tempDir), "temporary directory should be removed");

console.log("testnet preflight e2e packet fixture passed");
