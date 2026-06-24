# CODEX v1.2.9 Target Profile

CODEX_QUALITY_HARNESS_FILE v1.2.9

This repository is enrolled as a HARNESS v1.2.9 target profile.

## Active Tuple

- activeHarnessVersion: 1.2.9
- targetHarnessVersion: 1.2.9
- activeSelfTestSuite: v129
- targetRollout: completed
- rolloutClass: restricted_token
- materialization: metadata_only_readonly
- sourceHarnessCommit: 07bba3cba7456375194fc25fe1d2108a893502d0

## Target Materialization Contract

- The Source full bundle is not copied into this target.
- The target stores only the active manifest, active policy index, compact target spec, version helper, and target self-tests.
- Real host execution remains user-local trusted adapter only.
- Model IDs are not pinned in the target repository.
- Plugin default is none, and unavailable plugins are explicit nonblocking state.
- Independent verifier remains required.
- Final authority remains v1.1.8_final_decision_kernel.
- Routine cold artifact reads are 0, selected skill max is 1, reviewer fanout is 0, and routine owner interrupt max is 0.
- Product code, runtime code, package/lockfile, workflow, deploy, wallet, RPC, secret, and readiness mutation are forbidden for this rollout.

## Rollback

v1.2.8 / v128 is retained as rollback compatibility, and v1.2.7 / v127 remains compatibility evidence.
