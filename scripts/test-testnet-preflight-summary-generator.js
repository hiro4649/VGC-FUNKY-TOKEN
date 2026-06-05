#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const GENERATOR_PATH = path.join(__dirname, "generate-testnet-preflight-summary.js");
const SAMPLE_PATH = path.join(__dirname, "..", "test", "testnet-preflight-values.sample.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runGenerator(filePath) {
  return spawnSync(process.execPath, [GENERATOR_PATH, filePath], {
    encoding: "utf8",
  });
}

function writeJson(tempDir, name, data) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

function baseSample() {
  return JSON.parse(fs.readFileSync(SAMPLE_PATH, "utf8"));
}

function assertPass(result, caseName) {
  assert(result.status === 0, `${caseName}: expected pass`);
}

function assertFailNoEcho(result, unsafeValue, caseName) {
  assert(result.status !== 0, `${caseName}: expected failure`);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert(
    /secret-risk|validation-fail|summary-fail/.test(output),
    `${caseName}: expected safe failure marker`,
  );
  if (output.includes(unsafeValue)) {
    console.error(`${caseName}: unsafe output echo detected`);
    console.error("no value echoed");
    process.exit(1);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "funky-preflight-summary-"));

try {
  const placeholderPath = writeJson(tempDir, "placeholder.json", baseSample());
  const placeholderResult = runGenerator(placeholderPath);
  assertPass(placeholderResult, "placeholder summary");
  assert(placeholderResult.stdout.includes("initialAdmin: INITIAL_ADMIN_TBD"), "admin TBD missing");
  assert(
    placeholderResult.stdout.includes("initialFeeRecipient: INITIAL_FEE_RECIPIENT_TBD"),
    "fee recipient TBD missing",
  );
  assert(
    placeholderResult.stdout.includes("bscScanVerificationPlan: VERIFICATION_PLAN_TBD"),
    "verification plan TBD missing",
  );

  const publicAddressData = baseSample();
  const dummyAdmin = "0x0000000000000000000000000000000000000001";
  const dummyFeeRecipient = "0x0000000000000000000000000000000000000002";
  publicAddressData.initialAdmin = dummyAdmin;
  publicAddressData.initialFeeRecipient = dummyFeeRecipient;
  publicAddressData.multisigOwnerPolicy = "Owner policy text for review only";
  publicAddressData.adminRotationPolicy = "Rotation policy text for review only";
  publicAddressData.bscScanVerificationPlan = "Use public BscScan docs https://docs.bscscan.com/";
  const publicAddressPath = writeJson(tempDir, "public-addresses.json", publicAddressData);
  const publicAddressResult = runGenerator(publicAddressPath);
  assertPass(publicAddressResult, "public address summary");
  assert(publicAddressResult.stdout.includes("0x0000...0001"), "short admin missing");
  assert(publicAddressResult.stdout.includes("0x0000...0002"), "short fee recipient missing");
  assert(!publicAddressResult.stdout.includes(dummyAdmin), "full admin address echoed");
  assert(!publicAddressResult.stdout.includes(dummyFeeRecipient), "full fee recipient address echoed");
  assert(
    publicAddressResult.stdout.includes("- multisigOwnerPolicy: PROVIDED"),
    "provided policy status missing",
  );
  assert(
    !publicAddressResult.stdout.includes(publicAddressData.multisigOwnerPolicy),
    "raw policy text echoed",
  );
  assert(
    publicAddressResult.stdout.includes("bscScanVerificationPlan: TEXT_SUPPLIED"),
    "verification text status missing",
  );

  const invalidPath = path.join(tempDir, "invalid.json");
  fs.writeFileSync(invalidPath, "{");
  const invalidResult = runGenerator(invalidPath);
  assert(invalidResult.status !== 0, "invalid JSON should fail");
  assert(
    /validation-fail|summary-fail/.test(`${invalidResult.stdout}${invalidResult.stderr}`),
    "invalid JSON should use safe failure marker",
  );

  const unsafeValue = `0x${"a".repeat(64)}`;
  const unsafeData = baseSample();
  unsafeData.multisigOwnerPolicy = unsafeValue;
  const unsafePath = writeJson(tempDir, "unsafe.json", unsafeData);
  const unsafeResult = runGenerator(unsafePath);
  assertFailNoEcho(unsafeResult, unsafeValue, "secret-like input");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

assert(!fs.existsSync(tempDir), "temporary files were not removed");

console.log("testnet preflight summary generator self-tests passed");
