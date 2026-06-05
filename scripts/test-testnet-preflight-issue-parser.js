#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PARSER_PATH = path.join(__dirname, "parse-testnet-preflight-issue.js");
const VALIDATOR_PATH = path.join(__dirname, "validate-testnet-preflight-values.js");
const SUMMARY_PATH = path.join(__dirname, "generate-testnet-preflight-summary.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runNode(scriptPath, args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8" });
}

function writeFile(tempDir, name, content) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function issueBody(values = {}) {
  const data = {
    targetNetworkApproval: "OWNER_APPROVAL_PENDING",
    initialAdmin: "INITIAL_ADMIN_TBD",
    initialFeeRecipient: "INITIAL_FEE_RECIPIENT_TBD",
    deployCommandApproval: "OWNER_APPROVAL_PENDING",
    deployerFunding: "OWNER_APPROVAL_PENDING",
    bscScanPlan: "VERIFICATION_PLAN_TBD",
    multisigOwnerPolicy: "PENDING",
    adminRotationPolicy: "PENDING",
    feeRecipientPolicy: "PENDING",
    tierUpdaterDeployerPolicy: "PENDING",
    tierUpdaterOwnerPolicy: "PENDING",
    trustedFactoryPolicy: "PENDING",
    initialDexPairPolicy: "PENDING",
    feeExemptionPolicy: "PENDING",
    ...values,
  };

  return `### Safety acknowledgement

- [x] I will not include unsafe values.

### Boundary acknowledgement

- [x] I understand this issue is no-deploy.

### Target network approval

${data.targetNetworkApproval}

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

${data.adminRotationPolicy}

### feeRecipient policy

${data.feeRecipientPolicy}

### TierUpdater deployer policy

${data.tierUpdaterDeployerPolicy}

### TierUpdater owner policy

${data.tierUpdaterOwnerPolicy}

### trusted factory policy

${data.trustedFactoryPolicy}

### initial DEX pair policy

${data.initialDexPairPolicy}

### fee exemption policy

${data.feeExemptionPolicy}

### Final acknowledgement

- [x] I understand Codex will validate and summarize only.
`;
}

function parseIssue(tempDir, body, name) {
  const issuePath = writeFile(tempDir, `${name}.md`, body);
  const result = runNode(PARSER_PATH, [issuePath]);
  assert(result.status === 0, `${name}: parser should pass`);
  return JSON.parse(result.stdout);
}

function validateAndSummarize(tempDir, json, name) {
  const jsonPath = writeFile(tempDir, `${name}.json`, JSON.stringify(json, null, 2));
  const validation = runNode(VALIDATOR_PATH, [jsonPath]);
  assert(validation.status === 0, `${name}: validator should pass`);
  const summary = runNode(SUMMARY_PATH, [jsonPath]);
  assert(summary.status === 0, `${name}: summary should pass`);
  return summary.stdout;
}

function assertFailNoEcho(result, unsafeValue, name) {
  assert(result.status !== 0, `${name}: expected safe failure`);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert(/secret-risk|validation-fail/.test(output), `${name}: missing safe failure marker`);
  if (output.includes(unsafeValue)) {
    console.error(`${name}: unsafe output echo detected`);
    console.error("no value echoed");
    process.exit(1);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "funky-issue-parser-test-"));

try {
  const placeholderJson = parseIssue(tempDir, issueBody(), "placeholder");
  assert(placeholderJson.targetNetwork === "BNB Smart Chain testnet", "target network mismatch");
  assert(placeholderJson.chainId === 97, "chain ID mismatch");
  assert(placeholderJson.initialAdmin === "INITIAL_ADMIN_TBD", "admin placeholder mismatch");
  assert(
    placeholderJson.initialFeeRecipient === "INITIAL_FEE_RECIPIENT_TBD",
    "fee recipient placeholder mismatch",
  );
  validateAndSummarize(tempDir, placeholderJson, "placeholder");

  const dummyAdmin = "0x0000000000000000000000000000000000000001";
  const dummyFeeRecipient = "0x0000000000000000000000000000000000000002";
  const approvedJson = parseIssue(
    tempDir,
    issueBody({
      targetNetworkApproval: "NOT_APPROVED",
      initialAdmin: dummyAdmin,
      initialFeeRecipient: dummyFeeRecipient,
      deployCommandApproval: "APPROVED",
      deployerFunding: "HANDLED_SEPARATELY_BY_OWNER",
      bscScanPlan: "Use public BscScan docs https://docs.bscscan.com/",
      multisigOwnerPolicy: "Owner policy text for parser validation",
      adminRotationPolicy: "Rotation policy text for parser validation",
      feeRecipientPolicy: "Fee recipient policy text for parser validation",
    }),
    "approved",
  );
  assert(approvedJson.deployCommandApproved === true, "APPROVED mapping mismatch");
  assert(approvedJson.deployerFundingHandledByOwner === true, "funding mapping mismatch");
  assert(approvedJson.multisigOwnerPolicy.includes("Owner policy"), "policy text missing");
  const approvedSummary = validateAndSummarize(tempDir, approvedJson, "approved");
  assert(approvedSummary.includes("0x0000...0001"), "short admin missing");
  assert(approvedSummary.includes("0x0000...0002"), "short fee recipient missing");
  assert(!approvedSummary.includes(dummyAdmin), "full admin address echoed");
  assert(!approvedSummary.includes(dummyFeeRecipient), "full fee recipient address echoed");

  const notApprovedJson = parseIssue(
    tempDir,
    issueBody({
      deployCommandApproval: "NOT_APPROVED",
      deployerFunding: "NOT_APPROVED",
    }),
    "not-approved",
  );
  assert(notApprovedJson.deployCommandApproved === false, "NOT_APPROVED mapping mismatch");
  assert(notApprovedJson.deployerFundingHandledByOwner === false, "funding false mismatch");

  const pendingFromTargetJson = parseIssue(
    tempDir,
    issueBody().replace(/### deploy command approval[\s\S]*?### deployer wallet funding confirmation/, "### deployer wallet funding confirmation"),
    "target-fallback",
  );
  assert(
    pendingFromTargetJson.deployCommandApproved === "OWNER_APPROVAL_PENDING",
    "target approval fallback mismatch",
  );

  const privateKeyLike = `0x${"a".repeat(64)}`;
  const unsafePrivatePath = writeFile(
    tempDir,
    "unsafe-private.md",
    issueBody({ multisigOwnerPolicy: privateKeyLike }),
  );
  assertFailNoEcho(runNode(PARSER_PATH, [unsafePrivatePath]), privateKeyLike, "private-key-like");

  const apiAssignment = `apiKey=${"k".repeat(24)}`;
  const unsafeApiPath = writeFile(
    tempDir,
    "unsafe-api.md",
    issueBody({ adminRotationPolicy: apiAssignment }),
  );
  assertFailNoEcho(runNode(PARSER_PATH, [unsafeApiPath]), apiAssignment, "api-key-like");

  const rpcUrl = `https://rpc-${Date.now()}.example.invalid/path`;
  const unsafeRpcPath = writeFile(
    tempDir,
    "unsafe-rpc.md",
    issueBody({ feeRecipientPolicy: rpcUrl }),
  );
  assertFailNoEcho(runNode(PARSER_PATH, [unsafeRpcPath]), rpcUrl, "rpc-like-url");

  const malformed = "This body has no issue-template headings";
  const malformedPath = writeFile(tempDir, "malformed.md", malformed);
  assertFailNoEcho(runNode(PARSER_PATH, [malformedPath]), malformed, "malformed");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

assert(!fs.existsSync(tempDir), "temporary files were not removed");
console.log("testnet preflight issue parser self-tests passed");
