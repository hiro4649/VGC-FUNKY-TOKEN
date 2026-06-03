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

function validateDeployInputs() {
  requireAddressEnv("FUNKY_INITIAL_ADMIN");
  requireAddressEnv("FUNKY_INITIAL_FEE_RECIPIENT");
}

async function main() {
  if (isValidateOnly()) {
    validateDeployInputs();
    console.log("FunkyRave deploy validation completed.");
    console.log("No deployment transaction was sent.");
    return;
  }

  const signers = await ethers.getSigners();

  if (signers.length === 0) {
    console.error("No deployer account found.");
    console.error("Set PRIVATE_KEY before deploying.");
    process.exit(1);
  }

  const deployer = signers[0];
  const balance = await ethers.provider.getBalance(deployer.address);

  const initialAdmin = requireAddressEnv("FUNKY_INITIAL_ADMIN");
  const initialFeeRecipient = requireAddressEnv("FUNKY_INITIAL_FEE_RECIPIENT");

  console.log("Deploying FunkyRave");
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "BNB");
  console.log("Initial admin:", initialAdmin);
  console.log("Initial fee recipient:", initialFeeRecipient);

  const FunkyRave = await ethers.getContractFactory("FunkyRave");
  const token = await FunkyRave.deploy(initialAdmin, initialFeeRecipient);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("\nFunkyRave deployed to:", tokenAddress);
  console.log(
    "Verify command:",
    `npx hardhat verify --network ${network.name} ${tokenAddress} "${initialAdmin}" "${initialFeeRecipient}"`
  );
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = {
  isValidateOnly,
  requireAddressEnv,
  validateDeployInputs,
};
