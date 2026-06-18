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
  return result.stdout.trim();
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

const compactText = run([]);
const prettyText = run(['--pretty']);
const compact = JSON.parse(compactText);
const pretty = JSON.parse(prettyText);
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8').replace(/^\uFEFF/, ''));

if (JSON.stringify(stable(compact)) !== JSON.stringify(stable(pretty))) fail('compact-pretty mismatch');
if (JSON.stringify(stable(compact)) !== JSON.stringify(stable(expected))) fail('expected fixture mismatch');

const hex64 = /^[a-f0-9]{64}$/;
if (compact.schemaName !== 'VGC_TESTNET_DEPLOYMENT_CANDIDATE_MANIFEST') fail('schemaName');
if (compact.schemaVersion !== 1) fail('schemaVersion');
if (compact.network.chainId !== 97) fail('chainId');
if (compact.token.name !== 'FUNKY RAVE' || compact.token.symbol !== 'FUNKY') fail('token identity');
if (compact.constructor.valuesIncluded !== false) fail('constructor values included');
if (!compact.constructor.inputs.some((input) => input.name === 'initialAdmin' && input.type === 'address')) fail('initialAdmin schema');
if (!compact.constructor.inputs.some((input) => input.name === 'initialFeeRecipient' && input.type === 'address')) fail('initialFeeRecipient schema');

for (const contract of Object.values(compact.contracts)) {
  for (const field of ['abiSha256', 'creationBytecodeSha256', 'deployedBytecodeSha256', 'sourceSha256']) {
    if (!hex64.test(contract[field])) fail(`${contract.contractName}.${field}`);
  }
}
if (!hex64.test(compact.sourceBundle.normalizedSourceBundleSha256)) fail('source bundle hash');

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
if (compact.requiresOwnerReview !== true) fail('owner review');
if (compact.requiresLaterExplicitDeployInstruction !== true) fail('later deploy instruction');
if (!Object.values(compact.nonApproval).every((value) => value === true)) fail('nonApproval');
if (compact.feeModel.denominator !== 1000) fail('fee denominator');
if (compact.feeModel.configuredMaximumEffectivePercent !== 100) fail('fee max percent');
if (!compact.feeModel.documentationUnitConsistencyStatus) fail('fee consistency status');

console.log('testnet deployment candidate manifest tests passed');
