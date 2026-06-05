#!/usr/bin/env node

const { spawnSync } = require("child_process");

const includeContractChecks = process.argv.slice(2).includes("--include-contract-checks");

if (process.argv.slice(2).some((arg) => arg !== "--include-contract-checks")) {
  console.log("validation-fail: unsupported argument");
  console.log("no value echoed");
  process.exit(1);
}

const fastChecks = [
  {
    label: "pre-testnet status",
    command: [process.execPath, ["scripts/show-testnet-preflight-status.js"]],
  },
  {
    label: "pre-testnet status self-test",
    command: [process.execPath, ["scripts/test-testnet-preflight-status.js"]],
  },
  {
    label: "owner-values validator sample",
    command: [process.execPath, ["scripts/validate-testnet-preflight-values.js", "test/testnet-preflight-values.sample.json"]],
  },
  {
    label: "owner-values validator self-test",
    command: [process.execPath, ["scripts/test-testnet-preflight-validator.js"]],
  },
  {
    label: "summary generator sample",
    command: [process.execPath, ["scripts/generate-testnet-preflight-summary.js", "test/testnet-preflight-values.sample.json"]],
  },
  {
    label: "summary generator self-test",
    command: [process.execPath, ["scripts/test-testnet-preflight-summary-generator.js"]],
  },
  {
    label: "issue parser self-test",
    command: [process.execPath, ["scripts/test-testnet-preflight-issue-parser.js"]],
  },
  {
    label: "review packet builder sample",
    command: [process.execPath, ["scripts/build-testnet-preflight-review-packet.js", "--json", "test/testnet-preflight-values.sample.json"]],
  },
  {
    label: "review packet builder self-test",
    command: [process.execPath, ["scripts/test-testnet-preflight-review-packet-builder.js"]],
  },
];

const contractChecks = [
  {
    label: "contract tests",
    command: [process.platform === "win32" ? "npm.cmd" : "npm", ["--prefix", "contracts", "test"]],
  },
  {
    label: "compile",
    command: [process.platform === "win32" ? "npm.cmd" : "npm", ["--prefix", "contracts", "run", "compile"]],
  },
  {
    label: "targeted FunkyRave test",
    command: [
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["hardhat", "test", "test/FunkyRave.test.js"],
      { cwd: "contracts" },
    ],
  },
];

const boundaries = [
  "no deployment approval",
  "no funded transaction approval",
  "no governance transaction approval",
  "no BscScan verification approval",
  "no runtime readiness approval",
  "no staging readiness approval",
  "no testnet readiness approval",
  "no mainnet readiness approval",
];

function runCheck({ label, command }) {
  const [cmd, args, options = {}] = command;
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: "ignore",
    ...options,
  });
  if (result.status !== 0) {
    console.log(`- ${label}: fail`);
    console.log("validation-fail: preflight tooling check failed");
    console.log("no value echoed");
    process.exit(1);
  }
  console.log(`- ${label}: pass`);
}

console.log("VGC-FUNKY-TOKEN preflight tooling checks");

for (const check of fastChecks) {
  runCheck(check);
}

if (includeContractChecks) {
  for (const check of contractChecks) {
    runCheck(check);
  }
} else {
  console.log("- contract tests: skipped unless --include-contract-checks");
  console.log("- compile: skipped unless --include-contract-checks");
  console.log("- targeted FunkyRave test: skipped unless --include-contract-checks");
}

for (const boundary of boundaries) {
  console.log(boundary);
}
