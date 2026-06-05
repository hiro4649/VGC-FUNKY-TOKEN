#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PARSER_PATH = path.join(__dirname, "parse-testnet-preflight-issue.js");
const VALIDATOR_PATH = path.join(__dirname, "validate-testnet-preflight-values.js");
const SUMMARY_PATH = path.join(__dirname, "generate-testnet-preflight-summary.js");

function safeFailureFrom(result, fallbackPrefix = "validation-fail") {
  const safeLines = `${result.stderr || ""}${result.stdout || ""}`
    .split(/\r?\n/)
    .filter((line) =>
      /^(secret-risk|unsafe field category:|no value echoed|validation-fail:|summary-fail:)/.test(
        line,
      ),
    );
  if (safeLines.length > 0) return safeLines.join("\n");
  return `${fallbackPrefix}: preflight review packet failed\nno value echoed`;
}

function failSafe(message) {
  console.error(message);
  process.exit(1);
}

function runStep(scriptPath, args, fallbackPrefix) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    failSafe(safeFailureFrom(result, fallbackPrefix));
  }
  return result.stdout;
}

function parseArgs(argv) {
  if (argv.length !== 2) {
    failSafe("validation-fail: provide exactly one input mode\nno value echoed");
  }
  if (argv[0] !== "--json" && argv[0] !== "--issue-body") {
    failSafe("validation-fail: input mode must be --json or --issue-body\nno value echoed");
  }
  return { mode: argv[0], filePath: argv[1] };
}

function buildPacket(inputType, jsonPath) {
  runStep(VALIDATOR_PATH, [jsonPath], "validation-fail");
  const summary = runStep(SUMMARY_PATH, [jsonPath], "summary-fail");

  console.log("Testnet preflight review packet");
  console.log(`input type: ${inputType}`);
  console.log("validation result: pass");
  console.log("summary result: pass");
  console.log("safe summary output:");
  process.stdout.write(summary);
  if (!summary.endsWith("\n")) console.log("");
  console.log("no deployment approval");
  console.log("no funded transaction approval");
  console.log("no governance transaction approval");
  console.log("no BscScan verification approval");
  console.log("no runtime readiness approval");
  console.log("no staging readiness approval");
  console.log("no testnet readiness approval");
  console.log("no mainnet readiness approval");
  console.log("next action: wait for explicit owner instruction");
}

const { mode, filePath } = parseArgs(process.argv.slice(2));

if (mode === "--json") {
  buildPacket("json", filePath);
} else {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "funky-review-packet-"));
  const tempJson = path.join(tempDir, "owner-values.json");
  try {
    const parserOutput = runStep(PARSER_PATH, [filePath], "validation-fail");
    fs.writeFileSync(tempJson, parserOutput);
    buildPacket("issue-body", tempJson);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
