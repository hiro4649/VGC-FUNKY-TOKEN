# Deployment Checklist

This checklist is planning and verification support only. It is not deployment approval.

## Test Checklist

- Run `npm --prefix contracts test`.
- Run `npm --prefix contracts run compile`.
- Run `cd contracts && npx hardhat test test/FunkyRave.test.js`.
- Confirm tests cover FUNKY identity, constructor supply, decimals, fees, DEX path, wallet path, admin behavior, fee exemption, and TierUpdater behavior.

## Deployment Dry-Run Checklist

- Use a non-funded local or dry-run environment first.
- Confirm constructor arguments before any broadcast.
- Confirm chain target before any broadcast.
- Confirm no private keys or RPC secrets are printed.

## BSC Testnet Checklist

- Confirm BSC testnet RPC is configured outside git.
- Confirm testnet account policy.
- Confirm testnet deploy order.
- Confirm testnet BscScan verification process.

## feeRecipient Checklist

- Confirm feeRecipient address.
- Confirm feeRecipient ownership and access policy.
- Confirm feeRecipient is not a temporary EOA unless explicitly approved.

## initialAdmin Checklist

- Confirm initialAdmin address.
- Confirm whether initialAdmin is a multisig.
- Confirm last-admin protection expectations.

## TierUpdater Checklist

- Confirm TierUpdater deployment address.
- Confirm TierUpdater owner.
- Confirm TierUpdater relayer policy.
- Confirm registered TierUpdater is a contract, not an EOA.

## Multisig Checklist

- Confirm multisig provider.
- Confirm signer list.
- Confirm threshold.
- Confirm recovery policy.

## DEX Factory Checklist

- Confirm trusted factory list.
- Confirm factory address by chain.
- Confirm pair validation assumptions.

## Initial Pair Checklist

- Confirm initial pair address.
- Confirm pair tokens.
- Confirm pair factory.

## No-Funded-Transaction Boundary

- Do not perform funded transactions without explicit owner instruction.

## No-Governance-Transaction Boundary

- Do not perform governance transactions without explicit owner instruction.
