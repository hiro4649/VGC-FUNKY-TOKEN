const crypto = require('crypto');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const expectedPath = path.join(repoRoot, 'test', 'testnet-deployment-candidate-manifest.expected.json');

function fail(message) {
  console.error(`testnet deployment candidate manifest test failed: ${message}`);
  process.exit(1);
}

function run(args) {
  const result = spawnSync(process.execPath, ['scripts/build-testnet-deployment-candidate-manifest.js', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) fail(`builder ${args.join(' ') || 'compact'}`);
  if (result.stderr.trim()) fail(`builder stderr ${args.join(' ') || 'compact'}`);
  return result.stdout.trim();
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function sha256Utf8(value) {
  return crypto.createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');
}

function assertAbiCanonicalization() {
  const semanticallySameA = [{ type: 'function', name: 'setTier', inputs: [{ name: 'account', type: 'address' }], outputs: [] }];
  const semanticallySameB = [{ outputs: [], inputs: [{ type: 'address', name: 'account' }], name: 'setTier', type: 'function' }];
  const semanticallyDifferent = [{ type: 'function', name: 'setFeeTier', inputs: [{ name: 'account', type: 'address' }], outputs: [] }];
  const hashA = sha256Utf8(canonicalJson(semanticallySameA));
  const hashB = sha256Utf8(canonicalJson(semanticallySameB));
  const hashC = sha256Utf8(canonicalJson(semanticallyDifferent));
  if (hashA !== hashB) fail('abi canonical positive');
  if (hashA === hashC) fail('abi canonical negative');
}

function assertBuilderRejectsUnsupportedArgs() {
  const result = spawnSync(process.execPath, ['scripts/build-testnet-deployment-candidate-manifest.js', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status === 0) fail('unsupported argument accepted');
  if (result.stdout.trim()) fail('unsupported argument stdout');
}

assertAbiCanonicalization();
assertBuilderRejectsUnsupportedArgs();

const compactText = run([]);
const prettyText = run(['--pretty']);
const compact = JSON.parse(compactText);
const pretty = JSON.parse(prettyText);
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8').replace(/^\uFEFF/, ''));

const hex64 = /^[a-f0-9]{64}$/;
if (canonicalJson(compact) !== canonicalJson(pretty)) fail('compact-pretty mismatch');
function requireExpected(pathLabel, actualValue, expectedValue) {
  if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) fail(`expected ${pathLabel} mismatch`);
}

requireExpected('schemaName', compact.schemaName, expected.schemaName);
requireExpected('schemaVersion', compact.schemaVersion, expected.schemaVersion);
requireExpected('status', compact.status, expected.status);
requireExpected('sourceOfTruthDecisionStatus', compact.sourceOfTruthDecisionStatus, expected.sourceOfTruthDecisionStatus);
requireExpected('token', compact.token, expected.token);
requireExpected('constructor', compact.constructor, expected.constructor);
requireExpected('gates', compact.gates, expected.gates);
requireExpected('safeToDeploy', compact.safeToDeploy, expected.safeToDeploy);
requireExpected('safeToPerformFundedTransaction', compact.safeToPerformFundedTransaction, expected.safeToPerformFundedTransaction);
requireExpected('safeToPerformGovernanceTransaction', compact.safeToPerformGovernanceTransaction, expected.safeToPerformGovernanceTransaction);
requireExpected('safeToVerifyBscScan', compact.safeToVerifyBscScan, expected.safeToVerifyBscScan);
requireExpected('safeToClaimReadiness', compact.safeToClaimReadiness, expected.safeToClaimReadiness);
requireExpected('nonApproval', compact.nonApproval, expected.nonApproval);
requireExpected('sourceBundle.normalizedSourceBundleSha256', compact.sourceBundle.normalizedSourceBundleSha256, expected.sourceBundle.normalizedSourceBundleSha256);

for (const contractName of Object.keys(expected.contracts)) {
  const actualContract = compact.contracts[contractName];
  const expectedContract = expected.contracts[contractName];
  for (const field of ['abiSha256', 'creationBytecodeTemplateSha256', 'runtimeBytecodeTemplateSha256', 'sourceSha256', 'compilerSettingsSha256']) {
    requireExpected(`contracts.${contractName}.${field}`, actualContract[field], expectedContract[field]);
  }
  requireExpected(`contracts.${contractName}.compilerLongVersion`, actualContract.compilerLongVersion, expectedContract.compilerLongVersion);
  requireExpected(`contracts.${contractName}.creationBytecodeHashSemantics`, actualContract.creationBytecodeHashSemantics, expectedContract.creationBytecodeHashSemantics);
  requireExpected(`contracts.${contractName}.runtimeBytecodeHashSemantics`, actualContract.runtimeBytecodeHashSemantics, expectedContract.runtimeBytecodeHashSemantics);
  requireExpected(`contracts.${contractName}.rawBytecodeIncluded`, actualContract.rawBytecodeIncluded, expectedContract.rawBytecodeIncluded);
  requireExpected(`contracts.${contractName}.constructorArgumentsIncluded`, actualContract.constructorArgumentsIncluded, expectedContract.constructorArgumentsIncluded);
  requireExpected(`contracts.${contractName}.finalDeploymentHashesAvailable`, actualContract.finalDeploymentHashesAvailable, expectedContract.finalDeploymentHashesAvailable);
  requireExpected(`contracts.${contractName}.finalInitCodeSha256`, actualContract.finalInitCodeSha256, expectedContract.finalInitCodeSha256);
  requireExpected(`contracts.${contractName}.finalRuntimeBytecodeSha256`, actualContract.finalRuntimeBytecodeSha256, expectedContract.finalRuntimeBytecodeSha256);
}
if (compactText !== JSON.stringify(compact)) fail('compact output formatting');
if (prettyText !== JSON.stringify(pretty, null, 2)) fail('pretty output formatting');

if (compact.schemaName !== 'VGC_TESTNET_DEPLOYMENT_CANDIDATE_MANIFEST') fail('schemaName');
if (compact.schemaVersion !== 1) fail('schemaVersion');
if (compact.network.chainId !== 97) fail('chainId');
if (compact.token.name !== 'FUNKY RAVE' || compact.token.symbol !== 'FUNKY') fail('token identity');
if (compact.constructor.valuesIncluded !== false) fail('constructor values included');
if (!compact.constructor.inputs.some((input) => input.name === 'initialAdmin' && input.type === 'address')) fail('initialAdmin schema');
if (!compact.constructor.inputs.some((input) => input.name === 'initialFeeRecipient' && input.type === 'address')) fail('initialFeeRecipient schema');

for (const contract of Object.values(compact.contracts)) {
  for (const field of ['abiSha256', 'creationBytecodeTemplateSha256', 'runtimeBytecodeTemplateSha256', 'sourceSha256', 'compilerSettingsSha256']) {
    if (!hex64.test(contract[field])) fail(`${contract.contractName}.${field}`);
  }
  if (contract.constructorArgumentsIncluded !== false) fail(`${contract.contractName}.constructorArgumentsIncluded`);
  if (contract.finalDeploymentHashesAvailable !== false) fail(`${contract.contractName}.finalDeploymentHashesAvailable`);
  if (contract.finalInitCodeSha256 !== null) fail(`${contract.contractName}.finalInitCodeSha256`);
  if (contract.finalRuntimeBytecodeSha256 !== null) fail(`${contract.contractName}.finalRuntimeBytecodeSha256`);
  if (contract.creationBytecodeHashSemantics !== 'raw_template_bytes_without_solc_metadata_trailer_sha256') fail(`${contract.contractName}.creation semantics`);
  if (contract.runtimeBytecodeHashSemantics !== 'raw_template_bytes_without_solc_metadata_trailer_sha256') fail(`${contract.contractName}.runtime semantics`);
  if (contract.rawBytecodeIncluded !== false) fail(`${contract.contractName}.rawBytecodeIncluded`);
  if (!contract.compilerLongVersion) fail(`${contract.contractName}.compilerLongVersion`);
  if (contract.compilerSettingsHashSemantics !== 'canonical_json_sha256_excluding_outputSelection') fail(`${contract.contractName}.compiler settings semantics`);
}
if (!compact.contracts.FunkyTierUpdater.immutableReferences || typeof compact.contracts.FunkyTierUpdater.immutableReferences.present !== 'boolean') fail('tier updater immutable references metadata');
if (!Array.isArray(compact.contracts.FunkyTierUpdater.immutableReferences.entries)) fail('tier updater immutable references entries');
if (!hex64.test(compact.sourceBundle.normalizedSourceBundleSha256)) fail('source bundle hash');

const mutated = JSON.parse(JSON.stringify(compact));
mutated.contracts.FunkyRave.creationBytecodeTemplateSha256 = '0'.repeat(64);
if (canonicalJson(mutated) === canonicalJson(expected)) fail('creation fingerprint mutation undetected');
const runtimeMutated = JSON.parse(JSON.stringify(compact));
runtimeMutated.contracts.FunkyTierUpdater.runtimeBytecodeTemplateSha256 = '0'.repeat(64);
if (canonicalJson(runtimeMutated) === canonicalJson(expected)) fail('runtime fingerprint mutation undetected');

const output = JSON.stringify(compact);
if (/0x[a-fA-F0-9]{40}/.test(output)) fail('real EVM address');
if (/0x[a-fA-F0-9]{64}/.test(output)) fail('private-key-like hex');
if (/\b(?:https?|wss?):\/\/[^\s"]*(?:rpc|alchemy|infura|quicknode|ankr|moralis|chainstack|getblock|nodereal|bsc-dataseed)[^\s"]*/i.test(output)) fail('RPC URL');
if (/api[_ -]?key\s*[:=]\s*['"`]?[A-Za-z0-9_-]{20,}/i.test(output)) fail('API key');
if (/\.env\s*=/.test(output)) fail('.env content');
if (/\b(?:postgres|postgresql|mysql|mongodb|redis):\/\//i.test(output)) fail('DB URL');
if (/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(output)) fail('JWT');
if (/\bcookie\s*[:=]/i.test(output)) fail('cookie');
if (/[A-Z]:\\Users\\/i.test(output)) fail('absolute path');
if (/\d{4}-\d{2}-\d{2}T/.test(output)) fail('timestamp');
if (/"(?:bytecode|deployedBytecode)"\s*:/.test(output)) fail('raw bytecode');

for (const key of ['safeToDeploy', 'safeToPerformFundedTransaction', 'safeToPerformGovernanceTransaction', 'safeToVerifyBscScan', 'safeToClaimReadiness']) {
  if (compact[key] !== false) fail(`${key} false`);
}
if (compact.status !== 'BLOCKED_OWNER_DECISIONS_PENDING') fail('status');
if (compact.gates.testnetPreflightGateStatus !== 'BLOCKED_OWNER_DECISIONS_PENDING') fail('testnet gate');
if (compact.gates.ownerPolicyPreflightGateStatus !== 'BLOCKED_OWNER_POLICY_DECISIONS_PENDING') fail('owner policy gate');
if (compact.gates.ownerActionIntakeFinalGateStatus !== 'OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED') fail('final gate');
if (compact.sourceOfTruthDecisionStatus !== 'SOURCE_OF_TRUTH_DECISION_PENDING') fail('source of truth');
if (compact.requiresOwnerReview !== true) fail('owner review');
if (compact.requiresLaterExplicitDeployInstruction !== true) fail('later deploy instruction');
if (!Object.values(compact.nonApproval).every((value) => value === true)) fail('nonApproval');
if (compact.feeModel.denominator !== 1000) fail('fee denominator');
if (compact.feeModel.configuredMaximumEffectivePercent !== 100) fail('fee max percent');
if (!compact.feeModel.documentationUnitConsistencyStatus) fail('fee consistency status');

console.log('testnet deployment candidate manifest tests passed');
