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
  // SETUP PROVIDER (ETHERS V6)
  // ==============================
  const provider = new ethers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  );

  // ==============================
  // SETUP WALLET (MNEMONIC)
  // ==============================
  const wallet = ethers.Wallet.fromPhrase(process.env.SEPOLIA_MNEMONIC).connect(provider);

  console.log("👤 Alamat Deployer :", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Saldo Deployer  :", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Saldo rendah, gas mungkin tidak cukup!");
  }

  // ==============================
  // DEPLOY CONTRACT
  // ==============================
  console.log("\n⏳ Menyiapkan kontrak SertifikatTajwid...");

  // ⚠️ PASTIKAN NAMA SESUAI CONTRACT SOLIDITY
  const Contract = await ethers.getContractFactory("SertifikatTajwid", wallet);

  const contract = await Contract.deploy();

  const tx = contract.deploymentTransaction();

  console.log("📨 Hash Transaksi Deploy :", tx.hash);
  console.log("⏳ Menunggu konfirmasi deployment...");

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  // ==============================
  // OUTPUT HASIL
  // ==============================
  console.log("\n✅ Smart contract berhasil di-deploy!");
  console.log("📍 Alamat Kontrak   :", contractAddress);
  console.log("🌐 Network          : Sepolia Testnet");
  console.log("🔗 Chain ID         : 11155111");

  // ==============================
  // SIMPAN ADDRESS
  // ==============================
  const filePath = path.join(__dirname, "..", "deployed-address.txt");

  fs.writeFileSync(filePath, contractAddress, "utf8");

  console.log("💾 Alamat kontrak disimpan ke deployed-address.txt");

  // ==============================
  // VALIDASI BYTECODE
  // ==============================
  const code = await provider.getCode(contractAddress);

  console.log(
    "📦 Bytecode Terpasang :",
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