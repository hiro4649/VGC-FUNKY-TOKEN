# BscScan Verification Checklist

This checklist is not deployment or verification approval.

BscScan verification remains pending until owner approval is recorded in `docs/testnet-preflight-owner-decisions.md`.
Dry-run validation does not approve BscScan verification.

## BSC Testnet Verification Steps

- Confirm deployed testnet address.
- Confirm compiler version.
- Confirm constructor args.
- Confirm source file mapping.
- Confirm dependencies and local ERC20 source.

## BSC Mainnet Verification Steps

- Confirm deployed mainnet address.
- Confirm compiler version.
- Confirm constructor args.
- Confirm source file mapping.
- Confirm dependencies and local ERC20 source.

## Compiler Version Check

- Match Hardhat compiler settings to the deployed bytecode.

## Constructor Args Check

- Confirm `initialAdmin`.
- Confirm `initialFeeRecipient`.

## Source File Check

- Confirm `contracts/funky/funky.sol`.
- Confirm `contracts/funky/FunkyTierUpdater.sol` if verifying TierUpdater.
- Confirm `contracts/funky/ERC20.sol`.

## Library/Dependency Check

- Confirm whether the local vendored ERC20 source or OpenZeppelin imports are used.

## Secret Boundary

- Do not expose secrets.
- Do not print private keys, mnemonics, RPC URLs, API keys, DB URLs, JWTs, cookies, or `.env` values.
