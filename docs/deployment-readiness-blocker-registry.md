# Deployment Readiness Blocker Registry

The deployment readiness blocker registry consolidates the current no-deploy
blocked state for VGC-FUNKY-TOKEN.

Default status: `DEPLOYMENT_READINESS_BLOCKED`.

The registry records that these items remain blocked or pending:

- owner values
- owner policy decisions
- source-of-truth decision
- deploy command approval
- deployer funding handled separately by owner
- BscScan verification plan
- governance policy
- repository visibility owner decision
- testnet preflight gate
- owner policy preflight gate
- readiness claim

## Command

```powershell
node scripts/build-deployment-readiness-blocker-registry.js
node scripts/build-deployment-readiness-blocker-registry.js --json
node scripts/test-deployment-readiness-blocker-registry.js
node scripts/test-deployment-readiness-blocker-registry-snapshot.js
```

The snapshot guard locks the text and JSON outputs, required blockers, safeTo
flags, and non-approval boundaries.

The owner action packet command converts this registry into a blocked
owner-facing list of pending actions:

```powershell
node scripts/build-deployment-readiness-owner-action-packet.js
node scripts/build-deployment-readiness-owner-action-packet.js --json
node scripts/test-deployment-readiness-owner-action-packet.js
node scripts/test-deployment-readiness-owner-action-packet-snapshot.js
```

The packet keeps every owner action pending and does not approve deployment,
funded transactions, governance transactions, BscScan verification, release,
public visibility, or readiness.

The deployment readiness owner action issue template is a public owner-decision
intake form only:

- not deployment approval
- not funded transaction approval
- not governance transaction approval
- not BscScan verification approval
- not release approval
- not visibility approval
- not readiness

The deployment readiness owner action issue parser converts later issue text
into blocked or pending owner action data only. It accepts no secrets; not
deployment approval, not funded transaction approval, not governance transaction
approval, not BscScan verification approval, not release approval, not
visibility approval, and not readiness.
Owner action issue parser snapshots keep the parser text and JSON outputs,
pending owner actions, safe input boundaries, safeTo flags, unsafe-input
rejection, secret-input rejection, and non-approval boundaries stable.

## Explicit Boundaries

- not deployment approval
- not funded transaction approval
- not governance transaction approval
- not BscScan verification approval
- not release approval
- not public visibility approval
- not runtime readiness approval
- not staging readiness approval
- not testnet readiness approval
- not mainnet readiness approval

The registry does not process real owner values.
The registry does not call RPC.
The registry does not call BscScan.
The registry does not create files or modify files.
