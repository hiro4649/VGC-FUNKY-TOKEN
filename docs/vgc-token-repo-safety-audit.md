# VGC-TOKEN Repository Safety Audit

## Purpose

The repository safety audit is a no-deploy local check for VGC-FUNKY-TOKEN.
It scans git-tracked repository files and reports safe pass/fail summaries for
contract identity, workflow boundaries, preflight tooling, owner input
boundaries, secret safety, readiness wording, and remaining owner decisions.

## Scope

The audit reads only tracked repository files with `git ls-files`.
It does not read `.env`.
It does not read process environment secrets.
It does not install packages.
It does not modify files.
It does not create files.
It does not call GitHub, BscScan, RPC, deploy, configure, or transaction paths.
Repository visibility is not changed or approved by this local audit; verify
repository visibility separately through GitHub if needed.

## Commands

```powershell
node scripts/audit-vgc-token-repo-safety.js
node scripts/audit-vgc-token-repo-safety.js --json
node scripts/test-vgc-token-repo-safety-audit-snapshot.js
```

The snapshot guard prevents silent weakening of repository safety audit
categories and non-action boundaries.

## What It Checks

- repository scope files
- final token identity evidence
- contract source boundary
- deploy script validate-only boundary
- configure script validate-only boundary
- workflow no-deploy boundary
- preflight tooling presence
- owner input boundary
- secret safety boundary
- readiness claim boundary
- forbidden content boundary
- package and lockfile presence boundary
- visibility documentation boundary
- remaining owner decision boundary

## What It Does Not Prove

This audit does not prove deployment readiness.
This audit does not prove funded transaction readiness.
This audit does not prove governance transaction readiness.
This audit does not prove BscScan verification readiness.
This audit does not prove release readiness.
This audit does not prove public visibility readiness.
This audit does not prove runtime readiness.
This audit does not prove staging readiness.
This audit does not prove testnet readiness.
This audit does not prove mainnet readiness.

## Explicit Boundaries

- not deployment approval
- not funded transaction approval
- not governance transaction approval
- not BscScan verification approval
- not release approval
- not public visibility approval
- not runtime readiness
- not staging readiness
- not testnet readiness
- not mainnet readiness
