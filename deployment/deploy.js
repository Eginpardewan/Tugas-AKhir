const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Memulai proses deployment SMART CONTRACT TAJWID ke Sepolia...\n");

  // ==============================
  // VALIDASI ENV
  // ==============================
  if (!process.env.ALCHEMY_API_KEY || !process.env.SEPOLIA_MNEMONIC) {
    throw new Error("❌ Pastikan ALCHEMY_API_KEY dan SEPOLIA_MNEMONIC sudah di .env");
  }

  // ==============================
  // SETUP PROVIDER (ETHERS V5)
  // ==============================
  const [deployer] = await ethers.getSigners();

  console.log("👤 Alamat Deployer :", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Saldo Deployer  :", ethers.utils.formatEther(balance), "ETH");

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.warn("⚠️  Saldo rendah, gas mungkin tidak cukup!");
  }

  // ==============================
  // DEPLOY CONTRACT
  // ==============================
  console.log("\n⏳ Menyiapkan kontrak SertifikatTajwid...");

  const Contract = await ethers.getContractFactory("SertifikatTajwid");
  const contract = await Contract.deploy();
  await contract.deployed();

  const contractAddress = contract.address;

  // ==============================
  // OUTPUT HASIL
  // ==============================
  console.log("\n✅ Smart contract berhasil di-deploy!");
  console.log("📍 Alamat Kontrak   :", contractAddress);
  console.log("🌐 Network          : Sepolia Testnet");
  console.log("🔗 Chain ID         : 11155111");

  // ==============================
  // SIMPAN ADDRESS KE FILE
  // ==============================
  const filePath = path.join(__dirname, "..", "deployed-address.txt");
  fs.writeFileSync(filePath, contractAddress, "utf8");
  console.log("💾 Alamat kontrak disimpan ke deployed-address.txt");

  // ==============================
  // UPDATE blockchain-config.js
  // ==============================
  const configPath = path.join(__dirname, "..", "frontend", "js", "blockchain-config.js");
  const configContent = `// ============================================================
// BLOCKCHAIN CONFIG — AUTO GENERATED oleh deploy.js
// Jalankan: npx hardhat run deployment/deploy.js --network sepolia
// ============================================================
const BLOCKCHAIN_CONFIG = {
    network: 'sepolia',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}',
    chainId: '0xaa36a7',        // 11155111 dalam hex
    chainIdDecimal: 11155111,
    networkName: 'Sepolia Testnet',
    currencySymbol: 'ETH',
    contractAddress: '${contractAddress}',
    sharedWalletAddress: '0xeeF8b2583b95624285054839F25F5A50b45Cb106',
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerTxUrl: 'https://sepolia.etherscan.io/tx/'
};
`;
  fs.writeFileSync(configPath, configContent, "utf8");
  console.log("💾 Konfigurasi blockchain disimpan ke frontend/js/blockchain-config.js");

  // ==============================
  // VALIDASI BYTECODE
  // ==============================
  const code = await deployer.provider.getCode(contractAddress);
  console.log(
    "\n📦 Bytecode Terpasang :",
    code !== "0x" ? "✅ YA" : "❌ TIDAK"
  );

  console.log("\n🎉 Deployment selesai dengan sukses!");
  console.log("👉 Jangan lupa update contractAddress di frontend:");
  console.log("➡️", contractAddress);
}

// ==============================
// RUN SCRIPT
// ==============================
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ TERJADI KESALAHAN SAAT DEPLOY:");
    console.error(error);

    console.error("\n🔍 Kemungkinan penyebab:");
    console.error("1. Saldo Sepolia ETH tidak mencukupi");
    console.error("2. ALCHEMY_API_KEY salah atau belum diisi");
    console.error("3. SEPOLIA_MNEMONIC salah atau belum diisi");
    console.error("4. Contract belum di-compile (jalankan: npx hardhat compile)");
    console.error("5. Koneksi internet bermasalah");

    process.exit(1);
  });