const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  ManifestError,
  canonicalJson,
  parseStrictHex,
  extractSolidityMetadata,
  compareManifest,
  buildManifest,
} = require('./build-testnet-deployment-candidate-manifest');

const repoRoot = path.resolve(__dirname, '..');
const expectedPath = path.join(repoRoot, 'test', 'testnet-deployment-candidate-manifest.expected.json');

function fail(message) {
  console.error(`testnet deployment candidate manifest test failed: ${message}`);
  process.exit(1);
}

function runBuilder(args) {
  const result = spawnSync(process.execPath, ['scripts/build-testnet-deployment-candidate-manifest.js', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 1800000,
  });
  if (result.status !== 0) fail(`builder ${args.join(' ') || 'compact'}`);
  if (result.stderr.trim()) fail(`builder stderr ${args.join(' ') || 'compact'}`);
  return result.stdout.trim();
}

function expectManifestError(label, fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof ManifestError)) fail(`${label}: wrong error type`);
    if (expectedCode && error.code !== expectedCode) fail(`${label}: ${error.code}`);
    return;
  }
  fail(`${label}: accepted`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mutateAndExpectMismatch(label, manifest, mutator) {
  const mutated = clone(manifest);
  mutator(mutated);
  expectManifestError(label, () => compareManifest(mutated, manifest), 'manifest-fixture-mismatch');
}

function assertHex64(label, value) {
  if (!/^[a-f0-9]{64}$/.test(value)) fail(`${label}: expected sha256`);
}

function assertNoForbiddenOutput(manifest) {
  const output = JSON.stringify(manifest);
  const forbidden = [
    ['real EVM address', /0x[a-fA-F0-9]{40}/],
    ['private-key-like hex', /0x[a-fA-F0-9]{64}/],
    ['RPC URL', /\b(?:https?|wss?):\/\/[^\s"]*(?:rpc|alchemy|infura|quicknode|ankr|moralis|chainstack|getblock|nodereal|bsc-dataseed)[^\s"]*/i],
    ['API key', /api[_ -]?key\s*[:=]\s*['"`]?[A-Za-z0-9_-]{20,}/i],
    ['.env content', /\.env\s*=/],
    ['DB URL', /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\//i],
    ['JWT', /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
    ['cookie', /\bcookie\s*[:=]/i],
    ['absolute path', /[A-Z]:\\Users\\/i],
    ['timestamp', /\d{4}-\d{2}-\d{2}T/],
    ['raw bytecode', /"(?:bytecode|deployedBytecode)"\s*:/],
  ];
  for (const [label, pattern] of forbidden) {
    if (pattern.test(output)) fail(label);
  }
}

function assertBuilderRejectsUnsupportedArgs() {
  const result = spawnSync(process.execPath, ['scripts/build-testnet-deployment-candidate-manifest.js', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
  });
  if (result.status === 0) fail('unsupported argument accepted');
  if (result.stdout.trim()) fail('unsupported argument stdout');
}

expectManifestError('missing 0x rejects', () => parseStrictHex('abcd', 'test'), 'missing-0x:test');
expectManifestError('empty hex rejects', () => parseStrictHex('0x', 'test'), 'empty-hex:test');
expectManifestError('odd hex rejects', () => parseStrictHex('0xabc', 'test'), 'odd-hex:test');
expectManifestError('invalid hex rejects', () => parseStrictHex('0xzz', 'test'), 'invalid-hex:test');
expectManifestError('metadata extraction rejects non-solidity bytes', () => extractSolidityMetadata(Buffer.from('001122', 'hex'), 'test'), 'metadata-unavailable:test');
assertBuilderRejectsUnsupportedArgs();

const compact = buildManifest({ repoRoot });
const compactText = JSON.stringify(compact);
const prettyText = JSON.stringify(compact, null, 2);
const pretty = JSON.parse(prettyText);
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8').replace(/^\uFEFF/, ''));

if (compactText !== JSON.stringify(compact)) fail('compact output formatting');
if (prettyText !== JSON.stringify(pretty, null, 2)) fail('pretty output formatting');
compareManifest(compact, pretty);
compareManifest(compact, expected);
if (compact.schemaName !== 'VGC_TESTNET_DEPLOYMENT_CANDIDATE_MANIFEST') fail('schemaName');
if (compact.schemaVersion !== 1) fail('schemaVersion');
if (compact.status !== 'BLOCKED_OWNER_DECISIONS_PENDING') fail('status');
if (compact.network.chainId !== 97) fail('chainId');
if (compact.token.name !== 'FUNKY RAVE' || compact.token.symbol !== 'FUNKY') fail('token identity');
if (compact.token.initialSupplyTokens !== '30000000000') fail('initial supply');
if (compact.constructor.valuesIncluded !== false) fail('constructor values included');
if (compact.constructor.inputs.length !== 2) fail('constructor input count');
if (compact.constructor.inputs[0].name !== 'initialAdmin') fail('constructor order initialAdmin');
if (compact.constructor.inputs[1].name !== 'initialFeeRecipient') fail('constructor order initialFeeRecipient');

const expectedSources = [
  'contracts/funky/Context.sol',
  'contracts/funky/draft-IERC6093.sol',
  'contracts/funky/ERC20.sol',
  'contracts/funky/funky.sol',
  'contracts/funky/FunkyTierUpdater.sol',
  'contracts/funky/IERC20.sol',
  'contracts/funky/IERC20Metadata.sol',
];
if (canonicalJson(compact.sourceBundle.includedSourcePaths) !== canonicalJson(expectedSources)) fail('production source closure');
if (compact.sourceBundle.includedSourcePaths.some((sourcePath) => /Mock/.test(sourcePath))) fail('mock source included');
if (compact.sourceBundle.productionSourceCount !== 7) fail('production source count');
if (compact.sourceBundle.mockSourceCount !== 0) fail('mock source count');
if (compact.sourceBundle.filesystemBuildInfoSourceEquality !== 'pass') fail('source/build-info equality');
assertHex64('source bundle hash', compact.sourceBundle.normalizedSourceBundleSha256);
for (const source of compact.sourceBundle.sources) {
  assertHex64(`source ${source.path} hash`, source.normalizedSourceSha256);
  if (!Number.isInteger(source.normalizedUtf8ByteLength) || source.normalizedUtf8ByteLength <= 0) fail(`source ${source.path} length`);
}

for (const [contractName, contract] of Object.entries(compact.contracts)) {
  for (const field of [
    'abiSha256',
    'artifactBuildInfoSha256',
    'productionCompilerInputSha256',
    'compilerSettingsSha256',
    'creationBytecodeTemplateFullSha256',
    'runtimeBytecodeTemplateFullSha256',
    'creationExecutableTemplateSha256',
    'runtimeExecutableTemplateSha256',
    'creationMetadataTrailerSha256',
    'runtimeMetadataTrailerSha256',
  ]) assertHex64(`${contractName}.${field}`, contract[field]);
  if (contract.bytecodeHashSemantics !== 'full_template_raw_bytes_sha256_with_metadata; executable_template_hashes_are_supplemental_metadata-stripped_hashes') fail(`${contractName}.bytecode semantics`);
  if (contract.constructorArgumentsIncluded !== false) fail(`${contractName}.constructorArgumentsIncluded`);
  if (contract.finalDeploymentHashesAvailable !== false) fail(`${contractName}.finalDeploymentHashesAvailable`);
  if (contract.finalInitCodeSha256 !== null) fail(`${contractName}.finalInitCodeSha256`);
  if (contract.finalRuntimeBytecodeSha256 !== null) fail(`${contractName}.finalRuntimeBytecodeSha256`);
  if (contract.rawBytecodeIncluded !== false) fail(`${contractName}.rawBytecodeIncluded`);
  if (contract.linkReferencesEmpty !== true || contract.deployedLinkReferencesEmpty !== true) fail(`${contractName}.linkReferences`);
  if (!contract.compilerLongVersion || !contract.compilerVersion) fail(`${contractName}.compiler version`);
  if (contract.compilerSettingsHashSemantics !== 'canonical_json_sha256_excluding_outputSelection') fail(`${contractName}.compiler settings semantics`);
}
if (compact.contracts.FunkyRave.immutableReferences.present !== false) fail('FunkyRave immutable references');
if (compact.contracts.FunkyTierUpdater.immutableReferences.present !== true) fail('FunkyTierUpdater immutable references present');
if (!compact.contracts.FunkyTierUpdater.immutableReferences.entries.some((entry) => entry.name === 'funkyToken')) fail('FunkyTierUpdater funkyToken immutable reference');

if (compact.gates.testnetPreflightGateStatus !== 'BLOCKED_OWNER_DECISIONS_PENDING') fail('testnet gate');
if (compact.gates.ownerPolicyPreflightGateStatus !== 'BLOCKED_OWNER_POLICY_DECISIONS_PENDING') fail('owner policy gate');
if (compact.gates.ownerActionIntakeFinalGateStatus !== 'OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED') fail('final gate');
if (compact.gates.ownerActionIntakeFinalGateStatusSource !== 'live_final_gate_json') fail('final gate source');
if (compact.sourceOfTruthDecisionStatus !== 'SOURCE_OF_TRUTH_DECISION_PENDING') fail('source of truth');
for (const key of ['safeToDeploy', 'safeToPerformFundedTransaction', 'safeToPerformGovernanceTransaction', 'safeToVerifyBscScan', 'safeToClaimReadiness']) {
  if (compact[key] !== false) fail(`${key} false`);
}
if (compact.requiresOwnerReview !== true) fail('owner review');
if (compact.requiresLaterExplicitDeployInstruction !== true) fail('later deploy instruction');
if (!Object.values(compact.nonApproval).every((value) => value === true)) fail('nonApproval');
assertNoForbiddenOutput(compact);

mutateAndExpectMismatch('full creation bytecode hash mutation', expected, (m) => { m.contracts.FunkyRave.creationBytecodeTemplateFullSha256 = '0'.repeat(64); });
mutateAndExpectMismatch('full runtime bytecode hash mutation', expected, (m) => { m.contracts.FunkyTierUpdater.runtimeBytecodeTemplateFullSha256 = '0'.repeat(64); });
mutateAndExpectMismatch('source bundle hash mutation', expected, (m) => { m.sourceBundle.normalizedSourceBundleSha256 = '0'.repeat(64); });
mutateAndExpectMismatch('compiler settings hash mutation', expected, (m) => { m.contracts.FunkyRave.compilerSettingsSha256 = '0'.repeat(64); });
mutateAndExpectMismatch('abi hash mutation', expected, (m) => { m.contracts.FunkyRave.abiSha256 = '0'.repeat(64); });
mutateAndExpectMismatch('final gate mutation', expected, (m) => { m.gates.ownerActionIntakeFinalGateStatus = 'OWNER_ACTION_INTAKE_FINAL_GATE_READY'; });
mutateAndExpectMismatch('safeToDeploy mutation', expected, (m) => { m.safeToDeploy = true; });
mutateAndExpectMismatch('includedSourcePaths mutation', expected, (m) => { m.sourceBundle.includedSourcePaths.push('contracts/funky/MockDexPair.sol'); });
mutateAndExpectMismatch('immutable reference mutation', expected, (m) => { m.contracts.FunkyTierUpdater.immutableReferences.present = false; });
mutateAndExpectMismatch('nonApproval mutation', expected, (m) => { delete m.nonApproval.deployment; });

console.log('testnet deployment candidate manifest tests passed');
