# Deployment Readiness Owner Action Intake Runbook

## Purpose

This runbook explains how the owner may later use the deployment readiness
owner action issue template and intake pipeline safely. It is owner-facing
guidance for public owner decision intake only. It does not collect real owner
values in this PR, does not approve deployment, and does not claim readiness.

## Current status

The deployment readiness owner action intake final gate remains
`OWNER_ACTION_INTAKE_FINAL_GATE_BLOCKED`. The intake artifact remains
`OWNER_ACTION_INTAKE_ARTIFACT_BLOCKED_OR_PENDING`, the intake checks remain
`OWNER_ACTION_INTAKE_CHECKS_BLOCKED_OR_PENDING`, the parser remains
`OWNER_ACTION_ISSUE_PARSE_BLOCKED_OR_PENDING`, the review packet remains
`OWNER_ACTION_REVIEW_REQUIRED`, and the owner action packet remains
`OWNER_ACTIONS_REQUIRED`.

The blocker registry remains `DEPLOYMENT_READINESS_BLOCKED`. The testnet
preflight gate remains `BLOCKED_OWNER_DECISIONS_PENDING`, and the owner policy
preflight gate remains `BLOCKED_OWNER_POLICY_DECISIONS_PENDING`.

## What the owner may submit later

Only public owner decision fields may be submitted later through the issue
template. Safe public-value fields are:

- BNB Smart Chain testnet approval
- initialAdmin public address
- initialFeeRecipient public address
- deploy command approval text
- BscScan verification plan text
- multisig policy
- admin rotation policy
- feeRecipient policy
- TierUpdater policy
- trusted factory policy
- pair policy
- fee exemption policy
- fee max policy
- fee denominator policy
- sell/LP-add fee behavior policy
- tier updater last-removal policy
- fee exemption proposer/approver policy
- tier updater code-presence validation policy
- source-of-truth repository decision
- repository visibility decision

## What the owner must never submit

Never include:

- private keys
- mnemonics
- RPC URLs
- API keys
- .env contents
- DB URLs
- JWTs
- cookies
- wallet funding proof
- screenshots showing wallet secrets
- BscScan API keys
- deployer private material
- seed phrases
- any secret-like value

Deployer funding is handled separately by owner and must not be posted in
GitHub.

## How to use the GitHub issue template

Use the deployment readiness owner action issue template only for later public
owner decisions. Keep placeholder values until the owner is ready to submit
public decisions. Do not paste secrets, wallet funding evidence, private
endpoints, or private operational material into GitHub.

Posting the issue is not deploy approval, not funded transaction approval, not
governance transaction approval, not BscScan verification approval, not release
approval, not visibility approval, and not readiness.

## What the parser does

The parser reads later issue text and converts public owner decision fields into
blocked or pending owner action data. It rejects unsafe input and secret input,
keeps `safeToDeploy` false, keeps `safeToPerformFundedTransaction` false, keeps
`safeToPerformGovernanceTransaction` false, keeps `safeToVerifyBscScan` false,
and keeps `safeToClaimReadiness` false.

## What the review packet does

The review packet turns parsed issue data into an owner review packet. It keeps
owner review required, keeps a later explicit deploy instruction required, and
does not approve deployment, funded transactions, governance transactions,
BscScan verification, releases, visibility changes, or readiness.

## What the intake checks do

The intake checks aggregate the template guard, parser, review packet, owner
action packet, blocker registry, testnet preflight gate, and owner policy
preflight gate. They prove the intake path is still blocked or pending and that
secrets and real owner values are not accepted.

## What the intake artifact does

The intake artifact exports a compact machine-readable summary for later owner
action review. It records blocked or pending statuses, false safeTo flags, no
secret state, no real owner value state, owner review requirement, later deploy
instruction requirement, non-approval boundaries, and summary counts.

## What the final gate proves

The final gate proves the placeholder-only intake sequence remains blocked
before any future real owner value intake. It proves:

- `safeToDeploy` remains false
- `safeToPerformFundedTransaction` remains false
- `safeToPerformGovernanceTransaction` remains false
- `safeToVerifyBscScan` remains false
- `safeToClaimReadiness` remains false
- `requiresOwnerReview` remains true
- `requiresLaterExplicitDeployInstruction` remains true
- `containsSecrets` remains false
- `containsRealOwnerValues` remains false
- `unsafeInputAccepted` remains false
- `secretInputAccepted` remains false
- every non-approval boundary remains true

## What remains blocked

The final gate remains blocked until owner decisions and separate approvals are
processed safely. A later explicit deploy instruction is still required before
any deploy action can be considered.

## Separate deploy approval still required

Posting the issue is not deploy approval. A later explicit deploy instruction
is still required.

## Separate funded transaction approval still required

Posting the issue is not funded transaction approval. Deployer funding is
handled separately by owner and must not be posted in GitHub.

## Separate governance transaction approval still required

Posting the issue is not governance transaction approval. Any governance
transaction remains blocked without separate explicit owner approval.

## Separate BscScan verification approval still required

Posting the issue is not BscScan verification approval. Any BscScan
verification remains blocked without separate explicit owner approval.

## No release approval

Posting the issue is not release approval.

## No visibility change approval

Posting the issue is not visibility approval and does not approve any repository
visibility change.

## No runtime readiness approval

Posting the issue is not runtime readiness.

## No staging readiness approval

Posting the issue is not staging readiness.

## No testnet readiness approval

Posting the issue is not testnet readiness.

## No mainnet readiness approval

Posting the issue is not mainnet readiness.
