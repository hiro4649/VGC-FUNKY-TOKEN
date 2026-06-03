const { ethers, network } = require("hardhat");

function isValidateOnly() {
  return String(process.env.FUNKY_VALIDATE_ONLY || "").toLowerCase() === "true";
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function requireAddressEnv(name) {
  const value = requireEnv(name);
  if (!ethers.isAddress(value)) {
    throw new Error(`Invalid address for env var: ${name}`);
  }
  return value;
}

function listFromEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) return [];
  return value.split(",").map(v => v.trim()).filter(Boolean);
}

function validateAddressList(name) {
  const values = listFromEnv(name);
  for (const value of values) {
    if (!ethers.isAddress(value)) {
      throw new Error(`Invalid address in env var: ${name}`);
    }
  }
  return values;
}

function validateGovernanceInputs() {
  requireAddressEnv("FUNKY_TOKEN_ADDRESS");
  const tierUpdater = (process.env.FUNKY_TIER_UPDATER || "").trim();
  if (tierUpdater && !ethers.isAddress(tierUpdater)) {
    throw new Error("Invalid address for env var: FUNKY_TIER_UPDATER");
  }
  validateAddressList("FUNKY_TRUSTED_FACTORIES");
  validateAddressList("FUNKY_INITIAL_PAIRS");
}

async function maybeSend(txPromiseFactory, skipMessage) {
  try {
    const tx = await txPromiseFactory();
    const receipt = await tx.wait();
    return { sent: true, txHash: receipt.hash };
  } catch (error) {
    if (skipMessage && String(error?.message || "").includes(skipMessage)) {
      return { sent: false, skipped: true };
    }
    throw error;
  }
}

async function main() {
  if (isValidateOnly()) {
    validateGovernanceInputs();
    console.log("Funky governance validation completed.");
    console.log("No governance transaction was sent.");
    return;
  }

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signer available. Set PRIVATE_KEY in env.");
  }
  const deployer = signers[0];
  const tokenAddress = requireAddressEnv("FUNKY_TOKEN_ADDRESS");
  const tierUpdater = (process.env.FUNKY_TIER_UPDATER || "").trim();
  if (tierUpdater && !ethers.isAddress(tierUpdater)) {
    throw new Error("Invalid address for env var: FUNKY_TIER_UPDATER");
  }
  const trustedFactories = validateAddressList("FUNKY_TRUSTED_FACTORIES");
  const initialPairs = validateAddressList("FUNKY_INITIAL_PAIRS");

  console.log("Configuring Funky governance");
  console.log("Network:", network.name);
  console.log("Executor:", deployer.address);
  console.log("Token:", tokenAddress);
  console.log("Tier updater:", tierUpdater || "(none)");
  console.log("Factories:", trustedFactories.length);
  console.log("Pairs:", initialPairs.length);

  const abi = [
    "function isFactory(address) view returns (bool)",
    "function add_factory(address)",
    "function isDex(address) view returns (bool)",
    "function add_pair(address)",
    "function isTierUpdater(address) view returns (bool)",
    "function add_tier_updater(address)"
  ];
  const token = new ethers.Contract(tokenAddress, abi, deployer);

  for (const factory of trustedFactories) {
    const exists = await token.isFactory(factory);
    if (exists) {
      console.log(`Factory already registered: ${factory}`);
      continue;
    }
    const res = await maybeSend(() => token.add_factory(factory));
    console.log(`Factory added: ${factory} tx=${res.txHash}`);
  }

  if (tierUpdater) {
    const exists = await token.isTierUpdater(tierUpdater);
    if (exists) {
      console.log(`Tier updater already registered: ${tierUpdater}`);
    } else {
      const res = await maybeSend(() => token.add_tier_updater(tierUpdater));
      console.log(`Tier updater added: ${tierUpdater} tx=${res.txHash}`);
    }
  }

  for (const pair of initialPairs) {
    const exists = await token.isDex(pair);
    if (exists) {
      console.log(`Pair already registered: ${pair}`);
      continue;
    }
    const res = await maybeSend(() => token.add_pair(pair));
    console.log(`Pair added: ${pair} tx=${res.txHash}`);
  }

  console.log("Governance configuration completed.");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Governance configuration failed:", error);
      process.exit(1);
    });
}

module.exports = {
  isValidateOnly,
  requireAddressEnv,
  validateAddressList,
  validateGovernanceInputs,
};
