const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--pretty')) {
  failEarly('unsupported-argument');
}

const repoRoot = fs.realpathSync(path.resolve(__dirname, '..'));
const pretty = args[0] === '--pretty';
const buildInfoRoot = fs.realpathSync(path.join(repoRoot, 'contracts', 'artifacts', 'build-info'));

function failEarly(code) {
  console.error(`testnet deployment candidate manifest failed: ${code}`);
  process.exit(1);
}

function fail(code) {
  console.error(`testnet deployment candidate manifest failed: ${code}`);
  process.exit(1);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertInside(parent, child, label) {
  if (!isInside(parent, child)) fail(`path-outside:${label}`);
  return child;
}

function resolveRepoPath(relativePath) {
  if (path.isAbsolute(relativePath)) fail(`absolute-path-input:${relativePath}`);
  const fullPath = path.resolve(repoRoot, relativePath);
  assertInside(repoRoot, fullPath, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing:${relativePath}`);
  const realPath = fs.realpathSync(fullPath);
  assertInside(repoRoot, realPath, relativePath);
  return realPath;
}

function toRepoPath(fullPath) {
  const realPath = fs.realpathSync(fullPath);
  assertInside(repoRoot, realPath, 'repo-path');
  return path.relative(repoRoot, realPath).replace(/\\/g, '/');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(resolveRepoPath(relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function readText(relativePath) {
  return fs.readFileSync(resolveRepoPath(relativePath), 'utf8').replace(/^\uFEFF/, '');
}

function sha256Bytes(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256Utf8(value) {
  return sha256Bytes(Buffer.from(value, 'utf8'));
}

function stripSolidityMetadataTrailer(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 4) return bytes;
  const metadataLength = bytes.readUInt16BE(bytes.length - 2);
  const trailerLength = metadataLength + 2;
  if (trailerLength <= 2 || trailerLength >= bytes.length) return bytes;
  const metadataStart = bytes.length - trailerLength;
  const first = bytes[metadataStart];
  if (first < 0xa0 || first > 0xbf) return bytes;
  return bytes.subarray(0, metadataStart);
}

function sha256StableBytecodeTemplate(bytes) {
  return sha256Bytes(stripSolidityMetadataTrailer(bytes));
}
function normalizeSource(value) {
  return value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, stable(value[key])]);
    return Object.fromEntries(entries);
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function validatedHex(value, label) {
  if (typeof value !== 'string' || !value.startsWith('0x')) fail(`missing-0x:${label}`);
  const hex = value.slice(2).toLowerCase();
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) fail(`invalid-hex:${label}`);
  const bytes = Buffer.from(hex, 'hex');
  if (bytes.length !== hex.length / 2) fail(`hex-byte-length:${label}`);
  return { hex, bytes };
}

function validatedBuildInfoHex(value, label) {
  if (typeof value !== 'string') fail(`build-info-hex-type:${label}`);
  const hex = value.replace(/^0x/i, '').toLowerCase();
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) fail(`invalid-build-info-hex:${label}`);
  const bytes = Buffer.from(hex, 'hex');
  if (bytes.length !== hex.length / 2) fail(`build-info-hex-byte-length:${label}`);
  return { hex, bytes };
}
function objectEmptyRecursive(value) {
  if (!value || typeof value !== 'object') return true;
  if (Array.isArray(value)) return value.every(objectEmptyRecursive);
  const keys = Object.keys(value);
  return keys.length === 0 || keys.every((key) => objectEmptyRecursive(value[key]));
}

function assertSafeOutput(text, label) {
  const forbidden = [
    ['private-key-like-64-hex', /0x[a-fA-F0-9]{64}/],
    ['full-evm-address', /0x[a-fA-F0-9]{40}/],
    ['rpc-url', /\b(?:https?|wss?):\/\/[^\s"'<>]*(?:rpc|alchemy|infura|quicknode|ankr|moralis|chainstack|getblock|nodereal|bsc-dataseed)[^\s"'<>]*/i],
    ['api-key-assignment', /\b(?:api[_ -]?key|apikey|secret)\s*[:=]\s*['"`]?[A-Za-z0-9_-]{20,}/i],
    ['env-assignment', /^\s*[A-Z][A-Z0-9_]{2,}\s*=\s*.+/m],
    ['db-url', /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\//i],
    ['jwt-literal', /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
    ['cookie-assignment', /\bcookie\s*[:=]\s*[^\s"'<>]+/i],
    ['local-machine-path', /[A-Z]:\\/],
  ];
  for (const [, pattern] of forbidden) {
    if (pattern.test(text)) fail(`unsafe-upstream-output:${label}`);
  }
}

function runJson(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath, '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assertSafeOutput(`${result.stdout}\n${result.stderr}`, path.basename(scriptPath));
  if (result.status !== 0) fail(`upstream:${path.basename(scriptPath)}`);
  const match = result.stdout.match(/\{[\s\S]*\}\s*$/);
  if (!match) fail(`upstream-json:${path.basename(scriptPath)}`);
  try {
    return JSON.parse(match[0]);
  } catch {
    fail(`upstream-json-parse:${path.basename(scriptPath)}`);
  }
}

function buildInfoForArtifact(dbgRelativePath) {
  const dbgPath = resolveRepoPath(dbgRelativePath);
  const dbg = JSON.parse(fs.readFileSync(dbgPath, 'utf8').replace(/^\uFEFF/, ''));
  if (!dbg.buildInfo || typeof dbg.buildInfo !== 'string') fail(`missing-build-info:${dbgRelativePath}`);
  const buildInfoCandidate = path.resolve(path.dirname(dbgPath), dbg.buildInfo);
  assertInside(repoRoot, buildInfoCandidate, `${dbgRelativePath}:build-info-candidate`);
  if (!fs.existsSync(buildInfoCandidate)) fail(`build-info-missing:${dbgRelativePath}`);
  const buildInfoPathReal = fs.realpathSync(buildInfoCandidate);
  assertInside(buildInfoRoot, buildInfoPathReal, `${dbgRelativePath}:build-info`);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPathReal, 'utf8').replace(/^\uFEFF/, ''));
  return { buildInfo, buildInfoPath: toRepoPath(buildInfoPathReal) };
}

function settingsWithoutOutputSelection(settings) {
  const copy = { ...settings };
  delete copy.outputSelection;
  return stable(copy);
}

function contractCompilerSettings(buildInfo, contractName) {
  if (!buildInfo.solcVersion || !buildInfo.solcLongVersion || !buildInfo.input || !buildInfo.input.settings) {
    fail(`compiler-settings-unavailable:${contractName}`);
  }
  const optimizer = buildInfo.input.settings.optimizer || {};
  if (optimizer.runs === undefined) fail(`optimizer-runs-unavailable:${contractName}`);
  const settingsNoOutputSelection = settingsWithoutOutputSelection(buildInfo.input.settings);
  return {
    compilerVersion: buildInfo.solcVersion,
    compilerLongVersion: buildInfo.solcLongVersion,
    compilerSettingsSha256: sha256Utf8(canonicalJson(settingsNoOutputSelection)),
    compilerSettingsHashSemantics: 'canonical_json_sha256_excluding_outputSelection',
    optimizerEnabled: optimizer.enabled === true,
    optimizerRuns: optimizer.runs,
    evmVersion: buildInfo.input.settings.evmVersion || null,
    metadataSettings: stable(buildInfo.input.settings.metadata || null),
    libraries: stable(buildInfo.input.settings.libraries || {}),
  };
}

function buildInfoContract(buildInfo, sourcePath, contractName) {
  const output = buildInfo.output
    && buildInfo.output.contracts
    && buildInfo.output.contracts[sourcePath]
    && buildInfo.output.contracts[sourcePath][contractName];
  if (!output) fail(`build-info-contract-missing:${contractName}`);
  return output;
}

function summarizeImmutableReferences(value) {
  if (objectEmptyRecursive(value)) {
    return { present: false, entries: [] };
  }
  const entries = [];
  for (const sourceId of Object.keys(value).sort()) {
    for (const immutableName of Object.keys(value[sourceId]).sort()) {
      const refs = value[sourceId][immutableName] || [];
      entries.push({
        sourceId,
        immutableName,
        referenceCount: refs.length,
        lengths: refs.map((ref) => ref.length).sort((a, b) => a - b),
      });
    }
  }
  return { present: entries.length > 0, entries };
}

function artifactInfo({ contractName, sourcePath, artifactPath, dbgPath, componentStatus }) {
  const artifact = readJson(artifactPath);
  if (artifact.contractName !== contractName) fail(`contract-name:${contractName}`);
  if (artifact.sourceName !== sourcePath) fail(`source-path:${contractName}`);

  const { buildInfo, buildInfoPath } = buildInfoForArtifact(dbgPath);
  const compiled = buildInfoContract(buildInfo, sourcePath, contractName);
  const settings = contractCompilerSettings(buildInfo, contractName);

  const artifactCreation = validatedHex(artifact.bytecode, `${contractName}:artifact-creation`);
  const artifactRuntime = validatedHex(artifact.deployedBytecode, `${contractName}:artifact-runtime`);
  const buildCreation = validatedBuildInfoHex(compiled.evm && compiled.evm.bytecode && compiled.evm.bytecode.object, `${contractName}:build-creation`);
  const buildRuntime = validatedBuildInfoHex(compiled.evm && compiled.evm.deployedBytecode && compiled.evm.deployedBytecode.object, `${contractName}:build-runtime`);
  if (artifactCreation.hex !== buildCreation.hex) fail(`creation-bytecode-build-info-mismatch:${contractName}`);
  if (artifactRuntime.hex !== buildRuntime.hex) fail(`runtime-bytecode-build-info-mismatch:${contractName}`);
  if (!objectEmptyRecursive(artifact.linkReferences)) fail(`artifact-link-references:${contractName}`);
  if (!objectEmptyRecursive(artifact.deployedLinkReferences)) fail(`artifact-deployed-link-references:${contractName}`);
  if (!objectEmptyRecursive(compiled.evm.bytecode.linkReferences)) fail(`build-info-link-references:${contractName}`);
  if (!objectEmptyRecursive(compiled.evm.deployedBytecode.linkReferences)) fail(`build-info-deployed-link-references:${contractName}`);

  const sourceRepoPath = path.join('contracts', sourcePath).replace(/\\/g, '/');
  const source = normalizeSource(readText(sourceRepoPath));
  return stable({
    contractName,
    sourcePath: sourceRepoPath,
    artifactPath,
    debugArtifactPath: dbgPath,
    buildInfoPath,
    ...settings,
    abiSha256: sha256Utf8(canonicalJson(artifact.abi)),
    creationBytecodeTemplateSha256: sha256StableBytecodeTemplate(artifactCreation.bytes),
    runtimeBytecodeTemplateSha256: sha256StableBytecodeTemplate(artifactRuntime.bytes),
    constructorArgumentsIncluded: false,
    finalDeploymentHashesAvailable: false,
    finalInitCodeSha256: null,
    finalRuntimeBytecodeSha256: null,
    creationBytecodeHashSemantics: 'raw_template_bytes_without_solc_metadata_trailer_sha256',
    compilerMetadataTrailerExcludedFromTemplateHash: true,
    runtimeBytecodeHashSemantics: 'raw_template_bytes_without_solc_metadata_trailer_sha256',
    rawBytecodeIncluded: false,
    sourceSha256: sha256Utf8(source),
    linkReferencesEmpty: true,
    deployedLinkReferencesEmpty: true,
    immutableReferences: summarizeImmutableReferences(compiled.evm.deployedBytecode.immutableReferences || {}),
    bytecodePresent: true,
    ...(componentStatus ? { componentStatus } : {}),
  });
}

function extractDefaultTierValues(source) {
  const tiers = {};
  const re = /feePercent\[(\d+)\]\s*=\s*(\d+)\s*;/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    tiers[`holdingDays_${match[1]}`] = Number(match[2]);
  }
  if (Object.keys(tiers).length === 0) fail('fee-tier-values-unavailable');
  return tiers;
}

function constructorInputsFromArtifact() {
  const artifact = readJson('contracts/artifacts/funky/funky.sol/FunkyRave.json');
  const constructors = artifact.abi.filter((entry) => entry.type === 'constructor');
  if (constructors.length !== 1) fail('constructor-abi-missing');
  const inputs = constructors[0].inputs || [];
  const expected = [
    { name: 'initialAdmin', type: 'address' },
    { name: 'initialFeeRecipient', type: 'address' },
  ];
  if (inputs.length !== expected.length) fail('constructor-abi-input-count');
  return expected.map((expectedInput, index) => {
    const actual = inputs[index];
    if (actual.name !== expectedInput.name || actual.type !== expectedInput.type) {
      fail(`constructor-abi-input:${expectedInput.name}`);
    }
    return { ...expectedInput, status: 'pending_owner_public_value' };
  });
}

function buildIncludedSourcePaths() {
  const paths = new Set();
  for (const dbgPath of [
    'contracts/artifacts/funky/funky.sol/FunkyRave.dbg.json',
    'contracts/artifacts/funky/FunkyTierUpdater.sol/FunkyTierUpdater.dbg.json',
  ]) {
    const { buildInfo } = buildInfoForArtifact(dbgPath);
    for (const sourceName of Object.keys(buildInfo.input.sources || {})) {
      const sourceRepoPath = path.join('contracts', sourceName).replace(/\\/g, '/');
      resolveRepoPath(sourceRepoPath);
      paths.add(sourceRepoPath);
    }
  }
  return Array.from(paths).sort();
}

const funkySource = normalizeSource(readText('contracts/funky/funky.sol'));
if (!/ERC20\s*\(\s*"FUNKY RAVE"\s*,\s*"FUNKY"\s*\)/.test(funkySource)) fail('token-identity');
if (!/_mint\s*\(\s*initialAdmin\s*,\s*30_000_000_000e18\s*\)/.test(funkySource)) fail('initial-supply');

const repoSafety = runJson('scripts/audit-vgc-token-repo-safety.js');
const sourceInvariant = runJson('scripts/audit-vgc-token-source-invariants.js');
const testnetGate = runJson('scripts/check-testnet-preflight-gate.js');
const ownerPolicyGate = runJson('scripts/check-owner-policy-preflight-gate.js');
const ownerActionPacket = runJson('scripts/build-deployment-readiness-owner-action-packet.js');
const blockerRegistry = runJson('scripts/build-deployment-readiness-blocker-registry.js');
const sourceOfTruth = runJson('scripts/build-source-of-truth-repository-decision.js');
const ownerActionIntakeFinalGateStatus = 'OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED';

const safeFlags = [
  testnetGate.safeToDeploy,
  testnetGate.safeToPerformFundedTransaction,
  testnetGate.safeToPerformGovernanceTransaction,
  testnetGate.safeToVerifyBscScan,
  testnetGate.safeToClaimReadiness,
  ownerPolicyGate.safeToDeploy,
  ownerPolicyGate.safeToPerformFundedTransaction,
  ownerPolicyGate.safeToPerformGovernanceTransaction,
  ownerPolicyGate.safeToVerifyBscScan,
  ownerPolicyGate.safeToClaimReadiness,
  sourceOfTruth.safeToDeploy,
  sourceOfTruth.safeToVerifyBscScan,
  sourceOfTruth.safeToClaimReadiness,
];
if (safeFlags.some(Boolean)) fail('safe-flag-true');
if (repoSafety.overall !== 'pass') fail('repo-safety-status');
if (sourceInvariant.overall !== 'pass_with_manual_review_items') fail('source-invariant-status');
if (testnetGate.status !== 'BLOCKED_OWNER_DECISIONS_PENDING') fail('testnet-gate-unblocked');
if (ownerPolicyGate.status !== 'BLOCKED_OWNER_POLICY_DECISIONS_PENDING') fail('owner-policy-gate-unblocked');
if (ownerActionPacket.status !== 'OWNER_ACTIONS_REQUIRED') fail('owner-action-packet-status');
if (blockerRegistry.status !== 'DEPLOYMENT_READINESS_BLOCKED') fail('blocker-registry-status');
if (sourceOfTruth.status !== 'SOURCE_OF_TRUTH_DECISION_PENDING') fail('source-of-truth-status');

const includedSourcePaths = buildIncludedSourcePaths();
const normalizedBundle = includedSourcePaths
  .map((sourcePath) => {
    const source = normalizeSource(readText(sourcePath));
    return `path:${sourcePath}\nlength:${Buffer.byteLength(source, 'utf8')}\n${source}`;
  })
  .join('\n---VGC_SOURCE_DELIMITER---\n');

const nonApproval = {
  deployment: true,
  fundedTransaction: true,
  governanceTransaction: true,
  bscScanVerification: true,
  release: true,
  publicVisibility: true,
  runtimeReadiness: true,
  stagingReadiness: true,
  testnetReadiness: true,
  mainnetReadiness: true,
};

const manifest = stable({
  schemaName: 'VGC_TESTNET_DEPLOYMENT_CANDIDATE_MANIFEST',
  schemaVersion: 1,
  status: 'BLOCKED_OWNER_DECISIONS_PENDING',
  candidateId: 'FUNKY_RAVE_BSC_TESTNET_CANDIDATE_V1',
  sourceOfTruthRepository: 'hiro4649/VGC-FUNKY-TOKEN',
  sourceOfTruthDecisionStatus: sourceOfTruth.status,
  network: {
    name: 'BNB Smart Chain testnet',
    chainId: 97,
    approvalStatus: 'OWNER_APPROVAL_PENDING',
  },
  token: {
    name: 'FUNKY RAVE',
    symbol: 'FUNKY',
    decimals: 18,
    initialSupplyTokens: '30000000000',
  },
  contracts: {
    FunkyRave: artifactInfo({
      contractName: 'FunkyRave',
      sourcePath: 'funky/funky.sol',
      artifactPath: 'contracts/artifacts/funky/funky.sol/FunkyRave.json',
      dbgPath: 'contracts/artifacts/funky/funky.sol/FunkyRave.dbg.json',
    }),
    FunkyTierUpdater: artifactInfo({
      contractName: 'FunkyTierUpdater',
      sourcePath: 'funky/FunkyTierUpdater.sol',
      artifactPath: 'contracts/artifacts/funky/FunkyTierUpdater.sol/FunkyTierUpdater.json',
      dbgPath: 'contracts/artifacts/funky/FunkyTierUpdater.sol/FunkyTierUpdater.dbg.json',
      componentStatus: 'SEPARATE_GOVERNANCE_COMPONENT_PENDING_OWNER_POLICY',
    }),
  },
  sourceBundle: {
    includedSourcePaths,
    normalizedSourceBundleSha256: sha256Utf8(normalizedBundle),
  },
  constructor: {
    valuesIncluded: false,
    inputs: constructorInputsFromArtifact(),
  },
  scripts: {
    deployScript: 'contracts/scripts/deploy-funky.js',
    configureScript: 'contracts/scripts/configure-funky-governance.js',
    validateOnlyMode: 'FUNKY_VALIDATE_ONLY=true',
    scriptsExecuted: false,
  },
  feeModel: {
    denominator: 1000,
    configuredMaximumRawValue: 1000,
    configuredMaximumEffectivePercent: 100,
    defaultTierValues: extractDefaultTierValues(funkySource),
    appliesTo: 'registered_dex_pair_recipient_sell_or_lp_add_path',
    walletToWalletFee: false,
    feeMaxPolicyStatus: 'pending_owner_decision',
    feeDenominatorPolicyStatus: 'pending_owner_decision',
    sellLpAddFeeBehaviorPolicyStatus: 'pending_owner_decision',
    documentationUnitConsistencyStatus: 'manual_review_required',
  },
  governanceBlockers: {
    initialAdminPending: true,
    initialFeeRecipientPending: true,
    multisigPolicyPending: true,
    adminRotationPolicyPending: true,
    feeRecipientPolicyPending: true,
    tierUpdaterPolicyPending: true,
    tierUpdaterLastRemovalPolicyPending: true,
    trustedFactoryPolicyPending: true,
    pairPolicyPending: true,
    feeExemptionPolicyPending: true,
    feeExemptionProposerApproverPolicyPending: true,
    tierUpdaterCodePresenceValidationPolicyPending: true,
    repositoryVisibilityDecisionPending: true,
    bscScanVerificationPlanPending: true,
    deployCommandApprovalPending: true,
    deployerFundingHandledSeparately: true,
  },
  auditStatus: {
    repositorySafetyAuditStatus: repoSafety.overall,
    sourceInvariantAuditStatus: sourceInvariant.overall,
    sourceInvariantManualReviewItemsPresent: Array.isArray(sourceInvariant.manualReviewItems) && sourceInvariant.manualReviewItems.length > 0,
  },
  gates: {
    testnetPreflightGateStatus: testnetGate.status,
    ownerPolicyPreflightGateStatus: ownerPolicyGate.status,
    ownerActionIntakeFinalGateStatus,
    ownerActionIntakeFinalGateStatusSource: 'derived_from_live_component_gates',
  },
  safeToDeploy: false,
  safeToPerformFundedTransaction: false,
  safeToPerformGovernanceTransaction: false,
  safeToVerifyBscScan: false,
  safeToClaimReadiness: false,
  containsSecrets: false,
  containsRealOwnerValues: false,
  containsRawBytecode: false,
  containsAbsolutePaths: false,
  containsTimestamps: false,
  requiresOwnerReview: true,
  requiresLaterExplicitDeployInstruction: true,
  nonApproval,
});

const output = JSON.stringify(manifest, null, pretty ? 2 : 0);
assertSafeOutput(output, 'manifest');
if (/"(?:bytecode|deployedBytecode)"\s*:/.test(output)) fail('raw-bytecode-output');
console.log(output);
