#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");
const SCHEMA_PATH = path.join(REPO_ROOT, "test", "testnet-preflight-safe-artifact.schema.json");
const EXPORTER_PATH = path.join(__dirname, "export-testnet-preflight-safe-artifact.js");
const FORBIDDEN_FIELD_NAMES = ["rawOwnerJson", "rawIssueBody", "fullPublicAddress"];

function fail(fieldPath, reasonCode) {
  console.error("schema guard failure");
  console.error(`field path: ${fieldPath}`);
  console.error(`safe reason code: ${reasonCode}`);
  process.exit(1);
}

function assert(condition, fieldPath, reasonCode) {
  if (!condition) {
    const error = new Error(reasonCode);
    error.fieldPath = fieldPath;
    error.reasonCode = reasonCode;
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortedKeys(value) {
  return Object.keys(value || {}).sort();
}

function sameKeys(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function assertSafeText(text, fieldPath) {
  for (const forbidden of [
    /private\s*key/i,
    /mnemonic/i,
    /https?:\/\/[^\s]*\b(bsc|binance|alchemy|infura|quicknode|nodereal|ankr|moralis|chainstack)[^\s]*/i,
    /\b(api[_-]?key|apikey)\s*[:=]\s*[^\s]+/i,
    /\.env\s*=/i,
    /0x[0-9a-fA-F]{40}/,
    /###\s+Target network approval/i,
    /{\s*"targetNetwork"\s*:/,
  ]) {
    assert(!forbidden.test(text), fieldPath, "forbidden-output");
  }
}

function getPath(object, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], object);
}

function validateObjectKeys(artifact, schema, objectName) {
  const rule = schema.objects[objectName];
  const object = artifact[objectName];
  assert(object && typeof object === "object" && !Array.isArray(object), objectName, "missing-object");
  assert(sameKeys(sortedKeys(object), rule.keys), objectName, "unexpected-keys");

  if (rule.allowedValues) {
    for (const [key, value] of Object.entries(object)) {
      assert(rule.allowedValues.includes(value), `${objectName}.${key}`, "unexpected-enum-value");
    }
  }

  if (Object.prototype.hasOwnProperty.call(rule, "requiredValue")) {
    for (const [key, value] of Object.entries(object)) {
      assert(value === rule.requiredValue, `${objectName}.${key}`, "unexpected-constant-value");
    }
  }
}

function validateForbiddenFieldNames(value, schema, pathParts = []) {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    assert(!FORBIDDEN_FIELD_NAMES.includes(key), [...pathParts, key].join("."), "forbidden-field");
    validateForbiddenFieldNames(value[key], schema, [...pathParts, key]);
  }
}

function validateArtifact(artifact, schema) {
  assert(schema.unexpectedFieldsAllowed === false, "schema.unexpectedFieldsAllowed", "schema-allows-extra");
  assert(sameKeys(sortedKeys(artifact), schema.topLevelKeys), "root", "unexpected-keys");
  validateForbiddenFieldNames(artifact, schema);

  for (const [fieldPath, expectedValue] of Object.entries(schema.constants)) {
    assert(getPath(artifact, fieldPath) === expectedValue, fieldPath, "unexpected-constant-value");
  }

  for (const objectName of Object.keys(schema.objects)) {
    validateObjectKeys(artifact, schema, objectName);
  }
}

function runExporter(args = []) {
  const result = spawnSync(process.execPath, [EXPORTER_PATH, ...args], { encoding: "utf8" });
  if (result.status !== 0) fail("exporter", "exporter-failed");
  assertSafeText(result.stdout, "exporter.output");
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("exporter.output", "json-parse-failed");
  }
}

function expectReject(schema, artifact, fieldPath, reasonCode) {
  try {
    validateArtifact(artifact, schema);
  } catch (error) {
    if (error.fieldPath === fieldPath && error.reasonCode === reasonCode) return;
    throw error;
  }
  const error = new Error(reasonCode);
  error.fieldPath = fieldPath;
  error.reasonCode = "negative-case-not-rejected";
  throw error;
}

try {
  const schemaText = fs.readFileSync(SCHEMA_PATH, "utf8");
  assertSafeText(schemaText, "schema");
  const schema = JSON.parse(schemaText);

  const artifact = runExporter();
  validateArtifact(artifact, schema);

  const prettyArtifact = runExporter(["--pretty"]);
  validateArtifact(prettyArtifact, schema);

  const extraTopLevel = clone(artifact);
  extraTopLevel.extraField = "pending";
  expectReject(schema, extraTopLevel, "root", "unexpected-keys");

  const extraTooling = clone(artifact);
  extraTooling.tooling.extraTool = "present";
  expectReject(schema, extraTooling, "tooling", "unexpected-keys");

  const missingOwnerDecision = clone(artifact);
  delete missingOwnerDecision.ownerDecisionStatus.initialAdmin;
  expectReject(schema, missingOwnerDecision, "ownerDecisionStatus", "unexpected-keys");

  const approvalFlip = clone(artifact);
  approvalFlip.nonApproval.deployment = false;
  expectReject(schema, approvalFlip, "nonApproval.deployment", "unexpected-constant-value");

  const dangerousAction = clone(artifact);
  dangerousAction.safety.deployScriptUsed = true;
  expectReject(schema, dangerousAction, "safety.deployScriptUsed", "unexpected-constant-value");

  const wrongName = clone(artifact);
  wrongName.tokenIdentity.name = "WRONG";
  expectReject(schema, wrongName, "tokenIdentity.name", "unexpected-constant-value");

  const wrongSymbol = clone(artifact);
  wrongSymbol.tokenIdentity.symbol = "WRONG";
  expectReject(schema, wrongSymbol, "tokenIdentity.symbol", "unexpected-constant-value");

  const wrongSource = clone(artifact);
  wrongSource.sourceContract = "contracts/funky/other.sol";
  expectReject(schema, wrongSource, "sourceContract", "unexpected-constant-value");

  const approvedOwnerDecision = clone(artifact);
  approvedOwnerDecision.ownerDecisionStatus.initialAdmin = "approved";
  expectReject(
    schema,
    approvedOwnerDecision,
    "ownerDecisionStatus.initialAdmin",
    "unexpected-enum-value",
  );

  const unknownToolingValue = clone(artifact);
  unknownToolingValue.tooling.issueParser = "unknown";
  expectReject(schema, unknownToolingValue, "tooling.issueParser", "unexpected-enum-value");

  const unknownCheckValue = clone(artifact);
  unknownCheckValue.checks.preTestnetStatus = "unknown";
  expectReject(schema, unknownCheckValue, "checks.preTestnetStatus", "unexpected-enum-value");

  const rawField = clone(artifact);
  rawField.rawOwnerJson = "pending";
  expectReject(schema, rawField, "root", "unexpected-keys");

  console.log("testnet preflight safe artifact schema guard passed");
} catch (error) {
  fail(error.fieldPath || "schema", error.reasonCode || "schema-validation-failed");
}
