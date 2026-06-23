# CODEX v1.2.8 Restricted Token Target Spec

<!-- CODEX_QUALITY_HARNESS_FILE v1.2.8 -->

This repository consumes Codex Harness v1.2.8 as a restricted token-only
target. The rollout is metadata-only and readonly. It does not copy the Source
full bundle, add a local full quality gate, edit token contracts, run deploy
paths, use wallets, use RPC endpoints, expose secrets, create releases, or make
runtime, staging, testnet, mainnet, production, legal, BscScan, or deployment
approval claims.

## Active Contract

- `activeHarnessVersion`: `1.2.8`
- `activeSelfTestSuite`: `v128`
- `activeSelfTestStatusKey`: `v128SelfTestStatus`
- `rolloutClass`: `restricted_token`
- `materialization`: `metadata_only_readonly`
- `forbiddenScopeProfile`: `VGC_TOKEN_NO_DEPLOY_NO_VALUE_TRANSFER_V1`

## Preserved v1.2.7 Contract

v1.2.7 remains available as rollback compatibility through the manifest
`versioning` tuple. Final Decision remains final authority. PR bodies remain
human display only. Same-head evidence, safe artifacts, process receipts,
validation reuse, and Stop Circuit semantics are preserved.

## Token Economy

Routine work must read the smallest active surface:

- one managed safe artifact surface at most
- zero routine cold artifact reads
- one selected skill at most
- zero routine reviewer fanout
- zero routine owner interruption

Diagnostic cold artifact reads are allowed only after a failure and are capped
by the manifest.

## Verification

The restricted target verification is:

- `node scripts/codex-v128-self-test.mjs`
- `node scripts/codex-v127-self-test.mjs`
- `node scripts/codex-harness-version.mjs`
- repository token safety checks that do not deploy, configure, transfer value,
  use wallets, use RPC endpoints, expose secrets, or claim readiness

Source-side restricted validation may read this metadata, but it must not demand
Source full-bundle files in this target.
