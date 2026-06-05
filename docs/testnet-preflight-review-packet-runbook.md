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

Safe read-only preliminary status check:

```powershell
node scripts/show-testnet-preflight-status.js
```

Safe preliminary tooling check:

```powershell
node scripts/run-testnet-preflight-tooling-checks.js
```

Safe e2e fixture check:

```powershell
node scripts/test-testnet-preflight-e2e-packet.js
```

Safe-output audit check:

```powershell
node scripts/audit-testnet-preflight-safe-output.js
```

Safe artifact export:

```powershell
node scripts/export-testnet-preflight-safe-artifact.js --pretty
```

Use the safe artifact after tooling checks pass to create a local machine-readable review artifact.
Do not treat the artifact as deployment approval or readiness.

Testnet preflight gate:

```powershell
node scripts/check-testnet-preflight-gate.js
```

The expected pre-owner-values result is `BLOCKED_OWNER_DECISIONS_PENDING`.

Gate safety matrix:

```powershell
node scripts/test-testnet-preflight-gate-safety-matrix.js
```

Even synthetic complete owner decisions remain blocked until a separate explicit deploy instruction.

Safe artifact snapshot fixture:

```powershell
node scripts/test-testnet-preflight-safe-artifact-snapshot.js
```

Use the snapshot fixture to confirm the default machine-readable artifact remains stable, pending-owner, and non-approving.

Preferred safe path for JSON input:

```powershell
node scripts/build-testnet-preflight-review-packet.js --json <owner-values-json-file>
```

Preferred safe path for issue body input:

```powershell
node scripts/build-testnet-preflight-review-packet.js --issue-body <local-issue-body-file>
```

Stop after the safe packet and wait for explicit owner instruction.

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

## 9. GitHub Issue Intake Path

Owner decisions may be submitted through the [owner-safe GitHub issue template](../.github/ISSUE_TEMPLATE/testnet-preflight-owner-values.yml).

For issue submissions, Codex must:

- check that no secrets or secret-like values are present
- convert issue fields into local JSON only after that check
- run `node scripts/validate-testnet-preflight-values.js <owner-json-file>`
- run `node scripts/generate-testnet-preflight-summary.js <owner-json-file>`
- not deploy
- not run BscScan verification
- wait for explicit owner instruction after a clean review packet

## 10. Owner Issue Parsing Workflow

Required sequence:

1. save issue body to local text file
2. run `node scripts/parse-testnet-preflight-issue.js <issue-body-file>` to produce JSON
3. run `node scripts/validate-testnet-preflight-values.js <owner-json-file>`
4. run `node scripts/generate-testnet-preflight-summary.js <owner-json-file>`
5. report safe summary
6. stop for explicit owner instruction

Do not deploy.
Do not run configure.
Do not run BscScan verification.
