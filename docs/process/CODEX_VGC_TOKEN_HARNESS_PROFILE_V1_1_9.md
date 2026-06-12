# VGC-FUNKY-TOKEN Harness Profile v1.1.9

## Profile

- targetRepoType: token_only_managed
- activeHarnessVersion: 1.1.9
- activeSelfTestSuite: v119
- forbiddenScopeProfile: VGC_TOKEN_NO_DEPLOY_NO_VALUE_TRANSFER_V1
- verificationProfile: TOKEN_READONLY_HARNESS_L1
- mergeReadinessProfile: SAME_HEAD_REQUIRED_CHECKS_CLEAN
- staleEvidencePolicy: CURRENT_HEAD_ARTIFACT_REQUIRED

## Readonly Boundary

This profile is metadata-only. It does not authorize product implementation,
contract changes, package changes, workflow changes, deployment, token release,
runtime activity, owner-value changes, wallet access, RPC access, BscScan
verification, secret access, transaction activity, or readiness claims.

## Forbidden Scope

- No deploy action is allowed.
- No funded transaction approval is granted.
- No governance transaction approval is granted.
- No BscScan verification approval is granted.
- No release action is allowed.
- No visibility change is allowed.
- No runtime readiness claim is allowed.
- No staging readiness claim is allowed.
- No testnet readiness claim is allowed.
- No mainnet readiness claim is allowed.
- No production readiness claim is allowed.
- No legal compliance claim is allowed.
- No deployment approval is granted.
- No readiness approval is granted.
- No secret or RPC value exposure is allowed.
- No wallet access is allowed.
- No raw log access is allowed.
- No 8-session operation is allowed.

## v1.1.9 Evidence Semantics

v1.1.8 Final Decision remains final pass, block, mergeAllowed, and exit-code
authority. v1.1.9 records preparatory orchestration, worker proof, and owner
decision readiness metadata only. Owner Decision Brief is not owner approval.
Worker Proof is not runtime readiness. Review Chain is not GitHub approval
review.

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
verification, release, wallet, RPC, owner-value, secret, transaction, or
readiness activity requires a separate owner scope.
