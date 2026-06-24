# CODEX v1.2.9 Target Contract

<!-- CODEX_QUALITY_HARNESS_BEGIN -->
CODEX_QUALITY_HARNESS_FILE v1.2.9

VGC-FUNKY-TOKEN is a restricted token-only managed target for HARNESS v1.2.9.
The rollout is metadata-only and readonly.

## Active Tuple

- activeHarnessVersion: 1.2.9
- activeSelfTestSuite: v129
- activeSelfTestStatusKey: v129SelfTestStatus
- targetHarnessVersion: 1.2.9
- targetRollout: completed
- rolloutClass: restricted_token
- materialization: metadata_only_readonly

## Preserved Authority

v1.1.8 Final Decision remains the final authority. PR bodies are display-only.
v1.2.8 remains rollback compatibility and v1.2.7 remains compatibility.

## Restricted Token Boundary

This target does not authorize deploys, funded transactions, governance
transactions, BscScan verification, wallet access, RPC access, secrets, runtime
readiness, staging readiness, testnet readiness, mainnet readiness, production
readiness, legal compliance, release activity, or visibility changes.

## v1.2.9 Target Materialization

The target stores only metadata and a target-specific self-test. It does not
copy the Source full bundle, pin a model ID, store a host adapter, create
authority, mutate product/runtime/package/workflow scope, or add a local full
quality gate.

<!-- CODEX_QUALITY_HARNESS_END -->
