require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

// Only use PRIVATE_KEY if it's a valid 32-byte hex key — ignores placeholder
// values from .env.example (e.g. "your_wallet_private_key_here") so the local
// Hardhat node still starts without a real deployer key configured.
const PRIVATE_KEY =
  process.env.PRIVATE_KEY && /^0x[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY)
    ? process.env.PRIVATE_KEY
    : undefined;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    amoy: {
      url: process.env.RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};
