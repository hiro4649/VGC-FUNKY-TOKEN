#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const BUILDER_PATH = path.join(__dirname, "build-testnet-preflight-review-packet.js");
const SAMPLE_JSON = path.join(__dirname, "..", "test", "testnet-preflight-values.sample.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runBuilder(args) {
  return spawnSync(process.execPath, [BUILDER_PATH, ...args], { encoding: "utf8" });
}

function writeFile(tempDir, name, content) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function issueBody(values = {}) {
  const data = {
    initialAdmin: "INITIAL_ADMIN_TBD",
    initialFeeRecipient: "INITIAL_FEE_RECIPIENT_TBD",
    deployCommandApproval: "OWNER_APPROVAL_PENDING",
    deployerFunding: "OWNER_APPROVAL_PENDING",
    bscScanPlan: "VERIFICATION_PLAN_TBD",
    multisigOwnerPolicy: "PENDING",
    ...values,
  };

  return `### Target network approval

OWNER_APPROVAL_PENDING

### initialAdmin public EVM address

${data.initialAdmin}

### initialFeeRecipient public EVM address

${data.initialFeeRecipient}

### deploy command approval

${data.deployCommandApproval}

### deployer wallet funding confirmation

${data.deployerFunding}

### BscScan verification plan

${data.bscScanPlan}

### multisig owner policy

${data.multisigOwnerPolicy}

### admin rotation policy

PENDING

### feeRecipient policy

PENDING

### TierUpdater deployer policy

PENDING

### TierUpdater owner policy

PENDING

### trusted factory policy

PENDING

### initial DEX pair policy

PENDING

### fee exemption policy

PENDING
`;
}

function assertPacket(result, caseName) {
  assert(result.status === 0, `${caseName}: expected packet build to pass`);
  assert(result.stdout.includes("Testnet preflight review packet"), `${caseName}: title missing`);
  assert(result.stdout.includes("validation result: pass"), `${caseName}: validation pass missing`);
  assert(result.stdout.includes("summary result: pass"), `${caseName}: summary pass missing`);
  assert(result.stdout.includes("no deployment approval"), `${caseName}: deployment boundary missing`);
  assert(
    result.stdout.includes("next action: wait for explicit owner instruction"),
    `${caseName}: next action missing`,
  );
}

function assertFailNoEcho(result, unsafeValue, caseName) {
  assert(result.status !== 0, `${caseName}: expected safe failure`);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert(/secret-risk|validation-fail|summary-fail/.test(output), `${caseName}: marker missing`);
  if (unsafeValue && output.includes(unsafeValue)) {
    console.error(`${caseName}: unsafe output echo detected`);
    console.error("no value echoed");
    process.exit(1);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "funky-packet-builder-test-"));

try {
  const samplePacket = runBuilder(["--json", SAMPLE_JSON]);
  assertPacket(samplePacket, "sample-json");
  assert(!samplePacket.stdout.includes(fs.readFileSync(SAMPLE_JSON, "utf8")), "raw JSON echoed");

  const placeholderIssue = issueBody();
  const placeholderIssuePath = writeFile(tempDir, "placeholder-issue.md", placeholderIssue);
  const placeholderPacket = runBuilder(["--issue-body", placeholderIssuePath]);
  assertPacket(placeholderPacket, "placeholder-issue");
  assert(!placeholderPacket.stdout.includes(placeholderIssue), "raw issue body echoed");

  const dummyAdmin = "0x0000000000000000000000000000000000000001";
  const dummyFeeRecipient = "0x0000000000000000000000000000000000000002";
  const addressIssue = issueBody({
    initialAdmin: dummyAdmin,
    initialFeeRecipient: dummyFeeRecipient,
    deployCommandApproval: "APPROVED",
    deployerFunding: "HANDLED_SEPARATELY_BY_OWNER",
    bscScanPlan: "Use public BscScan docs https://docs.bscscan.com/",
    multisigOwnerPolicy: "Owner policy text for packet validation",
  });
  const addressIssuePath = writeFile(tempDir, "address-issue.md", addressIssue);
  const addressPacket = runBuilder(["--issue-body", addressIssuePath]);
  assertPacket(addressPacket, "address-issue");
  assert(addressPacket.stdout.includes("0x0000...0001"), "short admin missing");
  assert(addressPacket.stdout.includes("0x0000...0002"), "short fee recipient missing");
  assert(!addressPacket.stdout.includes(dummyAdmin), "full admin address echoed");
  assert(!addressPacket.stdout.includes(dummyFeeRecipient), "full fee recipient address echoed");

  assertFailNoEcho(runBuilder([]), "", "missing-argument");
  assertFailNoEcho(runBuilder(["--json", SAMPLE_JSON, "--issue-body", placeholderIssuePath]), "", "both-modes");

  const invalidJson = "{";
  const invalidJsonPath = writeFile(tempDir, "invalid.json", invalidJson);
  assertFailNoEcho(runBuilder(["--json", invalidJsonPath]), invalidJson, "invalid-json");

  const malformedIssue = "not an issue template body";
  const malformedIssuePath = writeFile(tempDir, "malformed.md", malformedIssue);
  assertFailNoEcho(runBuilder(["--issue-body", malformedIssuePath]), malformedIssue, "malformed-issue");

  const privateKeyLike = `0x${"a".repeat(64)}`;
  const privateIssuePath = writeFile(
    tempDir,
    "private.md",
    issueBody({ multisigOwnerPolicy: privateKeyLike }),
  );
  assertFailNoEcho(runBuilder(["--issue-body", privateIssuePath]), privateKeyLike, "private-key-like");

  const apiAssignment = ["a", "pi", "K", "ey", "=", "du", "mmy", "k".repeat(18)].join("");
  const apiIssuePath = writeFile(tempDir, "api.md", issueBody({ multisigOwnerPolicy: apiAssignment }));
  assertFailNoEcho(runBuilder(["--issue-body", apiIssuePath]), apiAssignment, "api-assignment");

  const rpcLikeUrl = ["ht", "tps", "://", "r", "pc", ".", "example", ".", "invalid", "/"].join("");
  const rpcIssuePath = writeFile(tempDir, "rpc.md", issueBody({ multisigOwnerPolicy: rpcLikeUrl }));
  assertFailNoEcho(runBuilder(["--issue-body", rpcIssuePath]), rpcLikeUrl, "rpc-like-url");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

assert(!fs.existsSync(tempDir), "temporary files were not removed");
console.log("testnet preflight review packet builder self-tests passed");
