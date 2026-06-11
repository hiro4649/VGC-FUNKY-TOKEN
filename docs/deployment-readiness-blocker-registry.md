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
