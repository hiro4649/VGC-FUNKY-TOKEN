# VGC-FUNKY-TOKEN

FUNKY token is the VGC Model token implementation.

Final pre-deploy ERC20 name is `FUNKY RAVE`.
Final pre-deploy ERC20 symbol is `FUNKY`.
Source contract is `contracts/funky/funky.sol`.

Final pre-deploy ERC20 identity:

- name = `FUNKY RAVE`
- symbol = `FUNKY`

This is a pre-deploy identity correction.
The symbol is the short ticker.

This repository contains token-only source, tests, and deployment tooling.

This repository does not prove deployment readiness by itself.
This repository does not prove runtime readiness by itself.
This repository does not prove staging readiness by itself.
This repository does not prove testnet readiness by itself.
This repository does not prove mainnet readiness by itself.

No deployment has been performed from this repository.
No funded transaction has been performed from this repository.
No governance transaction has been performed from this repository.

## Test

```powershell
npm --prefix contracts test
npm --prefix contracts run compile
cd contracts
npx hardhat test test/FunkyRave.test.js
cd ..
```

## CI

GitHub Actions token validation runs contracts install, tests, compile, and the targeted `FunkyRave` test.
CI also runs validate-only deploy/configure preflight with dummy public addresses.
CI does not prove deployment readiness, runtime readiness, testnet readiness, or mainnet readiness.
CI also validates the sample owner-values file for format and secret safety only.
CI runs owner-values validator self-tests; those self-tests do not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
CI also runs a preflight summary generator and self-tests for safe redacted owner-values review output.
The preflight summary is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.

## Deployment Readiness

- [Deployment readiness owner approval checklist](docs/deployment-readiness-checklist.md)
- [Testnet preflight owner decision record](docs/testnet-preflight-owner-decisions.md)
- [Owner-safe testnet preflight submission template](docs/owner-testnet-preflight-submission-template.md)
- [Testnet preflight review packet runbook](docs/testnet-preflight-review-packet-runbook.md)
- [VGC-TOKEN repository safety audit](docs/vgc-token-repo-safety-audit.md)
- [VGC-TOKEN source invariant audit](docs/vgc-token-source-invariant-audit.md)
- [Owner policy decision matrix](docs/owner-policy-decision-matrix.md)
- [Owner policy preflight gate](docs/owner-policy-preflight-gate.md)
- [Source-of-truth repository decision](docs/source-of-truth-repository-decision.md)
- [Deployment readiness blocker registry](docs/deployment-readiness-blocker-registry.md)
Repository safety audit snapshots lock the expected text and JSON audit outputs. The snapshots are not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness.
Source invariant audit snapshots lock the expected source invariant audit outputs and manual review items. The snapshots are not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness.
Owner policy decision matrix snapshots lock the expected pending owner-policy output. The snapshots are not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness.
Owner policy preflight gate snapshots lock the expected blocked owner-policy gate output with `node scripts/test-owner-policy-preflight-gate-snapshot.js`; the snapshots are not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness.
The source-of-truth repository decision keeps VGC-FUNKY-TOKEN as the canonical FUNKY contract source unless the owner explicitly decides otherwise before testnet deploy; this decision is not deployment approval, BscScan verification approval, or readiness.
Source-of-truth repository decision snapshots lock the canonical source, deploy target, duplicate-source policy, migration policy, and non-approval boundaries; the snapshots are not deployment approval, BscScan verification approval, or readiness.
The deployment readiness blocker registry consolidates remaining blockers with `DEPLOYMENT_READINESS_BLOCKED`; the registry is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
Deployment readiness blocker registry snapshots lock the blocked text and JSON outputs, required blockers, safeTo flags, and non-approval boundaries; the snapshots are not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A deployment readiness owner action packet converts the blocker registry into pending owner actions with `OWNER_ACTIONS_REQUIRED`; the packet is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, release approval, public visibility approval, or readiness approval.
Deployment readiness owner action packet snapshots lock the text and JSON outputs, pending owner actions, safe input boundaries, safeTo flags, and non-approval boundaries; the snapshots are not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, release approval, public visibility approval, or readiness approval.
- [Deployment readiness owner action issue template](.github/ISSUE_TEMPLATE/deployment-readiness-owner-actions.yml) is a public owner-decision intake form only; not deployment approval, not funded transaction approval, not governance transaction approval, not BscScan verification approval, not release approval, not visibility approval, and not readiness.
Deployment readiness owner action issue submissions can be parsed with `node scripts/parse-deployment-readiness-owner-action-issue.js <issue-body-file>` for later owner issue review only; the parser accepts no secrets; not deployment approval, not funded transaction approval, not governance transaction approval, not BscScan verification approval, not release approval, not visibility approval, and not readiness.
Deployment readiness owner action issue parser snapshots lock the text and JSON outputs, pending owner actions, safe input boundaries, safeTo flags, unsafe-input rejection, secret-input rejection, and non-approval boundaries.
Deployment readiness owner action review packets can be built with `node scripts/build-deployment-readiness-owner-action-review-packet.js <issue-body-file>` for later owner review only; the review packet accepts no secrets; not deployment approval, not funded transaction approval, not governance transaction approval, not BscScan verification approval, not release approval, not visibility approval, and not readiness.
Deployment readiness owner action review packet snapshots lock the text and JSON outputs, source parse status, safeTo flags, owner review requirement, later deploy instruction requirement, no-secret state, no-real-owner-values state, and non-approval boundaries.
Deployment readiness owner action intake checks can be run with `node scripts/run-deployment-readiness-owner-action-intake-checks.js` for later owner action intake validation only; the checks accept no secrets or real owner values; not deployment approval, not funded transaction approval, not governance transaction approval, not BscScan verification approval, not release approval, not visibility approval, and not readiness.
Deployment readiness owner action intake checks snapshots can be run with `node scripts/test-deployment-readiness-owner-action-intake-checks-snapshot.js` to lock the aggregate intake text and JSON outputs, blocked gate states, no-secret state, no-real-owner-values state, owner review requirement, later deploy instruction requirement, safeTo flags, and non-approval boundaries.
- [Owner-safe testnet preflight issue template](.github/ISSUE_TEMPLATE/testnet-preflight-owner-values.yml)

Dry-run validation can be run with `FUNKY_VALIDATE_ONLY=true` to check required deployment and governance inputs without broadcasting transactions.
CI validate-only preflight uses dummy public addresses only; owner-provided addresses are still required before any real testnet action.
Dry-run validation is not deployment readiness, runtime readiness, testnet readiness, or mainnet readiness.
Owner-values validation only checks format and secret safety; it does not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
A validated owner-values JSON file can be summarized with `node scripts/generate-testnet-preflight-summary.js <file>` for redacted review before any testnet action.
The summary does not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
Owner issue submissions are public-value intake only; they do not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
Owner issue submissions can be parsed locally into validator-compatible JSON with `node scripts/parse-testnet-preflight-issue.js <issue-body-file>`; parsing is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A preflight review packet builder can create a safe packet from either validated JSON or owner issue body text with `node scripts/build-testnet-preflight-review-packet.js`; the packet is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A pre-testnet status command can summarize local tooling and remaining owner decisions with `node scripts/show-testnet-preflight-status.js`; the status command does not approve deployment, funded transactions, governance transactions, BscScan verification, release, public visibility, or readiness.
A preflight tooling check command runs local no-deploy pre-testnet tooling checks in sequence with `node scripts/run-testnet-preflight-tooling-checks.js`; the command is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A committed safe e2e fixture proves the placeholder owner issue path through parser, validator, summary, review packet, and tooling check with `node scripts/test-testnet-preflight-e2e-packet.js`; the fixture is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A safe-output audit command verifies preflight tooling output remains redacted and non-approving with `node scripts/audit-testnet-preflight-safe-output.js`; the audit is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A safe preflight artifact exporter emits machine-readable local pre-testnet status with `node scripts/export-testnet-preflight-safe-artifact.js`; the artifact does not contain raw owner input, secrets, deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A safe artifact snapshot fixture locks the machine-readable preflight artifact shape with `node scripts/test-testnet-preflight-safe-artifact-snapshot.js`; the snapshot is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A testnet preflight gate command reports the current state as blocked until owner decisions are provided and explicitly approved with `node scripts/check-testnet-preflight-gate.js`; the gate does not approve deployment, funded transactions, governance transactions, BscScan verification, or readiness.
The preflight gate safety matrix proves owner decision states remain blocked until a separate explicit deploy instruction with `node scripts/test-testnet-preflight-gate-safety-matrix.js`; the matrix is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
A safe artifact schema guard locks the machine-readable preflight artifact structure with `node scripts/test-testnet-preflight-safe-artifact-schema.js`; the schema guard is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
An owner preflight handoff packet command summarizes the current blocked pre-testnet state and tells the owner exactly what public values are still required with `node scripts/build-owner-preflight-handoff-packet.js`; the handoff packet is not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.
Owner preflight handoff packet snapshots lock the owner-facing blocked-state output with `node scripts/test-owner-preflight-handoff-packet-snapshot.js`; the snapshots are not deployment approval, funded transaction approval, governance transaction approval, BscScan verification approval, or readiness approval.

## Included Scope

- `contracts/funky/funky.sol`
- `contracts/funky/FunkyTierUpdater.sol`
- `contracts/funky/ERC20.sol`
- `contracts/funky/Context.sol`
- `contracts/funky/IERC20.sol`
- `contracts/funky/IERC20Metadata.sol`
- `contracts/funky/draft-IERC6093.sol`
- `contracts/funky/MockDexFactory.sol`
- `contracts/funky/MockDexPair.sol`
- `contracts/funky/MockTierUpdater.sol`
- `contracts/test/FunkyRave.test.js`
- `contracts/scripts/deploy-funky.js`
- `contracts/scripts/configure-funky-governance.js`
- `contracts/hardhat.config.js`
- `contracts/package.json`
- `contracts/package-lock.json`
- token-only checklist and audit notes under `docs/`
