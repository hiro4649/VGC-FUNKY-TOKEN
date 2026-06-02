# Governance Checklist

This checklist is not governance approval.

FUNKY token is the VGC Model token implementation.
Current on-chain ERC20 identity is name = `FUNKY` and symbol = `FUNKY RAVE`.
This identity is unusual because ERC20 symbol is normally a short ticker.
Do not silently change it.
Do not deploy until the owner explicitly confirms whether this identity is final.

This repository is token-only.
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

## initialAdmin Address Policy

- Decide whether `initialAdmin` must be a multisig.
- Document chain-specific address.

## feeRecipient Address Policy

- Decide whether `feeRecipient` must be a multisig or treasury address.
- Document chain-specific address.

## Multisig Owner Policy

- Confirm provider.
- Confirm signers.
- Confirm threshold.
- Confirm recovery process.

## TierUpdater Deploy and Owner Policy

- Confirm deploy order.
- Confirm owner.
- Confirm relayer list.
- Confirm operational handoff.

## Trusted Factory Policy

- Confirm factory addresses per chain.
- Confirm factory validation procedure.

## Initial Pair Policy

- Confirm pair address.
- Confirm pair tokens.
- Confirm pair factory.

## Fee Exemption Policy

- Confirm who can grant exemptions.
- Confirm category and reason code usage.
- Confirm exemption cap handling.

## Admin Rotation Policy

- Confirm admin add/remove process.
- Confirm last-admin protection.
- Confirm post-deploy admin ownership target.
