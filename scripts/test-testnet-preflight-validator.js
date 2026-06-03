#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SAMPLE_PATH = path.join("test", "testnet-preflight-values.sample.json");
const VALIDATOR_PATH = path.join("scripts", "validate-testnet-preflight-values.js");

const base = JSON.parse(fs.readFileSync(SAMPLE_PATH, "utf8"));
const tempFiles = [];

function writeTempCase(name, data) {
  const safeName = name.replace(/[^a-z0-9_-]/gi, "-");
  const filePath = path.join(os.tmpdir(), `vgc-funky-preflight-${safeName}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
  tempFiles.push(filePath);
  return filePath;
}

function cleanup() {
  for (const filePath of tempFiles.splice(0)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Temp cleanup should not print potentially sensitive paths.
    }
  }
}

function runCase(name, mutate, expectPass) {
  const data = structuredClone(base);
  mutate(data);
  const filePath = writeTempCase(name, data);
  const result = spawnSync(process.execPath, [VALIDATOR_PATH, filePath], {
    encoding: "utf8",
  });

  const passed = result.status === 0;
  if (passed !== expectPass) {
    console.error(`${name}: unexpected ${passed ? "pass" : "fail"}`);
    cleanup();
    process.exit(1);
  }

  if (!passed && !(result.stderr.includes("secret-risk") || result.stderr.includes("validation-fail"))) {
    console.error(`${name}: missing safe failure marker`);
    cleanup();
    process.exit(1);
  }

  console.log(`${name}: ${passed ? "pass" : "safe-fail"}`);
}

try {
  runCase("sample-placeholder-json", () => {}, true);
  runCase("policy-token-owner-text", (data) => {
    data.multisigOwnerPolicy = "token owner policy remains pending";
  }, true);
  runCase("policy-api-key-outside-repo-text", (data) => {
    data.bscScanVerificationPlan = "BscScan API key handled outside repository";
  }, true);
  runCase("bscscan-docs-url", (data) => {
    data.bscScanVerificationPlan = "Use public BscScan docs https://docs.bscscan.com/";
  }, true);
  runCase("bscscan-testnet-explorer-url", (data) => {
    data.bscScanVerificationPlan = "Use public BSC testnet explorer https://testnet.bscscan.com/";
  }, true);
  runCase("bscscan-root-url", (data) => {
    data.bscScanVerificationPlan = "Use public BscScan explorer https://bscscan.com/";
  }, true);

  runCase("private-key-like-value", (data) => {
    data.feeRecipientPolicy = `0x${"a".repeat(64)}`;
  }, false);
  runCase("jwt-like-value", (data) => {
    data.feeRecipientPolicy = [`eyJ${"a".repeat(8)}`, "b".repeat(20), "c".repeat(20)].join(".");
  }, false);
  runCase("rpc-like-url", (data) => {
    data.feeRecipientPolicy = ["https", "://", "example", ".invalid", "/rpc"].join("");
  }, false);
  runCase("wss-like-url", (data) => {
    data.bscScanVerificationPlan = ["wss", "://", "testnet", ".bscscan", ".com", "/socket"].join("");
  }, false);
  runCase("credentialed-url", (data) => {
    data.bscScanVerificationPlan = ["https", "://", "user", ":", "pass", "@", "testnet.bscscan.com/"].join("");
  }, false);
  runCase("bscscan-token-query-url", (data) => {
    data.bscScanVerificationPlan = [
      "https",
      "://",
      "testnet.bscscan.com/",
      "?",
      "apikey",
      "=",
      "placeholder",
    ].join("");
  }, false);
  runCase("env-style-content", (data) => {
    data.feeRecipientPolicy = ["KEY", "=", "VALUE"].join("");
  }, false);
  runCase("fake-bscscan-host", (data) => {
    data.bscScanVerificationPlan = ["https", "://", "evilbscscan", ".com/"].join("");
  }, false);
  runCase("bscscan-dot-evil-host", (data) => {
    data.bscScanVerificationPlan = ["https", "://", "bscscan", ".com", ".evil", ".com/"].join("");
  }, false);

  console.log("testnet preflight validator self-tests passed");
} finally {
  cleanup();
}
