#!/usr/bin/env node

const { spawnSync } = require("child_process");

const commands = [
  {
    label: "pre-testnet status output",
    args: ["scripts/show-testnet-preflight-status.js"],
  },
  {
    label: "owner-values validator sample output",
    args: ["scripts/validate-testnet-preflight-values.js", "test/testnet-preflight-values.sample.json"],
  },
  {
    label: "summary generator sample output",
    args: ["scripts/generate-testnet-preflight-summary.js", "test/testnet-preflight-values.sample.json"],
  },
  {
    label: "review packet builder sample output",
    args: ["scripts/build-testnet-preflight-review-packet.js", "--json", "test/testnet-preflight-values.sample.json"],
  },
  {
    label: "preflight tooling checks output",
    args: ["scripts/run-testnet-preflight-tooling-checks.js"],
  },
  {
    label: "e2e preflight packet fixture output",
    args: ["scripts/test-testnet-preflight-e2e-packet.js"],
  },
];

const forbiddenPatterns = [
  ["private-key-like-64-hex", /0x[0-9a-fA-F]{64}/],
  ["jwt-literal", /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["db-url", /\b(postgres|postgresql|mysql|mongodb|redis):\/\//i],
  ["real-rpc-url", /https?:\/\/[^\s]*\b(bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s]*/i],
  ["cookie-assignment", /\bcookie\s*[:=]\s*[^\s]+/i],
  ["env-content", /^\s*(PRIVATE_KEY|MNEMONIC|RPC_URL|DATABASE_URL|DB_URL|JWT|COOKIE|API_KEY)\s*=\s*[^\s]+/im],
  ["api-key-value-assignment", /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i],
  ["full-dummy-address-1", /0x0000000000000000000000000000000000000001/i],
  ["full-dummy-address-2", /0x0000000000000000000000000000000000000002/i],
  ["raw-json-object", /{\s*"targetNetwork"\s*:/],
  ["raw-issue-heading", /###\s+Target network approval/i],
];

const approvalPhrases = [
  "deployment approval",
  "funded transaction approval",
  "governance transaction approval",
  "BscScan verification approval",
  "runtime readiness approval",
  "staging readiness approval",
  "testnet readiness approval",
  "mainnet readiness approval",
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

function hasApprovalClaim(output, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nonApprovalPattern = new RegExp(`\\b(no|non|not)[-\\s]+${escaped}\\b`, "gi");
  const normalized = output.replace(nonApprovalPattern, "");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(normalized);
}

function auditOutput(output) {
  for (const [category, pattern] of forbiddenPatterns) {
    if (pattern.test(output)) return category;
  }
  for (const phrase of approvalPhrases) {
    if (hasApprovalClaim(output, phrase)) return "approval-claim";
  }
  return null;
}

console.log("VGC-FUNKY-TOKEN preflight safe-output audit");

for (const command of commands) {
  const result = spawnSync(process.execPath, command.args, {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    console.log(`- ${command.label}: fail`);
    console.log("validation-fail: command failed during safe-output audit");
    console.log("no value echoed");
    process.exit(1);
  }

  const captured = `${result.stdout || ""}${result.stderr || ""}`;
  const unsafeCategory = auditOutput(captured);
  if (unsafeCategory) {
    console.log(`- ${command.label}: fail`);
    console.log("secret-risk");
    console.log(`unsafe field category: ${unsafeCategory}`);
    console.log("no value echoed");
    process.exit(1);
  }

  console.log(`- ${command.label}: pass`);
}

console.log("safe-output audit passed");
for (const boundary of boundaries) {
  console.log(boundary);
}
