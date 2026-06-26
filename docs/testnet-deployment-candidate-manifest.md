# Testnet Deployment Candidate Manifest

The testnet deployment candidate manifest fingerprints the production source closure and compiled artifacts intended for a possible later BNB Smart Chain testnet deployment. It records hashes and safety statuses only, not raw bytecode, raw source contents, real owner addresses, wallet funding proof, RPC URLs, API keys, environment values, or deploy results.

The manifest is deterministic, no-deploy, and no-RPC. It resolves each Hardhat artifact's sibling `.dbg.json`, verifies the referenced build-info real path stays under `contracts/artifacts/build-info`, and binds the artifact bytecode to the exact build-info contract output before any fingerprint is recorded.

Production source closure is derived from the Solidity AST import graph, not from the whole build-info source map. The root sources are `funky/funky.sol` and `funky/FunkyTierUpdater.sol`. The required production closure is exactly:

- `contracts/funky/Context.sol`
- `contracts/funky/draft-IERC6093.sol`
- `contracts/funky/ERC20.sol`
- `contracts/funky/funky.sol`
- `contracts/funky/FunkyTierUpdater.sol`
- `contracts/funky/IERC20.sol`
- `contracts/funky/IERC20Metadata.sol`

Mock contracts are excluded from the production closure. For every production source, the builder normalizes BOM and CRLF/CR to LF, then verifies the filesystem source content equals `buildInfo.input.sources[sourceName].content`. The source bundle hash is SHA-256 over canonical JSON source metadata objects containing path, normalized source SHA-256, and normalized UTF-8 byte length. Raw source text is not emitted.

Fingerprint semantics are fixed:

- ABI fingerprint: recursively stable-sort object keys, preserve array order, encode canonical JSON as UTF-8, then SHA-256.
- Full creation bytecode template fingerprint: require artifact `0x` hex, validate even-length hexadecimal, decode raw bytes, verify exact equality with build-info creation bytecode, then SHA-256 the full metadata-including raw bytes.
- Full runtime bytecode template fingerprint: require artifact `0x` hex, validate even-length hexadecimal, decode raw bytes, verify exact equality with build-info runtime bytecode, then SHA-256 the full metadata-including raw bytes.
- Executable template fingerprints: record metadata-stripped creation/runtime hashes as the cross-run fixture-locked bytecode fingerprints, separate from the full template hashes.
- Solidity metadata trailer fingerprints: require metadata extraction to succeed and record trailer SHA-256 plus byte length for creation and runtime bytecode.
- Compiler input fingerprint: hash canonical JSON for the production compiler input subset: language, production closure source contents, and compiler settings excluding `outputSelection`.
- Compiler settings fingerprint: hash canonical JSON settings excluding `outputSelection`; optimizer, runs, EVM version, metadata settings, libraries, remappings, viaIR, and debug settings remain visible as manifest metadata.

The self-test fixture comparison deliberately masks full metadata-including bytecode hashes, metadata trailer hashes, and whole build-info hashes before comparing expected and generated manifests. Those fields are still emitted and shape-checked as diagnostic evidence, but Solidity metadata/build-info payloads can vary across runner environments. The stable fixture guard is therefore the production source closure, source/build-info content equality, compiler input/settings fingerprints, metadata-stripped executable bytecode fingerprints, constructor and immutable-reference evidence, live final-gate status, and the safe/non-approval boundary fields.

`finalDeploymentHashesAvailable` remains `false`, and `finalInitCodeSha256` / `finalRuntimeBytecodeSha256` remain `null`, because owner public constructor values and immutable constructor values are not fixed by this manifest. `rawBytecodeIncluded` remains `false`.

The manifest validates token identity and initial supply through the Solidity AST, not regex text matching. It validates the constructor ABI order and `nonpayable` state mutability. It also records immutable reference metadata: `FunkyRave` must have no immutable references, while `FunkyTierUpdater` must prove the `funkyToken` immutable reference is present.

The manifest remains blocked because owner decisions are still pending. The `ownerActionIntakeFinalGateStatus` field is read from live JSON output of `scripts/check-deployment-readiness-owner-action-intake-final-gate.js --json`; it is not hardcoded and not derived from expected fixtures. All upstream safe-to fields must be present and exactly `false`, and non-approval boundaries must remain true.

This manifest is not deploy authorization, not funded transaction authorization, not governance transaction authorization, not BscScan verification authorization, not release authorization, not visibility-change authorization, and not readiness.

The manifest exposes the fee model for owner policy review. The source allows a configured maximum raw fee value of `1000` with denominator `1000`, which is an effective maximum of `100%`. That maximum, sell/LP-add fee behavior, TierUpdater policy, trusted factory policy, pair policy, and fee exemption policy remain pending owner decisions. The documentation unit consistency status remains `manual_review_required` and this PR does not change contract source.

Regenerate the manifest after any legitimate contract, compiler, artifact, or configuration change:

```powershell
npm --prefix contracts run compile
node scripts/build-testnet-deployment-candidate-manifest.js --pretty
node scripts/test-testnet-deployment-candidate-manifest.js
```

Any fingerprint change requires review. BscScan verification source must match the canonical source and compiled candidate recorded by this manifest. A later explicit deploy instruction is still required before any deploy action can be considered.
