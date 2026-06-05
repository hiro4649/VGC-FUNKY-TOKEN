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
