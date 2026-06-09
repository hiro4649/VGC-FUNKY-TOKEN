# Owner Policy Preflight Gate

## Purpose

The owner policy preflight gate is a no-deploy local check that combines the
testnet preflight gate with the owner policy decision matrix. It keeps testnet
action blocked while fee, tier, factory, and exemption policy decisions remain
unresolved.

## Relationship To Testnet Preflight Gate

The gate preserves the lower-level testnet preflight gate status. The expected
default status remains `BLOCKED_OWNER_DECISIONS_PENDING`.

## Relationship To Owner Policy Decision Matrix

The gate consumes the owner policy decision matrix and raises the combined
status to `BLOCKED_OWNER_POLICY_DECISIONS_PENDING` while policy decisions remain
pending.

## Commands

```powershell
node scripts/check-owner-policy-preflight-gate.js
node scripts/check-owner-policy-preflight-gate.js --json
```

Expected status: `BLOCKED_OWNER_POLICY_DECISIONS_PENDING`.

## Explicit Boundaries

This gate is not deployment approval.
This gate is not funded transaction approval.
This gate is not governance transaction approval.
This gate is not BscScan verification approval.
This gate is not release approval.
This gate is not public visibility approval.
This gate is not runtime readiness.
This gate is not staging readiness.
This gate is not testnet readiness.
This gate is not mainnet readiness.
