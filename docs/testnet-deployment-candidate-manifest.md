# Testnet Deployment Candidate Manifest

The testnet deployment candidate manifest fingerprints the source files and
compiled artifacts intended for a future BNB Smart Chain testnet deployment.
It records hashes only, not raw bytecode, raw source contents, real owner
addresses, wallet funding proof, RPC URLs, API keys, or environment values.

The manifest is deterministic and no-network. It derives compiler settings from
Hardhat build-info and derives ABI, creation bytecode, runtime bytecode, source,
and normalized source bundle fingerprints with SHA-256.

The manifest remains blocked because owner decisions are still pending. It is
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
