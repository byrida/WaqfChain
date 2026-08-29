// WaqfChain — deploy WaqfRegistry to local Hardhat node or Polygon Amoy
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying WaqfRegistry to:", hre.network.name);
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  const WaqfRegistry = await ethers.getContractFactory("WaqfRegistry");
  const registry = await WaqfRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("WaqfRegistry deployed to:", address);
  console.log("\nSave this address — you'll need it for the frontend and backend.\n");

  // Create a sample asset so the demo has something to show immediately
  console.log("Creating a sample Waqf asset for demo purposes...");
  const tx = await registry.createAsset(
    "Al-Noor School Endowment",
    "Funds construction of a primary school in rural Sindh",
    "education",
    deployer.address, // deployer acts as trustee for demo
    ethers.parseEther("100")
  );
  await tx.wait();

  console.log("Sample asset created with ID: 0");
  console.log("\n── Demo ready ─────────────────────────────────────────────");
  console.log("Contract:", address);
  console.log("Network: ", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
