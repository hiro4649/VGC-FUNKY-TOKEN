#!/usr/bin/env node

const { spawnSync } = require("child_process");

const samplePath = "test/deployment-readiness-owner-action-issue.sample.md";
const jsonMode = process.argv.includes("--json");

const safeToFields = [
  "safeToDeploy",
  "safeToPerformFundedTransaction",
  "safeToPerformGovernanceTransaction",
  "safeToVerifyBscScan",
  "safeToClaimReadiness",
];

const nonApprovalFields = [
  "deployment",
  "fundedTransaction",
  "governanceTransaction",
  "bscScanVerification",
  "release",
  "publicVisibility",
  "runtimeReadiness",
  "stagingReadiness",
  "testnetReadiness",
  "mainnetReadiness",
];

const checks = [
  ["templateGuard", "template guard", ["scripts/test-deployment-readiness-owner-action-issue-template.js"], "pass"],
  ["parser", "parser", ["scripts/parse-deployment-readiness-owner-action-issue.js", samplePath], "pass"],
  ["parserJson", "parser JSON", ["scripts/parse-deployment-readiness-owner-action-issue.js", samplePath, "--json"], "pass"],
  ["parserSelfTest", "parser self-test", ["scripts/test-deployment-readiness-owner-action-issue-parser.js"], "pass"],
  ["parserSnapshot", "parser snapshot", ["scripts/test-deployment-readiness-owner-action-issue-parser-snapshot.js"], "pass"],
  ["reviewPacket", "review packet", ["scripts/build-deployment-readiness-owner-action-review-packet.js", samplePath], "pass"],
  ["reviewPacketJson", "review packet JSON", ["scripts/build-deployment-readiness-owner-action-review-packet.js", samplePath, "--json"], "pass"],
  ["reviewPacketSelfTest", "review packet self-test", ["scripts/test-deployment-readiness-owner-action-review-packet.js"], "pass"],
  ["reviewPacketSnapshot", "review packet snapshot", ["scripts/test-deployment-readiness-owner-action-review-packet-snapshot.js"], "pass"],
  ["ownerActionPacket", "owner action packet", ["scripts/build-deployment-readiness-owner-action-packet.js"], "pass"],
  ["ownerActionPacketJson", "owner action packet JSON", ["scripts/build-deployment-readiness-owner-action-packet.js", "--json"], "pass"],
  ["ownerActionPacketSelfTest", "owner action packet self-test", ["scripts/test-deployment-readiness-owner-action-packet.js"], "pass"],
  ["ownerActionPacketSnapshot", "owner action packet snapshot", ["scripts/test-deployment-readiness-owner-action-packet-snapshot.js"], "pass"],
  ["blockerRegistry", "blocker registry", ["scripts/build-deployment-readiness-blocker-registry.js"], "pass"],
  ["blockerRegistryJson", "blocker registry JSON", ["scripts/build-deployment-readiness-blocker-registry.js", "--json"], "pass"],
  ["blockerRegistrySelfTest", "blocker registry self-test", ["scripts/test-deployment-readiness-blocker-registry.js"], "pass"],
  ["blockerRegistrySnapshot", "blocker registry snapshot", ["scripts/test-deployment-readiness-blocker-registry-snapshot.js"], "pass"],
  ["testnetPreflightGate", "testnet preflight gate", ["scripts/check-testnet-preflight-gate.js"], "blocked"],
  ["testnetPreflightGateJson", "testnet preflight gate JSON", ["scripts/check-testnet-preflight-gate.js", "--json"], "blocked"],
  ["ownerPolicyPreflightGate", "owner policy preflight gate", ["scripts/check-owner-policy-preflight-gate.js"], "blocked"],
  ["ownerPolicyPreflightGateJson", "owner policy preflight gate JSON", ["scripts/check-owner-policy-preflight-gate.js", "--json"], "blocked"],
];

function fail(reason) {
  console.error("deployment readiness owner action intake checks failed");
  console.error(`safe reason code: ${reason}`);
  console.error("no value echoed");
  process.exit(1);
}

function assertSafeOutput(text) {
  const forbidden = [
    /0x[a-fA-F0-9]{40}/,
    /0x[a-fA-F0-9]{64}/,
    /\b(?:ht|f)tps?:\/\/[^\s"'<>]*(?:bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack|rpc)/i,
    /\b(?:api[_-]?key|apikey|secret)\s*[:=]\s*[^\s"'<>]+/i,
    /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m,
    /\b(?:postgres|mysql|mongodb|redis):\/\//i,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    /\bcookie\s*[:=]\s*[^\s"'<>]+/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(text)) fail("unsafe-subcheck-output");
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  const combinedOutput = `${result.stdout || ""}${result.stderr || ""}`;
  assertSafeOutput(combinedOutput);
  if (result.status !== 0) fail(`subcheck-failed-${args[0]}`);
}

const checkResults = {};
for (const [key, label, args, status] of checks) {
  runNode(args);
  checkResults[key] = { label, status };
}

const output = {
  status: "OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING",
  checks: checkResults,
  safeToDeploy: false,
  safeToPerformFundedTransaction: false,
  safeToPerformGovernanceTransaction: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
  nonApproval: Object.fromEntries(nonApprovalFields.map((field) => [field, true])),
  containsSecrets: false,
  containsRealOwnerValues: false,
  requiresOwnerReview: true,
  requiresLaterExplicitDeployInstruction: true,
};

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} else {
  console.log("VGC-FUNKY-TOKEN deployment readiness owner action intake checks");
  console.log(`status: ${output.status}`);
  console.log("template guard: pass");
  console.log("parser: pass");
  console.log("parser snapshot: pass");
  console.log("review packet: pass");
  console.log("review packet snapshot: pass");
  console.log("owner action packet: pass");
  console.log("owner action packet snapshot: pass");
  console.log("blocker registry: pass");
  console.log("blocker registry snapshot: pass");
  console.log("testnet preflight gate: blocked");
  console.log("owner policy preflight gate: blocked");
  for (const field of safeToFields) {
    console.log(`${field}: false`);
  }
  console.log("no deployment approval");
  console.log("no funded transaction approval");
  console.log("no governance transaction approval");
  console.log("no BscScan verification approval");
  console.log("no release approval");
  console.log("no public visibility approval");
  console.log("no runtime readiness approval");
  console.log("no staging readiness approval");
  console.log("no testnet readiness approval");
  console.log("no mainnet readiness approval");
}
