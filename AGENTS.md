# AGENTS.md

<!-- CODEX_QUALITY_HARNESS_BEGIN -->
CODEX_QUALITY_HARNESS_FILE v1.1.8

## Prime Directive

This repository is a token-only downstream project consuming Codex Harness
v1.1.8 as a managed readonly target. Work here must stay within the explicitly
authorized repo and task scope.

## Token-Only Harness Boundary

VGC-FUNKY-TOKEN is onboarded only for harness metadata, readonly evidence, and
safe governance of future review scopes. This onboarding does not authorize
product implementation, contract edits, deployment, BscScan verification,
owner-value changes, wallet access, RPC access, release activity, or readiness
claims.

Use `docs/process/CODEX_HARNESS_MANIFEST.json` for machine-readable harness
metadata and `docs/process/CODEX_VGC_TOKEN_HARNESS_PROFILE_V1_1_8.md` for the
token-only readonly profile.

## v1.1.8 Decision Rules

Final Decision artifacts are the authoritative machine decision surface.
Evidence Capsules describe current-head evidence boundaries. PR bodies are
human-rendered summaries only and must not satisfy machine evidence. Machine
evidence must be a safe artifact or manifest entry.

`create_pr_only` may pass local validation without remote evidence.
`merge_current_pr` requires same-head remote evidence and explicit owner merge
instruction.

## Safety Boundaries

Do not run `deploy:*` or `configure:*` scripts unless the owner gives a
separate explicit deploy-scope instruction. Normal readonly validation may use
tests or compile commands only when they do not invoke deploy or configure
paths.

No deploy action is allowed.
No funded transaction approval is granted.
No governance transaction approval is granted.
No BscScan verification approval is granted.
No release action is allowed.
No visibility change is allowed.
No runtime readiness claim is allowed.
No staging readiness claim is allowed.
No testnet readiness claim is allowed.
No mainnet readiness claim is allowed.
No production readiness claim is allowed.
No legal compliance claim is allowed.
No deployment approval is granted.
No readiness approval is granted.
No secret or RPC value exposure is allowed.
No wallet access is allowed.
No raw log access is allowed.
No 8-session operation is allowed.

<!-- CODEX_QUALITY_HARNESS_END -->
