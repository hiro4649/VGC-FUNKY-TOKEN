# VGC-FUNKY-TOKEN Harness Profile v1.1.8

## Profile

- targetRepoType: token_only_managed
- activeHarnessVersion: 1.1.8
- activeSelfTestSuite: v118
- forbiddenScopeProfile: VGC_TOKEN_NO_DEPLOY_NO_VALUE_TRANSFER_V1
- verificationProfile: TOKEN_READONLY_HARNESS_L1
- mergeReadinessProfile: SAME_HEAD_REQUIRED_CHECKS_CLEAN
- staleEvidencePolicy: CURRENT_HEAD_ARTIFACT_REQUIRED

## Readonly Boundary

This profile is metadata-only. It does not authorize product implementation,
contract changes, package changes, workflow changes, deployment, token release,
runtime activity, owner-value changes, wallet access, RPC access, BscScan
verification, or readiness claims.

## Forbidden Scope

- deploy: forbidden
- funded transaction: forbidden
- governance transaction: forbidden
- BscScan verification: forbidden
- release: forbidden
- visibility change: forbidden
- runtime readiness claim: forbidden
- production readiness claim: forbidden
- legal compliance claim: forbidden
- secret or RPC value exposure: forbidden
- wallet access: forbidden
- raw logs: forbidden
- 8-session operation: forbidden

## v1.1.8 Evidence Semantics

Final Decision artifacts are the first machine decision source. Evidence
Capsules describe current-head evidence and stale-evidence boundaries.
Artifact consistency remains required for load-bearing safe artifacts when a
remote gate exists.

PR bodies are human render only. They may summarize safe evidence, but they do
not satisfy machine evidence. Machine evidence must be a safe artifact or a
manifest entry.

`create_pr_only` may pass local validation without remote evidence.
`merge_current_pr` requires same-head remote evidence and explicit owner merge
instruction. Owner merge instruction is required only for merge execution and
does not grant runtime readiness, production readiness, deployment authority,
legal compliance, or YouTube policy compliance.

## Safe Next Action

Create or update readonly harness metadata only. Any token, deployment,
verification, release, wallet, RPC, owner-value, or readiness activity requires
a separate owner scope.
