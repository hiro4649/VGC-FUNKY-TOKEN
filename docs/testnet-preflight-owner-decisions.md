# Testnet Preflight Owner Decisions

## 1. Scope Boundary

- This document is owner-decision preflight only.
- Owner-provided values should follow the [owner-safe testnet preflight submission template](owner-testnet-preflight-submission-template.md).
- Owner decisions may also be submitted through the [owner-safe GitHub issue template](../.github/ISSUE_TEMPLATE/testnet-preflight-owner-values.yml).
- Owner-submitted values should be reviewed with the [testnet preflight review packet runbook](testnet-preflight-review-packet-runbook.md).
- This document does not approve deployment.
- This document does not approve funded transactions.
- This document does not approve governance transactions.
- This document does not approve BscScan verification.
- This document does not prove runtime readiness.
- This document does not prove staging readiness.
- This document does not prove testnet readiness.
- This document does not prove mainnet readiness.

## 2. Current Token Identity

- ERC20 name: `FUNKY RAVE`
- ERC20 symbol: `FUNKY`
- Source contract: `contracts/funky/funky.sol`
- TierUpdater source: `contracts/funky/FunkyTierUpdater.sol`

## 3. Target Network Decision

- Target chain: BNB Smart Chain testnet
- Chain ID: `97`
- Network approval: `OWNER_APPROVAL_PENDING`
- Mainnet action: explicitly not approved

## 4. Constructor Address Decisions

- initialAdmin: `INITIAL_ADMIN_TBD`
- initialFeeRecipient: `INITIAL_FEE_RECIPIENT_TBD`

Do not include real addresses unless the owner explicitly provided them in this task.

## 5. Deployment Command Decision

- deploy command: `DEPLOY_COMMAND_TBD`
- dry-run validation mode: `FUNKY_VALIDATE_ONLY=true`
- deploy script: `contracts/scripts/deploy-funky.js`
- required env review: pending
- funded transaction approval: not granted

## 6. BscScan Verification Decision

- BscScan verification: not approved
- verification command: `VERIFICATION_COMMAND_TBD`
- constructor args: pending owner confirmation
- API key handling: must not be committed

## 7. Governance Decision Placeholders

- multisig owner policy: `PENDING`
- admin rotation policy: `PENDING`
- feeRecipient policy: `PENDING`
- TierUpdater deployer policy: `PENDING`
- TierUpdater owner policy: `PENDING`
- trusted factory policy: `PENDING`
- initial pair policy: `PENDING`
- fee exemption policy: `PENDING`

## 8. Required Preflight Checks Before Any Testnet Deploy

- `npm --prefix contracts test`
- `npm --prefix contracts run compile`
- `cd contracts && npx hardhat test test/FunkyRave.test.js`
- `node scripts/validate-testnet-preflight-values.js test/testnet-preflight-values.sample.json`
- `node scripts/test-testnet-preflight-validator.js`
- `node scripts/generate-testnet-preflight-summary.js test/testnet-preflight-values.sample.json`
- `node scripts/test-testnet-preflight-summary-generator.js`
- `node scripts/test-testnet-preflight-issue-parser.js`
- GitHub Actions validate-only deploy/configure preflight with dummy public addresses only
- `FUNKY_VALIDATE_ONLY=true` deploy script validation
- `FUNKY_VALIDATE_ONLY=true` configure script validation
- deploy script env var review
- configure script env var review
- constructor address review
- no `.env` committed
- no private key committed
- no mnemonic committed
- no RPC URL committed
- no API key committed
- owner explicit written deploy approval

Dry-run validation is not runtime readiness.
Dry-run validation is not staging readiness.
Dry-run validation is not testnet readiness.
Dry-run validation is not mainnet readiness.
Funding is handled separately by owner and must not be represented in repo.
Owner-provided addresses are still required before any real testnet action.

The owner-values validator only checks format and secret safety.
The owner-values validator does not approve deployment.
The owner-values validator does not approve funded transactions.
The owner-values validator does not approve governance transactions.
The owner-values validator does not approve BscScan verification.
The owner-values validator does not prove runtime readiness.
The owner-values validator does not prove staging readiness.
The owner-values validator does not prove testnet readiness.
The owner-values validator does not prove mainnet readiness.
The preflight summary generator is a safe redacted review step only.
The preflight summary does not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
Parsed issue JSON still requires owner-values validation and safe summary generation before any follow-up action.
Owner issue body or owner-values JSON must be converted into a safe review packet before any next action.
Pre-testnet status remains pending until owner decisions are supplied, validated, and summarized safely.
Preflight tooling checks must pass before owner-submitted values are processed.
Owner decisions remain pending even when the e2e preflight packet fixture passes.
Owner decisions remain pending even when the safe-output audit passes.
Owner decisions remain pending in the safe artifact until explicit owner values are provided and validated.
Owner decisions remain pending in the safe artifact snapshot until explicit values are supplied and validated.
The default testnet preflight gate status is blocked until owner decisions are supplied and validated.
Complete owner decisions are not the same as deploy approval.
Owner decisions remain pending in the default safe artifact schema.
The owner preflight handoff packet lists all still-pending owner decisions.
The owner handoff packet remains blocked until owner values and a later explicit deploy instruction are provided.
The repository safety audit does not replace owner decisions.
Owner decisions remain pending even when repository safety audit snapshots pass.
Source invariant audit snapshots do not resolve owner decisions; manual review
items remain owner policy decisions even when those snapshots pass.
Source invariant audit manual review items remain part of the owner policy
context for fee model, tier updater, trusted factory, and fee exemption
decisions.

## 9. Explicit Non-Approval

This PR does not approve:

- testnet deployment
- mainnet deployment
- funded transaction
- governance transaction
- BscScan verification
- release creation
- public visibility
- runtime readiness
- staging readiness
- testnet readiness
- mainnet readiness
