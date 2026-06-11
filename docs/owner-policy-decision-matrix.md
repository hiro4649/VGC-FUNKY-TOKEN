# Owner Policy Decision Matrix

## Purpose

The owner policy decision matrix is a no-deploy local check that converts
VGC-TOKEN source invariant audit manual review items into explicit pending
owner policy decisions.

## Commands

```powershell
node scripts/build-owner-policy-decision-matrix.js
node scripts/build-owner-policy-decision-matrix.js --json
node scripts/test-owner-policy-decision-matrix-snapshot.js
```

The snapshot guard prevents silent weakening of pending policy decisions,
`safeTo` flags, and non-approval boundaries.
The owner policy preflight gate consumes this matrix and keeps testnet action
blocked while policy decisions remain pending.
The owner policy preflight gate snapshot guard also keeps the combined blocked
state, pending policy decisions, `safeTo` flags, and non-approval boundaries
stable.
The source-of-truth repository decision is separate from owner policy decisions
and must remain explicit before any later testnet deploy approval path.

## Manual Review Fields

- fee max policy
- fee denominator policy
- sell/LP-add fee behavior policy
- tier updater last-removal policy
- trusted factory registration policy
- fee exemption proposer/approver policy
- tier updater code-presence validation policy

Each field remains `pending_owner_decision` until the owner supplies explicit
policy decisions separately from address or value submission.

## Relationship To Source Invariant Audit

The matrix consumes the safe JSON output from the source invariant audit and
maps its manual review categories into owner decision fields. It does not read
source files directly and does not output raw source content.

## Relationship To Owner Testnet Preflight Values

Owner testnet preflight values can provide public addresses and explicit
approval flags later, but they do not replace these policy decisions. The owner
must resolve policy decisions before any separate explicit deploy instruction.

## Explicit Boundaries

This matrix is not deployment approval.
This matrix is not funded transaction approval.
This matrix is not governance transaction approval.
This matrix is not BscScan verification approval.
This matrix is not release approval.
This matrix is not public visibility approval.
This matrix is not runtime readiness.
This matrix is not staging readiness.
This matrix is not testnet readiness.
This matrix is not mainnet readiness.

The deployment readiness blocker registry includes the owner policy decision
matrix as pending until the owner explicitly resolves those policy decisions.
