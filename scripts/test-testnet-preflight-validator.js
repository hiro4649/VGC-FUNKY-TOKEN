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
  const unsafeValue = mutate(data);
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

  if (!expectPass && unsafeValue) {
    const output = `${result.stdout}\n${result.stderr}`;
    if (output.includes(unsafeValue)) {
      console.error(name);
      console.error("unsafe output echo detected");
      console.error("no value echoed");
      cleanup();
      process.exit(1);
    }
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
    const value = `0x${"a".repeat(64)}`;
    data.feeRecipientPolicy = value;
    return value;
  }, false);
  runCase("jwt-like-value", (data) => {
    const value = [`eyJ${"a".repeat(8)}`, "b".repeat(20), "c".repeat(20)].join(".");
    data.feeRecipientPolicy = value;
    return value;
  }, false);
  runCase("rpc-like-url", (data) => {
    const value = ["https", "://", "example", ".invalid", "/rpc"].join("");
    data.feeRecipientPolicy = value;
    return value;
  }, false);
  runCase("wss-like-url", (data) => {
    const value = ["wss", "://", "testnet", ".bscscan", ".com", "/socket"].join("");
    data.bscScanVerificationPlan = value;
    return value;
  }, false);
  runCase("credentialed-url", (data) => {
    const value = ["https", "://", "user", ":", "pass", "@", "testnet.bscscan.com/"].join("");
    data.bscScanVerificationPlan = value;
    return value;
  }, false);
  runCase("bscscan-token-query-url", (data) => {
    const value = [
      "https",
      "://",
      "testnet.bscscan.com/",
      "?",
      "apikey",
      "=",
      "placeholder",
    ].join("");
    data.bscScanVerificationPlan = value;
    return value;
  }, false);
  runCase("env-style-content", (data) => {
    const value = ["KEY", "=", "VALUE"].join("");
    data.feeRecipientPolicy = value;
    return value;
  }, false);
  runCase("fake-bscscan-host", (data) => {
    const value = ["https", "://", "evilbscscan", ".com/"].join("");
    data.bscScanVerificationPlan = value;
    return value;
  }, false);
  runCase("bscscan-dot-evil-host", (data) => {
    const value = ["https", "://", "bscscan", ".com", ".evil", ".com/"].join("");
    data.bscScanVerificationPlan = value;
    return value;
  }, false);

  console.log("testnet preflight validator self-tests passed");
} finally {
  cleanup();
}
