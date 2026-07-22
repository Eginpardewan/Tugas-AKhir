require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

const ALCHEMY_API_KEY  = process.env.ALCHEMY_API_KEY  || "";
const SEPOLIA_MNEMONIC = process.env.SEPOLIA_MNEMONIC || "";

console.log("🔑 ALCHEMY_API_KEY:", ALCHEMY_API_KEY  ? "✅ SET" : "❌ MISSING");
console.log("🔑 MNEMONIC LOADED:", SEPOLIA_MNEMONIC ? "✅ SET" : "❌ MISSING");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      ...(SEPOLIA_MNEMONIC
        ? { accounts: { mnemonic: SEPOLIA_MNEMONIC } }
        : {}),
      chainId: 11155111
    }
  }
};
