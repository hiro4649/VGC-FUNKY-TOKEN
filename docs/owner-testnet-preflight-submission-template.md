# Owner Testnet Preflight Submission Template

## Owner-Safe Submission Boundary

Provide only public, non-secret values.

- Do not provide private keys.
- Do not provide mnemonics.
- Do not provide RPC URLs.
- Do not provide API keys.
- Do not provide `.env` contents.
- Do not provide JWTs.
- Do not provide cookies.
- Do not provide DB URLs.
- Do not provide private endpoints.
- Provide public EVM addresses only where requested.

## Current Token Identity

- ERC20 name: `FUNKY RAVE`
- ERC20 symbol: `FUNKY`
- Source contract: `contracts/funky/funky.sol`

## Required Owner-Provided Values

- BNB Smart Chain testnet approval: `APPROVED` or `NOT_APPROVED`
- initialAdmin: public EVM address only
- initialFeeRecipient: public EVM address only
- deploy command approval: `APPROVED` or `NOT_APPROVED`
- deployer wallet funding confirmation: handled separately by owner; do not include funding details
- BscScan verification plan: text only, no API key
- multisig owner policy
- admin rotation policy
- feeRecipient policy
- TierUpdater deployer policy
- TierUpdater owner policy
- trusted factory policy
- initial DEX pair policy
- fee exemption policy

## JSON Submission Template

Use placeholders until the owner is ready to provide public values.

```json
{
  "targetNetwork": "BNB Smart Chain testnet",
  "chainId": 97,
  "initialAdmin": "INITIAL_ADMIN_TBD",
  "initialFeeRecipient": "INITIAL_FEE_RECIPIENT_TBD",
  "deployCommandApproved": "OWNER_APPROVAL_PENDING",
  "deployerFundingHandledByOwner": "OWNER_APPROVAL_PENDING",
  "bscScanVerificationPlan": "VERIFICATION_PLAN_TBD",
  "multisigOwnerPolicy": "PENDING",
  "adminRotationPolicy": "PENDING",
  "feeRecipientPolicy": "PENDING",
  "tierUpdaterDeployerPolicy": "PENDING",
  "tierUpdaterOwnerPolicy": "PENDING",
  "trustedFactoryPolicy": "PENDING",
  "initialDexPairPolicy": "PENDING",
  "feeExemptionPolicy": "PENDING"
}
```

## Validation Instructions

Owner values may also be submitted through the [owner-safe GitHub issue template](../.github/ISSUE_TEMPLATE/testnet-preflight-owner-values.yml).
The issue template is for public non-secret values only.
Saved issue body text can be parsed locally into validator-compatible JSON with `node scripts/parse-testnet-preflight-issue.js <issue-body-file>` before validation.
Submitted JSON can be used with `node scripts/build-testnet-preflight-review-packet.js --json <file>` to create a safe review packet.
The owner may ask Codex to run `node scripts/show-testnet-preflight-status.js` before submitting values.
Codex can run `node scripts/run-testnet-preflight-tooling-checks.js` before processing owner-submitted values.
The sample issue fixture at `test/testnet-preflight-owner-issue.sample.md` uses placeholders only and is safe for local testing.
Codex can run `node scripts/audit-testnet-preflight-safe-output.js` before processing owner values.
Codex can run `node scripts/export-testnet-preflight-safe-artifact.js --pretty` to summarize pending state without owner values.
The safe artifact snapshot fixture proves the default pre-owner-values artifact remains pending and safe.
The testnet preflight gate remains blocked until the owner provides public values and explicit approvals.
Owner values alone do not authorize deployment; the gate requires a later explicit deploy instruction.
The safe artifact schema guard validates only the default safe artifact shape and does not validate real owner values by itself.
The owner preflight handoff packet is the safe owner-facing summary before value submission.
The owner handoff packet snapshot ensures the owner-facing prompt does not request or expose secrets.
The repository safety audit can be run before owner values are processed.
Repository safety audit snapshots are independent of owner values and do not
validate real owner values.
Source invariant audit snapshots are independent of owner values and do not
validate real owner values.
Owner policies must resolve source invariant audit manual review items before
deployment planning.
Owner policy decision matrix fields must be resolved separately from public
address and value submission.
Owner policy matrix snapshots are independent of owner values and do not
validate real owner values.
Owner values alone do not satisfy the owner policy preflight gate; unresolved
policy decisions still keep testnet action blocked.
Owner policy preflight gate snapshots prove the owner-facing policy gate output
stays blocked, redacted, and non-approving before any later owner decision
processing.
The source-of-truth repository decision should remain explicit before owner
values are used for any later testnet deploy approval path.
The source-of-truth repository decision snapshot guard keeps that prompt
stable, non-approving, and locked to the current canonical source/deploy target.
The deployment readiness owner action packet lists the remaining owner actions
without accepting secrets, private values, or real owner values.
The deployment readiness owner action packet snapshot guard keeps that
owner-facing action list stable, redacted, and non-approving.

Validate a filled JSON file with:

```powershell
node scripts/validate-testnet-preflight-values.js <file>
```

After validation, generate a safe redacted review summary with:

```powershell
node scripts/generate-testnet-preflight-summary.js <file>
```

Use the [testnet preflight review packet runbook](testnet-preflight-review-packet-runbook.md) before reporting owner-submitted values.

The validator is format-only.
The validator does not approve deployment.
The validator does not approve funded transactions.
The validator does not approve governance transactions.
The validator does not approve BscScan verification.
The validator does not prove runtime readiness.
The validator does not prove staging readiness.
The validator does not prove testnet readiness.
The validator does not prove mainnet readiness.
The summary generator does not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
