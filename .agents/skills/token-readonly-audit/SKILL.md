---
name: token-readonly-audit
description: Use only for readonly review, metadata audit, and safety-boundary checks in token-only repositories. Never use for deploy, contract mutation, wallet, RPC, BscScan, release, funded transaction, governance transaction, or readiness work.
---

# Token Readonly Audit

Readonly only.

Use this skill for token-only metadata review and safety-boundary checks. It may
inspect repository metadata, manifests, documentation, and safe evidence, then
summarize the current readonly boundaries.

Do not edit contracts. Do not run deploy or configure scripts. Do not access
wallets, RPC endpoints, BscScan verification, release paths, funded
transactions, or governance transactions. Do not approve deployment, BscScan
verification, release, funded transactions, governance transactions, runtime
readiness, production readiness, legal compliance, or mainnet readiness.
