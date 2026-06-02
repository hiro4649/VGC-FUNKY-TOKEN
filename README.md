# VGC-FUNKY-TOKEN

FUNKY token is the VGC Model token implementation.

Final pre-deploy ERC20 name is `FUNKY RAVE`.
Final pre-deploy ERC20 symbol is `FUNKY`.
Source contract is `contracts/funky/funky.sol`.

Final pre-deploy ERC20 identity:

- name = `FUNKY RAVE`
- symbol = `FUNKY`

This is a pre-deploy identity correction.
The symbol is the short ticker.

This repository contains token-only source, tests, and deployment tooling.

This repository does not prove deployment readiness by itself.
This repository does not prove runtime readiness by itself.
This repository does not prove staging readiness by itself.
This repository does not prove testnet readiness by itself.
This repository does not prove mainnet readiness by itself.

No deployment has been performed from this repository.
No funded transaction has been performed from this repository.
No governance transaction has been performed from this repository.

## Test

```powershell
npm --prefix contracts test
npm --prefix contracts run compile
cd contracts
npx hardhat test test/FunkyRave.test.js
cd ..
```

## Included Scope

- `contracts/funky/funky.sol`
- `contracts/funky/FunkyTierUpdater.sol`
- `contracts/funky/ERC20.sol`
- `contracts/funky/Context.sol`
- `contracts/funky/IERC20.sol`
- `contracts/funky/IERC20Metadata.sol`
- `contracts/funky/draft-IERC6093.sol`
- `contracts/funky/MockDexFactory.sol`
- `contracts/funky/MockDexPair.sol`
- `contracts/funky/MockTierUpdater.sol`
- `contracts/test/FunkyRave.test.js`
- `contracts/scripts/deploy-funky.js`
- `contracts/scripts/configure-funky-governance.js`
- `contracts/hardhat.config.js`
- `contracts/package.json`
- `contracts/package-lock.json`
- token-only checklist and audit notes under `docs/`
