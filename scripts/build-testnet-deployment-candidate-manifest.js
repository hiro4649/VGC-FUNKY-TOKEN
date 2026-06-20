const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class ManifestError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ManifestError';
    this.code = code;
  }
}

const EXPECTED_PRODUCTION_SOURCES = [
  'funky/Context.sol',
  'funky/draft-IERC6093.sol',
  'funky/ERC20.sol',
  'funky/funky.sol',
  'funky/FunkyTierUpdater.sol',
  'funky/IERC20.sol',
  'funky/IERC20Metadata.sol',
];

const SAFE_TO_FIELDS = [
  'safeToDeploy',
  'safeToPerformFundedTransaction',
  'safeToPerformGovernanceTransaction',
  'safeToVerifyBscScan',
  'safeToClaimReadiness',
];

const NON_APPROVAL_FIELDS = [
  'deployment',
  'fundedTransaction',
  'governanceTransaction',
  'bscScanVerification',
  'release',
  'publicVisibility',
  'runtimeReadiness',
  'stagingReadiness',
  'testnetReadiness',
  'mainnetReadiness',
];

function fail(code) {
  throw new ManifestError(code);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function sha256Bytes(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256Utf8(value) {
  return sha256Bytes(Buffer.from(value, 'utf8'));
}

function normalizeText(value) {
  return String(value).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertInside(parent, child, label) {
  if (!isInside(parent, child)) fail(`path-outside:${label}`);
  return child;
}

function makeContext(repoRootInput) {
  const repoRoot = fs.realpathSync(path.resolve(repoRootInput || path.join(__dirname, '..')));
  const buildInfoRoot = fs.realpathSync(path.join(repoRoot, 'contracts', 'artifacts', 'build-info'));
  return { repoRoot, buildInfoRoot };
}

function resolveRepoPath(ctx, relativePath) {
  if (path.isAbsolute(relativePath)) fail(`absolute-path-input:${relativePath}`);
  const fullPath = path.resolve(ctx.repoRoot, relativePath);
  assertInside(ctx.repoRoot, fullPath, relativePath);
  if (!fs.existsSync(fullPath)) fail(`missing:${relativePath}`);
  const realPath = fs.realpathSync(fullPath);
  assertInside(ctx.repoRoot, realPath, relativePath);
  return realPath;
}

function readUtf8(ctx, relativePath) {
  try {
    return fs.readFileSync(resolveRepoPath(ctx, relativePath), 'utf8').replace(/^\uFEFF/, '');
  } catch (error) {
    if (error instanceof ManifestError) throw error;
    fail(`read-failed:${relativePath}`);
  }
}

function readJson(ctx, relativePath) {
  try {
    return JSON.parse(readUtf8(ctx, relativePath));
  } catch (error) {
    if (error instanceof ManifestError) throw error;
    fail(`json-parse-failed:${relativePath}`);
  }
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
  for (const [name, pattern] of forbidden) {
    if (pattern.test(text)) fail(`unsafe-output:${label}:${name}`);
  }
}

function runJson(ctx, scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath, '--json'], {
    cwd: ctx.repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 1800000,
  });
  assertSafeOutput(`${result.stdout}\n${result.stderr}`, path.basename(scriptPath));
  if (result.error) fail(`upstream-error:${path.basename(scriptPath)}`);
  if (result.status !== 0) fail(`upstream-failed:${path.basename(scriptPath)}`);
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail(`upstream-json-parse:${path.basename(scriptPath)}`);
  }
}

function parseStrictHex(value, label) {
  if (typeof value !== 'string' || !value.startsWith('0x')) fail(`missing-0x:${label}`);
  const hex = value.slice(2).toLowerCase();
  if (!hex) fail(`empty-hex:${label}`);
  if (hex.length % 2 !== 0) fail(`odd-hex:${label}`);
  if (!/^[0-9a-f]+$/.test(hex)) fail(`invalid-hex:${label}`);
  const bytes = Buffer.from(hex, 'hex');
  if (bytes.length !== hex.length / 2) fail(`hex-byte-length:${label}`);
  return { prefixedHex: `0x${hex}`, hex, bytes };
}

function parseBuildInfoHex(value, label) {
  if (typeof value !== 'string') fail(`build-info-hex-type:${label}`);
  return parseStrictHex(value.startsWith('0x') ? value : `0x${value}`, label);
}

function extractSolidityMetadata(bytes, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 4) fail(`metadata-unavailable:${label}`);
  const metadataLength = bytes.readUInt16BE(bytes.length - 2);
  const trailerLength = metadataLength + 2;
  if (trailerLength <= 2 || trailerLength >= bytes.length) fail(`metadata-length:${label}`);
  const metadataStart = bytes.length - trailerLength;
  const first = bytes[metadataStart];
  if (first < 0xa0 || first > 0xbf) fail(`metadata-cbor:${label}`);
  const metadataBytes = bytes.subarray(metadataStart);
  const executableBytes = bytes.subarray(0, metadataStart);
  return {
    executableBytes,
    metadataBytes,
    metadataTrailerSha256: sha256Bytes(metadataBytes),
    metadataTrailerByteLength: metadataBytes.length,
  };
}

function deepEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.every(deepEmpty);
  if (typeof value === 'object') return Object.keys(value).every((key) => deepEmpty(value[key]));
  return false;
}

function traverseAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((item) => traverseAst(item, visit));
    else traverseAst(value, visit);
  }
}

function deriveImportClosure(buildInfo, roots) {
  const outputSources = buildInfo.output && buildInfo.output.sources;
  if (!outputSources) fail('build-info-output-sources-missing');
  const seen = new Set();
  const visitSource = (sourceName) => {
    if (seen.has(sourceName)) return;
    if (!outputSources[sourceName] || !outputSources[sourceName].ast) fail(`production-source-output-missing:${sourceName}`);
    seen.add(sourceName);
    traverseAst(outputSources[sourceName].ast, (node) => {
      if (node.nodeType === 'ImportDirective' && node.absolutePath) visitSource(node.absolutePath);
    });
  };
  roots.forEach(visitSource);
  return Array.from(seen).sort();
}

function astVariableNameMap(buildInfo) {
  const names = new Map();
  for (const source of Object.values((buildInfo.output && buildInfo.output.sources) || {})) {
    if (!source.ast) continue;
    traverseAst(source.ast, (node) => {
      if (node.nodeType === 'VariableDeclaration' && node.id !== undefined && node.name) {
        names.set(String(node.id), node.name);
      }
    });
  }
  return names;
}

function summarizeImmutableReferences(value, buildInfo) {
  if (deepEmpty(value)) return { present: false, entries: [] };
  const names = astVariableNameMap(buildInfo);
  const entries = [];
  for (const astId of Object.keys(value).sort((a, b) => Number(a) - Number(b))) {
    const refs = value[astId];
    if (!Array.isArray(refs)) fail(`immutable-reference-shape:${astId}`);
    const references = refs.map((ref) => {
      if (!Number.isInteger(ref.start) || !Number.isInteger(ref.length)) fail(`immutable-reference-range:${astId}`);
      return { start: ref.start, length: ref.length };
    }).sort((a, b) => a.start - b.start || a.length - b.length);
    entries.push({ astId, name: names.get(astId) || null, referenceCount: references.length, references });
  }
  return { present: entries.length > 0, entries };
}

function buildInfoForArtifact(ctx, dbgRelativePath) {
  const dbgPath = resolveRepoPath(ctx, dbgRelativePath);
  let dbg;
  try {
    dbg = JSON.parse(fs.readFileSync(dbgPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    fail(`debug-artifact-json:${dbgRelativePath}`);
  }
  if (!dbg.buildInfo || typeof dbg.buildInfo !== 'string') fail(`debug-artifact-build-info-missing:${dbgRelativePath}`);
  const candidate = path.resolve(path.dirname(dbgPath), dbg.buildInfo);
  assertInside(ctx.repoRoot, candidate, 'build-info-candidate');
  if (!fs.existsSync(candidate)) fail(`build-info-missing:${dbgRelativePath}`);
  const realPath = fs.realpathSync(candidate);
  assertInside(ctx.buildInfoRoot, realPath, 'build-info-realpath');
  try {
    const text = fs.readFileSync(realPath, 'utf8').replace(/^\uFEFF/, '');
    return { buildInfo: JSON.parse(text), buildInfoText: text };
  } catch {
    fail(`build-info-json:${dbgRelativePath}`);
  }
}

function settingsWithoutOutputSelection(settings) {
  const copy = { ...(settings || {}) };
  delete copy.outputSelection;
  return stable(copy);
}

function productionCompilerInput(buildInfo, sourceInfos) {
  return stable({
    language: buildInfo.input.language,
    sources: Object.fromEntries(sourceInfos.map((source) => [source.sourceName, { content: source.normalizedContent }])),
    settings: settingsWithoutOutputSelection(buildInfo.input.settings),
  });
}

function sourceClosureInfo(ctx, buildInfo) {
  const closure = deriveImportClosure(buildInfo, ['funky/funky.sol', 'funky/FunkyTierUpdater.sol']);
  if (canonicalJson(closure) !== canonicalJson(EXPECTED_PRODUCTION_SOURCES.slice().sort())) fail('production-source-closure-mismatch');
  if (closure.some((sourceName) => /(^|\/)Mock/.test(sourceName))) fail('production-source-closure-mock-source');
  const orderedClosure = EXPECTED_PRODUCTION_SOURCES.slice();
  const sourceInfos = orderedClosure.map((sourceName) => {
    const inputSource = buildInfo.input && buildInfo.input.sources && buildInfo.input.sources[sourceName];
    if (!inputSource || typeof inputSource.content !== 'string') fail(`build-info-source-content-missing:${sourceName}`);
    const repoPath = `contracts/${sourceName}`;
    const filesystemContent = normalizeText(readUtf8(ctx, repoPath));
    const buildInfoContent = normalizeText(inputSource.content);
    if (filesystemContent !== buildInfoContent) fail(`source-build-info-content-mismatch:${sourceName}`);
    return {
      sourceName,
      path: repoPath,
      normalizedContent: buildInfoContent,
      normalizedSourceSha256: sha256Utf8(buildInfoContent),
      normalizedUtf8ByteLength: Buffer.byteLength(buildInfoContent, 'utf8'),
    };
  });
  const publicInfos = sourceInfos.map(({ path: sourcePath, normalizedSourceSha256, normalizedUtf8ByteLength }) => ({
    path: sourcePath,
    normalizedSourceSha256,
    normalizedUtf8ByteLength,
  }));
  return {
    sourceInfos,
    publicInfos,
    includedSourcePaths: sourceInfos.map((source) => source.path),
    normalizedSourceBundleSha256: sha256Utf8(canonicalJson(publicInfos)),
  };
}

function compiledContract(buildInfo, sourceName, contractName) {
  const contract = buildInfo.output && buildInfo.output.contracts && buildInfo.output.contracts[sourceName] && buildInfo.output.contracts[sourceName][contractName];
  if (!contract) fail(`build-info-contract-missing:${contractName}`);
  return contract;
}

function artifactInfo(ctx, shared, spec) {
  const artifact = readJson(ctx, spec.artifactPath);
  if (artifact.contractName !== spec.contractName) fail(`artifact-contract-name:${spec.contractName}`);
  if (artifact.sourceName !== spec.sourceName) fail(`artifact-source-name:${spec.contractName}`);
  const { buildInfo, buildInfoText } = buildInfoForArtifact(ctx, spec.dbgPath);
  const compiled = compiledContract(buildInfo, spec.sourceName, spec.contractName);
  const artifactCreation = parseStrictHex(artifact.bytecode, `${spec.contractName}:artifact-creation`);
  const artifactRuntime = parseStrictHex(artifact.deployedBytecode, `${spec.contractName}:artifact-runtime`);
  const buildCreation = parseBuildInfoHex(compiled.evm && compiled.evm.bytecode && compiled.evm.bytecode.object, `${spec.contractName}:build-creation`);
  const buildRuntime = parseBuildInfoHex(compiled.evm && compiled.evm.deployedBytecode && compiled.evm.deployedBytecode.object, `${spec.contractName}:build-runtime`);
  if (artifactCreation.hex !== buildCreation.hex) fail(`artifact-build-info-creation-mismatch:${spec.contractName}`);
  if (artifactRuntime.hex !== buildRuntime.hex) fail(`artifact-build-info-runtime-mismatch:${spec.contractName}`);
  if (!deepEmpty(artifact.linkReferences)) fail(`artifact-link-references:${spec.contractName}`);
  if (!deepEmpty(artifact.deployedLinkReferences)) fail(`artifact-deployed-link-references:${spec.contractName}`);
  if (!deepEmpty(compiled.evm.bytecode.linkReferences)) fail(`build-info-link-references:${spec.contractName}`);
  if (!deepEmpty(compiled.evm.deployedBytecode.linkReferences)) fail(`build-info-deployed-link-references:${spec.contractName}`);
  const creationMetadata = extractSolidityMetadata(artifactCreation.bytes, `${spec.contractName}:creation`);
  const runtimeMetadata = extractSolidityMetadata(artifactRuntime.bytes, `${spec.contractName}:runtime`);
  const immutableReferences = summarizeImmutableReferences(compiled.evm.deployedBytecode.immutableReferences || {}, buildInfo);
  if (spec.contractName === 'FunkyTierUpdater') {
    if (!immutableReferences.present || !immutableReferences.entries.some((entry) => entry.name === 'funkyToken')) fail('immutable-reference-missing:FunkyTierUpdater.funkyToken');
  }
  if (spec.contractName === 'FunkyRave' && immutableReferences.present) fail('immutable-reference-unexpected:FunkyRave');
  const settings = settingsWithoutOutputSelection(buildInfo.input.settings);
  return stable({
    contractName: spec.contractName,
    sourcePath: `contracts/${spec.sourceName}`,
    artifactPath: spec.artifactPath,
    debugArtifactPath: spec.dbgPath,
    compilerVersion: buildInfo.solcVersion,
    compilerLongVersion: buildInfo.solcLongVersion,
    compilerSettingsSha256: sha256Utf8(canonicalJson(settings)),
    compilerSettingsHashSemantics: 'canonical_json_sha256_excluding_outputSelection',
    optimizerEnabled: buildInfo.input.settings.optimizer && buildInfo.input.settings.optimizer.enabled === true,
    optimizerRuns: buildInfo.input.settings.optimizer ? buildInfo.input.settings.optimizer.runs : null,
    evmVersion: buildInfo.input.settings.evmVersion || null,
    metadataSettings: stable(buildInfo.input.settings.metadata || null),
    libraries: stable(buildInfo.input.settings.libraries || {}),
    remappings: stable(buildInfo.input.settings.remappings || []),
    viaIR: buildInfo.input.settings.viaIR === true,
    debugSettings: stable(buildInfo.input.settings.debug || null),
    artifactBuildInfoSha256: sha256Utf8(canonicalJson(JSON.parse(buildInfoText))),
    productionCompilerInputSha256: shared.productionCompilerInputSha256,
    abiSha256: sha256Utf8(canonicalJson(artifact.abi)),
    creationBytecodeTemplateFullSha256: sha256Bytes(artifactCreation.bytes),
    runtimeBytecodeTemplateFullSha256: sha256Bytes(artifactRuntime.bytes),
    creationExecutableTemplateSha256: sha256Bytes(creationMetadata.executableBytes),
    runtimeExecutableTemplateSha256: sha256Bytes(runtimeMetadata.executableBytes),
    creationMetadataTrailerSha256: creationMetadata.metadataTrailerSha256,
    creationMetadataTrailerByteLength: creationMetadata.metadataTrailerByteLength,
    runtimeMetadataTrailerSha256: runtimeMetadata.metadataTrailerSha256,
    runtimeMetadataTrailerByteLength: runtimeMetadata.metadataTrailerByteLength,
    bytecodeHashSemantics: 'full_template_raw_bytes_sha256_with_metadata; executable_template_hashes_are_supplemental_metadata-stripped_hashes',
    constructorArgumentsIncluded: false,
    finalDeploymentHashesAvailable: false,
    finalInitCodeSha256: null,
    finalRuntimeBytecodeSha256: null,
    rawBytecodeIncluded: false,
    linkReferencesEmpty: true,
    deployedLinkReferencesEmpty: true,
    immutableReferences,
    bytecodePresent: true,
    ...(spec.componentStatus ? { componentStatus: spec.componentStatus } : {}),
  });
}

function constructorInputsFromArtifact(ctx) {
  const artifact = readJson(ctx, 'contracts/artifacts/funky/funky.sol/FunkyRave.json');
  const constructors = artifact.abi.filter((entry) => entry.type === 'constructor');
  if (constructors.length !== 1) fail('constructor-abi-missing');
  const ctor = constructors[0];
  if (ctor.stateMutability !== 'nonpayable') fail('constructor-state-mutability');
  const expected = [
    { name: 'initialAdmin', type: 'address' },
    { name: 'initialFeeRecipient', type: 'address' },
  ];
  const inputs = ctor.inputs || [];
  if (inputs.length !== expected.length) fail('constructor-input-count');
  return expected.map((item, index) => {
    const actual = inputs[index];
    if (!actual || actual.name !== item.name || actual.type !== item.type) fail(`constructor-input-order:${item.name}`);
    return { ...item, status: 'pending_owner_public_value' };
  });
}

function assertTokenAst(buildInfo) {
  const ast = buildInfo.output.sources['funky/funky.sol'] && buildInfo.output.sources['funky/funky.sol'].ast;
  if (!ast) fail('token-ast-missing');
  let identityOk = false;
  let supplyOk = false;
  traverseAst(ast, (node) => {
    if (node.nodeType === 'ModifierInvocation' && node.kind === 'baseConstructorSpecifier') {
      const args = node.arguments || [];
      if (args.length === 2 && args[0].nodeType === 'Literal' && args[1].nodeType === 'Literal' && args[0].value === 'FUNKY RAVE' && args[1].value === 'FUNKY') identityOk = true;
    }
    if (node.nodeType === 'FunctionCall') {
      const expressionName = node.expression && (node.expression.name || node.expression.memberName);
      const args = node.arguments || [];
      if (expressionName === '_mint' && args[0] && args[1]) {
        const recipientOk = args[0].name === 'initialAdmin';
        const literal = args[1].nodeType === 'Literal' && args[1].value === '30_000_000_000e18';
        if (recipientOk && literal) supplyOk = true;
      }
    }
  });
  if (!identityOk) fail('token-identity-ast');
  if (!supplyOk) fail('initial-supply-ast');
}

function extractDefaultTierValues(source) {
  const tiers = {};
  const re = /feePercent\[(\d+)\]\s*=\s*(\d+)\s*;/g;
  let match;
  while ((match = re.exec(source)) !== null) tiers[`holdingDays_${match[1]}`] = Number(match[2]);
  if (Object.keys(tiers).length === 0) fail('fee-tier-values-unavailable');
  return tiers;
}

function assertAllFalse(source, fields, label) {
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) fail(`safe-field-missing:${label}.${field}`);
    if (source[field] !== false) fail(`safe-field-not-false:${label}.${field}`);
  }
}

function assertNonApproval(source, label) {
  if (!source || typeof source !== 'object') fail(`non-approval-missing:${label}`);
  for (const field of NON_APPROVAL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) fail(`non-approval-field-missing:${label}.${field}`);
    if (source[field] !== true) fail(`non-approval-field-not-true:${label}.${field}`);
  }
}

function compareManifest(actual, expected) {
  if (canonicalJson(actual) !== canonicalJson(expected)) fail('manifest-fixture-mismatch');
}

function buildManifest(options = {}) {
  const ctx = makeContext(options.repoRoot);
  const { buildInfo } = buildInfoForArtifact(ctx, 'contracts/artifacts/funky/funky.sol/FunkyRave.dbg.json');
  const sourceClosure = sourceClosureInfo(ctx, buildInfo);
  assertTokenAst(buildInfo);
  const productionCompilerInputSha256 = sha256Utf8(canonicalJson(productionCompilerInput(buildInfo, sourceClosure.sourceInfos)));
  const shared = { productionCompilerInputSha256 };

  const repoSafety = runJson(ctx, 'scripts/audit-vgc-token-repo-safety.js');
  const sourceInvariant = runJson(ctx, 'scripts/audit-vgc-token-source-invariants.js');
  const testnetGate = runJson(ctx, 'scripts/check-testnet-preflight-gate.js');
  const ownerPolicyGate = runJson(ctx, 'scripts/check-owner-policy-preflight-gate.js');
  const ownerActionPacket = runJson(ctx, 'scripts/build-deployment-readiness-owner-action-packet.js');
  const blockerRegistry = runJson(ctx, 'scripts/build-deployment-readiness-blocker-registry.js');
  const sourceOfTruth = runJson(ctx, 'scripts/build-source-of-truth-repository-decision.js');
  const ownerActionIntakeFinalGate = runJson(ctx, 'scripts/check-deployment-readiness-owner-action-intake-final-gate.js');

  assertAllFalse(testnetGate, SAFE_TO_FIELDS, 'testnetGate');
  assertAllFalse(ownerPolicyGate, SAFE_TO_FIELDS, 'ownerPolicyGate');
  assertAllFalse(sourceOfTruth, ['safeToDeploy', 'safeToVerifyBscScan', 'safeToClaimReadiness'], 'sourceOfTruth');
  assertAllFalse(ownerActionIntakeFinalGate, SAFE_TO_FIELDS, 'ownerActionIntakeFinalGate');
  assertNonApproval(ownerActionPacket.nonApproval, 'ownerActionPacket');
  if (ownerActionIntakeFinalGate.nonApproval) assertNonApproval(ownerActionIntakeFinalGate.nonApproval, 'ownerActionIntakeFinalGate');

  if (repoSafety.overall !== 'pass') fail('repo-safety-status');
  if (sourceInvariant.overall !== 'pass_with_manual_review_items') fail('source-invariant-status');
  if (testnetGate.status !== 'BLOCKED_OWNER_DECISIONS_PENDING') fail('testnet-gate-status');
  if (ownerPolicyGate.status !== 'BLOCKED_OWNER_POLICY_DECISIONS_PENDING') fail('owner-policy-gate-status');
  if (ownerActionPacket.status !== 'OWNER_ACTIONS_REQUIRED') fail('owner-action-packet-status');
  if (blockerRegistry.status !== 'DEPLOYMENT_READINESS_BLOCKED') fail('blocker-registry-status');
  if (sourceOfTruth.status !== 'SOURCE_OF_TRUTH_DECISION_PENDING') fail('source-of-truth-status');
  if (ownerActionIntakeFinalGate.status !== 'OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED') fail('owner-action-intake-final-gate-status');

  const funkySource = normalizeText(readUtf8(ctx, 'contracts/funky/funky.sol'));
  const nonApproval = Object.fromEntries(NON_APPROVAL_FIELDS.map((field) => [field, true]));
  const manifest = stable({
    schemaName: 'VGC_TESTNET_DEPLOYMENT_CANDIDATE_MANIFEST',
    schemaVersion: 1,
    status: 'BLOCKED_OWNER_DECISIONS_PENDING',
    candidateId: 'FUNKY_RAVE_BSC_TESTNET_CANDIDATE_V1',
    sourceOfTruthRepository: 'hiro4649/VGC-FUNKY-TOKEN',
    sourceOfTruthDecisionStatus: sourceOfTruth.status,
    network: { name: 'BNB Smart Chain testnet', chainId: 97, approvalStatus: 'OWNER_APPROVAL_PENDING' },
    token: { name: 'FUNKY RAVE', symbol: 'FUNKY', decimals: 18, initialSupplyTokens: '30000000000' },
    contracts: {
      FunkyRave: artifactInfo(ctx, shared, {
        contractName: 'FunkyRave',
        sourceName: 'funky/funky.sol',
        artifactPath: 'contracts/artifacts/funky/funky.sol/FunkyRave.json',
        dbgPath: 'contracts/artifacts/funky/funky.sol/FunkyRave.dbg.json',
      }),
      FunkyTierUpdater: artifactInfo(ctx, shared, {
        contractName: 'FunkyTierUpdater',
        sourceName: 'funky/FunkyTierUpdater.sol',
        artifactPath: 'contracts/artifacts/funky/FunkyTierUpdater.sol/FunkyTierUpdater.json',
        dbgPath: 'contracts/artifacts/funky/FunkyTierUpdater.sol/FunkyTierUpdater.dbg.json',
        componentStatus: 'SEPARATE_GOVERNANCE_COMPONENT_PENDING_OWNER_POLICY',
      }),
    },
    sourceBundle: {
      includedSourcePaths: sourceClosure.includedSourcePaths,
      productionSourceCount: sourceClosure.includedSourcePaths.length,
      mockSourceCount: 0,
      filesystemBuildInfoSourceEquality: 'pass',
      normalizedSourceBundleSha256: sourceClosure.normalizedSourceBundleSha256,
      sources: sourceClosure.publicInfos,
    },
    constructor: { valuesIncluded: false, inputs: constructorInputsFromArtifact(ctx) },
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
      ownerActionIntakeFinalGateStatus: ownerActionIntakeFinalGate.status,
      ownerActionIntakeFinalGateStatusSource: 'live_final_gate_json',
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
  const output = JSON.stringify(manifest);
  assertSafeOutput(output, 'manifest');
  if (/"(?:bytecode|deployedBytecode)"\s*:/.test(output)) fail('raw-bytecode-output');
  return manifest;
}

function main() {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--pretty')) fail('unsupported-argument');
    const manifest = buildManifest();
    process.stdout.write(JSON.stringify(manifest, null, args[0] === '--pretty' ? 2 : 0));
    process.stdout.write('\n');
  } catch (error) {
    const code = error instanceof ManifestError ? error.code : 'unexpected-error';
    process.stderr.write(`testnet deployment candidate manifest failed: ${code}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  ManifestError,
  canonicalJson,
  parseStrictHex,
  extractSolidityMetadata,
  deriveImportClosure,
  compareManifest,
  summarizeImmutableReferences,
  assertAllFalse,
  buildManifest,
  stable,
};
