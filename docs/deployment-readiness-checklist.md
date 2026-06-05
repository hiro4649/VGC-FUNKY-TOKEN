# Deployment Readiness Checklist

## 1. Scope Boundary

- This checklist is documentation-only.
- This checklist does not approve deployment.
- This checklist does not approve funded transactions.
- This checklist does not approve governance transactions.
- This checklist does not prove runtime readiness.
- This checklist does not prove staging readiness.
- This checklist does not prove testnet readiness.
- This checklist does not prove mainnet readiness.

## 2. Token Identity

- ERC20 name: `FUNKY RAVE`
- ERC20 symbol: `FUNKY`
- Source contract: `contracts/funky/funky.sol`
- TierUpdater source: `contracts/funky/FunkyTierUpdater.sol`

## 3. Target Chain Decision

- BNB Smart Chain testnet decision required.
- BNB Smart Chain mainnet decision required.
- No chain is approved until owner confirms.
- Testnet must be completed before mainnet.

## 4. Constructor Address Decisions

Owner approval is required for:

- initialAdmin: `INITIAL_ADMIN_TBD`
- initialFeeRecipient: `INITIAL_FEE_RECIPIENT_TBD`

Owner-provided values should follow the [owner-safe testnet preflight submission template](owner-testnet-preflight-submission-template.md).
Owner-provided values may also use the [owner-safe GitHub issue template](../.github/ISSUE_TEMPLATE/testnet-preflight-owner-values.yml) as an optional intake method before validation.
Do not include real addresses unless owner explicitly provides them.

## 5. Governance Decisions

Owner approval is required for:

- multisig owner policy
- admin rotation policy
- feeRecipient policy
- TierUpdater deployer policy
- TierUpdater owner policy
- trusted factory policy
- initial DEX pair policy
- fee exemption policy

## 6. Dry-Run Requirements Before Testnet

Required before any testnet deploy:

- `npm test`
- `npm run compile`
- `npx hardhat test test/FunkyRave.test.js`
- GitHub Actions token validation pass
- testnet preflight owner-values validator pass
- testnet preflight owner-values validator self-test pass
- safe redacted testnet preflight summary generation pass
- owner issue parser self-test pass
- safe testnet preflight review packet generation pass
- GitHub Actions validate-only deploy/configure preflight pass with dummy public addresses only
- `FUNKY_VALIDATE_ONLY=true` deploy script validation
- `FUNKY_VALIDATE_ONLY=true` configure script validation
- deploy script env var review
- configure script env var review
- constructor arg review
- no private key committed
- no RPC URL committed
- no `.env` committed
- no funded transaction without explicit owner instruction

Dry-run validation is not deployment readiness.
Dry-run validation is not runtime readiness.
Dry-run validation is not testnet readiness.
Dry-run validation is not mainnet readiness.
Owner approval is still required before any actual testnet deploy.
Owner-provided addresses are still required before any real testnet action.
Owner-values validation only checks format and secret safety.
Owner-values validation does not approve deployment.
Owner-values validation does not approve funded transactions.
Owner-values validation does not approve governance transactions.
Owner-values validation does not approve BscScan verification.
Owner-values validation does not prove runtime readiness.
Owner-values validation does not prove staging readiness.
Owner-values validation does not prove testnet readiness.
Owner-values validation does not prove mainnet readiness.
A safe redacted owner-values summary is a review step only and does not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
Funding is handled separately by owner and must not be represented in repo.

## 7. BSC Testnet Preflight

Required before testnet deploy:

- Record pending owner decisions in `docs/testnet-preflight-owner-decisions.md`.
- owner confirms target network
- owner confirms deployer wallet funding separately
- owner confirms initialAdmin
- owner confirms initialFeeRecipient
- owner confirms no mainnet action
- owner confirms deploy command
- owner confirms BscScan verification plan

## 8. Post-Testnet Evidence Requirements

After testnet deploy, a later PR must record:

- deployed contract address
- transaction hash
- chain ID
- deployer address safe summary
- constructor args safe summary
- BscScan verification status
- testnet transfer test policy
- governance configuration status

## 9. Mainnet Go/No-Go Boundary

Mainnet is blocked until:

- testnet deploy evidence exists
- BscScan verification evidence exists
- owner approves mainnet target
- owner approves initialAdmin
- owner approves initialFeeRecipient
- owner approves TierUpdater plan
- owner approves trusted factory plan
- owner approves initial pair plan
- owner approves final go/no-go
- no unresolved audit blocker remains

## 10. Explicit Non-Approval

This checklist does not approve:

- deployment
- BscScan verification
- funded transactions
- governance transactions
- mainnet launch
- public repository visibility
- releases
