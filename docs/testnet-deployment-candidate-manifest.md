# Testnet Deployment Candidate Manifest

The testnet deployment candidate manifest fingerprints the source files and
compiled artifacts intended for a future BNB Smart Chain testnet deployment.
It records hashes only, not raw bytecode, raw source contents, real owner
addresses, wallet funding proof, RPC URLs, API keys, or environment values.

The manifest is deterministic and no-network. It derives each contract's compiler
settings from the exact Hardhat build-info file referenced by that contract's
`.dbg.json` artifact.

Fingerprint semantics are fixed:

- ABI fingerprint: recursively stable-sort object keys, preserve array order,
  encode canonical JSON as UTF-8, then SHA-256.
- Creation bytecode template fingerprint: require the leading `0x`, validate even-length hexadecimal, decode to raw compiled creation bytecode template bytes, then SHA-256 raw bytes. Constructor arguments are not included.
- Runtime bytecode template fingerprint: require the leading `0x`, validate even-length hexadecimal, decode to raw compiled runtime bytecode template bytes, then SHA-256 raw bytes. Final deployed runtime hashes remain unavailable until owner public values and immutable constructor values are fixed.
- Source fingerprint: remove a UTF-8 BOM if present, normalize CRLF/CR to LF,
  encode as UTF-8, then SHA-256.
- Source bundle fingerprint: sort repository-relative source paths, include each
  path and UTF-8 byte length as delimiters, normalize each source to LF, then
  SHA-256 the UTF-8 bundle. Absolute paths are not included.

`finalDeploymentHashesAvailable` remains `false`, `finalInitCodeSha256` and `finalRuntimeBytecodeSha256` remain `null`, and `rawBytecodeIncluded` remains `false` because the manifest records deterministic compile templates only. Compiler settings are fingerprinted as canonical JSON with `outputSelection` excluded, while `solcLongVersion` remains required.

The manifest remains blocked because owner decisions are still pending. The `ownerActionIntakeFinalGateStatus` field is derived from live component gate outputs, not expected fixtures, to avoid recursively running the full intake artifact chain inside this manifest builder. It is
not deploy authorization, not funded transaction authorization, not governance
transaction authorization, not BscScan verification authorization, not release
authorization, not visibility-change authorization, and not readiness.

The manifest exposes the fee model for owner policy review. The source allows a
configured maximum raw fee value of `1000` with denominator `1000`, which is an
effective maximum of `100%`. That maximum, sell/LP-add fee behavior, TierUpdater
policy, trusted factory policy, pair policy, and fee exemption policy remain
pending owner decisions. The documentation unit consistency status remains
`manual_review_required` and this PR does not change contract source.

Regenerate the manifest after any legitimate contract, compiler, artifact, or
configuration change:

```powershell
npm --prefix contracts run compile
node scripts/build-testnet-deployment-candidate-manifest.js --pretty
node scripts/test-testnet-deployment-candidate-manifest.js
```

Any fingerprint change requires review. BscScan verification source must match
the canonical source and compiled candidate recorded by this manifest. A later
explicit deploy instruction is still required before any deploy action can be
considered.
