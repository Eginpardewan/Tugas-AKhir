require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

console.log("🔑 ALCHEMY_API_KEY:", process.env.ALCHEMY_API_KEY);
console.log("🔑 MNEMONIC LOADED:", process.env.SEPOLIA_MNEMONIC ? "YES" : "NO");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: {
        mnemonic: process.env.SEPOLIA_MNEMONIC
      },
      chainId: 11155111
    }
  }
};
