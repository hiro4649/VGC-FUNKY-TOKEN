const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const pretty = process.argv.includes('--pretty');

function fail(code) {
  console.error(`testnet deployment candidate manifest failed: ${code}`);
  process.exit(1);
}

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing:${relativePath}`);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, ''));
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing:${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeSource(value) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function artifactInfo({ contractName, sourcePath, artifactPath, componentStatus }) {
  const artifact = readJson(artifactPath);
  if (artifact.contractName !== contractName) fail(`contract-name:${contractName}`);
  if (artifact.sourceName !== sourcePath) fail(`source-path:${contractName}`);
  const bytecode = String(artifact.bytecode || '');
  const deployedBytecode = String(artifact.deployedBytecode || '');
  if (!bytecode.startsWith('0x') || bytecode.length <= 2) fail(`empty-creation-bytecode:${contractName}`);
  if (!deployedBytecode.startsWith('0x') || deployedBytecode.length <= 2) fail(`empty-runtime-bytecode:${contractName}`);
  if (artifact.linkReferences && Object.keys(artifact.linkReferences).length > 0) fail(`link-references:${contractName}`);
  const source = normalizeSource(readText(path.join('contracts', sourcePath)));
  return {
    contractName,
    sourcePath: path.join('contracts', sourcePath).replace(/\\/g, '/'),
    artifactPath,
    compilerVersion: compiler.solcVersion,
    optimizerEnabled: compiler.optimizerEnabled,
    optimizerRuns: compiler.optimizerRuns,
    evmVersion: compiler.evmVersion,
    abiSha256: sha256(JSON.stringify(artifact.abi)),
    creationBytecodeSha256: sha256(bytecode.toLowerCase()),
    deployedBytecodeSha256: sha256(deployedBytecode.toLowerCase()),
    sourceSha256: sha256(source),
    linkReferencesEmpty: true,
    bytecodePresent: true,
    ...(componentStatus ? { componentStatus } : {}),
  };
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

const buildInfoDir = path.join(repoRoot, 'contracts', 'artifacts', 'build-info');
const buildInfoFiles = fs.existsSync(buildInfoDir)
  ? fs.readdirSync(buildInfoDir).filter((name) => name.endsWith('.json')).sort()
  : [];
if (buildInfoFiles.length === 0) fail('compile_required');

const buildInfo = readJson(path.join('contracts', 'artifacts', 'build-info', buildInfoFiles[0]));
if (!buildInfo.solcVersion || !buildInfo.input || !buildInfo.input.settings) fail('compiler-settings-unavailable');

const compiler = {
  solcVersion: buildInfo.solcVersion,
  optimizerEnabled: buildInfo.input.settings.optimizer && buildInfo.input.settings.optimizer.enabled === true,
  optimizerRuns: buildInfo.input.settings.optimizer && buildInfo.input.settings.optimizer.runs,
  evmVersion: buildInfo.input.settings.evmVersion || null,
};
if (!compiler.solcVersion || compiler.optimizerRuns === undefined) fail('compiler-settings-unavailable');

const funkySource = normalizeSource(readText('contracts/funky/funky.sol'));
if (!funkySource.includes('FUNKY RAVE') || !funkySource.includes('FUNKY')) fail('token-identity');

const repoSafety = readJson('test/vgc-token-repo-safety-audit.expected.json');
const sourceInvariant = readJson('test/vgc-token-source-invariant-audit.expected.json');
const testnetGate = {
  status: readJson('test/owner-preflight-handoff-packet.expected.json').status,
};
const ownerPolicyGate = readJson('test/owner-policy-preflight-gate.expected.json');
const finalGate = readJson('test/deployment-readiness-owner-action-intake-final-gate.expected.json');

const safeFlags = [
  finalGate.safeToDeploy,
  finalGate.safeToPerformFundedTransaction,
  finalGate.safeToPerformGovernanceTransaction,
  finalGate.safeToVerifyBscScan,
  finalGate.safeToClaimReadiness,
];
if (safeFlags.some(Boolean)) fail('safe-flag-true');
if (testnetGate.status !== 'BLOCKED_OWNER_DECISIONS_PENDING') fail('testnet-gate-unblocked');
if (ownerPolicyGate.status !== 'BLOCKED_OWNER_POLICY_DECISIONS_PENDING') fail('owner-policy-gate-unblocked');
if (finalGate.status !== 'OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED') fail('final-gate-unblocked');

const includedSourcePaths = [
  'contracts/funky/Context.sol',
  'contracts/funky/draft-IERC6093.sol',
  'contracts/funky/ERC20.sol',
  'contracts/funky/funky.sol',
  'contracts/funky/FunkyTierUpdater.sol',
  'contracts/funky/IERC20.sol',
  'contracts/funky/IERC20Metadata.sol',
].sort();
const normalizedBundle = includedSourcePaths
  .map((sourcePath) => `// ${sourcePath}\n${normalizeSource(readText(sourcePath))}`)
  .join('\n');

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
  sourceOfTruthDecisionStatus: 'pending_owner_decision',
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
    }),
    FunkyTierUpdater: artifactInfo({
      contractName: 'FunkyTierUpdater',
      sourcePath: 'funky/FunkyTierUpdater.sol',
      artifactPath: 'contracts/artifacts/funky/FunkyTierUpdater.sol/FunkyTierUpdater.json',
      componentStatus: 'SEPARATE_GOVERNANCE_COMPONENT_PENDING_OWNER_POLICY',
    }),
  },
  sourceBundle: {
    includedSourcePaths,
    normalizedSourceBundleSha256: sha256(normalizedBundle),
  },
  constructor: {
    valuesIncluded: false,
    inputs: [
      { name: 'initialAdmin', type: 'address', status: 'pending_owner_public_value' },
      { name: 'initialFeeRecipient', type: 'address', status: 'pending_owner_public_value' },
    ],
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
    ownerActionIntakeFinalGateStatus: finalGate.status,
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
if (/0x[a-fA-F0-9]{40}/.test(output)) fail('real-address-output');
if (/0x[a-fA-F0-9]{64}/.test(output)) fail('private-key-like-output');
if (/[A-Z]:\\Users\\/i.test(output)) fail('absolute-path-output');
if (/"(?:bytecode|deployedBytecode)"\s*:/.test(output)) fail('raw-bytecode-output');
console.log(output);
