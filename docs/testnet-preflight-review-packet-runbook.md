# Testnet Preflight Review Packet Runbook

## 1. Scope Boundary

- Documentation-only.
- No deployment.
- No funded transaction.
- No governance transaction.
- No BscScan verification.
- No release.
- No public visibility change.
- No readiness claim.

## 2. Inputs Allowed

- Owner-submitted JSON file containing public, non-secret values only.
- Public EVM addresses only for address fields.
- No private keys.
- No mnemonics.
- No RPC URLs.
- No API keys.
- No `.env` contents.
- No JWTs.
- No cookies.
- No DB URLs.
- No private endpoints.

## 3. Required Command Sequence

```powershell
node scripts/validate-testnet-preflight-values.js <owner-json-file>
node scripts/generate-testnet-preflight-summary.js <owner-json-file>
```

- Do not run deploy script.
- Do not run configure script.
- Do not run BscScan verification.

## 4. Safe Review Packet Contents

The review packet may include only:

- validation pass/fail
- safe summary output
- initialAdmin status as TBD or shortened public address
- initialFeeRecipient status as TBD or shortened public address
- policy fields as PENDING or PROVIDED
- BscScan plan as TBD or TEXT_SUPPLIED
- explicit non-approval boundaries

## 5. Values That Must Never Be Included

- full private key
- mnemonic
- API key
- RPC URL
- DB URL
- JWT
- cookie
- `.env` content
- private endpoint
- raw unsafe validator output

## 6. Stop Conditions

Stop immediately if:

- validator emits secret-risk
- validator emits validation-fail
- summary generator fails
- owner JSON contains secret-like values
- requested action includes deploy
- requested action includes funded transaction
- requested action includes governance transaction
- requested action includes BscScan verification
- requested action claims testnet readiness or mainnet readiness

## 7. Approval Boundary

The review packet does not approve:

- deployment
- funded transaction
- governance transaction
- BscScan verification
- release
- public visibility
- runtime readiness
- staging readiness
- testnet readiness
- mainnet readiness

## 8. Next Action After Clean Packet

After a clean packet:

- report validation result
- report safe summary
- list remaining owner decisions
- wait for explicit owner instruction
- do not deploy
