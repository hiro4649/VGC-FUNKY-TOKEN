# VGC-TOKEN Source Invariant Audit

## Purpose

The source invariant audit is a no-deploy local check for VGC-FUNKY-TOKEN
contract, deploy script, configure script, workflow, and owner-policy
boundaries. It reports hard failures, blocked owner-approved actions, and
manual review items without changing runtime behavior.

## Commands

```powershell
node scripts/audit-vgc-token-source-invariants.js
node scripts/audit-vgc-token-source-invariants.js --json
node scripts/test-vgc-token-source-invariant-audit-snapshot.js
```

The snapshot guard prevents silent weakening of manual review items, blocked
owner-approval boundaries, and non-action lines.
The owner policy decision matrix maps the manual review items to explicit
pending owner policy decisions.
The owner policy matrix snapshot is the downstream guard that keeps those
manual review items present and pending.
The owner policy preflight gate then keeps testnet action blocked while those
manual review items remain unresolved owner policy decisions.

## What It Checks

- token identity remains `FUNKY RAVE` / `FUNKY`
- initial supply mint expression remains present
- fee denominator and max fee boundary are surfaced for owner policy review
- sell/LP-add fee direction is surfaced for business confirmation
- tier updater initial state, contract-only add rule, and last-removal policy
- trusted factory and pair validation boundaries
- fee exemption governance metadata boundaries
- deploy and configure validate-only ordering
- deploy and configure runtime paths remain blocked until explicit owner approval
- workflow no-deploy boundaries
- owner decision and preflight toolchain boundaries
- forbidden readiness claims and secret-like content boundaries

## Manual Review Items

- fee denominator and max fee require owner policy confirmation
- sell/LP-add-only fee behavior requires business confirmation
- last tier updater removal policy requires owner confirmation
- trusted factory registration policy requires owner confirmation
- fee exemption proposer/approver policy requires owner confirmation
- validate-only cannot prove tier updater code presence without RPC

## Hard Fail Items

- token identity mismatch
- initial supply expression mismatch
- missing validate-only boundary before deploy/configure runtime paths
- missing workflow validate-only boundary
- affirmative readiness or approval claim
- unsafe secret-like content finding

## What It Does Not Prove

This audit is not deployment approval.
This audit is not funded transaction approval.
This audit is not governance transaction approval.
This audit is not BscScan verification approval.
This audit is not release approval.
This audit is not public visibility approval.
This audit is not runtime readiness.
This audit is not staging readiness.
This audit is not testnet readiness.
This audit is not mainnet readiness.
This audit is not smart contract audit completeness.
