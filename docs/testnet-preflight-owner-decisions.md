# Testnet Preflight Owner Decisions

## 1. Scope Boundary

- This document is owner-decision preflight only.
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
