# Audit Notes

FUNKY/FunkyRave is treated as the VGC Model token source of truth from `disco-funky-repair` PR #214.

PR #214 merge commit:
`47cdd611abc61ce1139d89f4bceeed584a9c44a2`

This repo is token-only.

This repo excludes backend, frontend, NFT app code, and Codex harness repair history.

## Current On-Chain ERC20 Identity

- name = `FUNKY`
- symbol = `FUNKY RAVE`

This identity is unusual because ERC20 symbol is normally a short ticker.
Do not silently change it.
Do not deploy until the owner explicitly confirms whether this identity is final.

FUNKY token is the VGC Model token implementation.
This repository does not prove deployment readiness.
This repository does not prove runtime readiness.
This repository does not prove testnet readiness.
This repository does not prove mainnet readiness.

No deploy has been performed.
No funded transaction has been performed.
No governance transaction has been performed.

## Owner Decision

Token identity finalization:

- Option A: keep name `FUNKY` and symbol `FUNKY RAVE`.
- Option B: change to a more conventional identity before any deployment.

Owner decision is required before testnet or mainnet deployment.

Open decision: whether name `FUNKY` and symbol `FUNKY RAVE` remain final for deployment.

Open decision: whether local `ERC20.sol` remains vendored or should be migrated to clean OpenZeppelin imports later.
