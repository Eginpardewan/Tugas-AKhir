const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Memulai deployment TajwidNilai ke Sepolia...\n");

  if (!process.env.ALCHEMY_API_KEY || !process.env.SEPOLIA_MNEMONIC) {
    throw new Error("❌ Pastikan ALCHEMY_API_KEY dan SEPOLIA_MNEMONIC sudah di .env");
  }

  const provider = new ethers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  );

  const wallet = ethers.Wallet.fromPhrase(process.env.SEPOLIA_MNEMONIC).connect(provider);

  console.log("👤 Alamat Deployer :", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Saldo Deployer  :", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Saldo rendah, gas mungkin tidak cukup!");
  }

  console.log("\n⏳ Menyiapkan kontrak TajwidNilai...");

  const Contract = await ethers.getContractFactory("TajwidNilai", wallet);
  const contract = await Contract.deploy();

  const tx = contract.deploymentTransaction();
  console.log("📨 Hash Transaksi Deploy :", tx.hash);
  console.log("⏳ Menunggu konfirmasi...");

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ TajwidNilai berhasil di-deploy!");
  console.log("📍 Alamat Kontrak   :", contractAddress);
  console.log("🌐 Network          : Sepolia Testnet");

  // Simpan address ke file
  const filePath = path.join(__dirname, "..", "deployed-nilai-address.txt");
  fs.writeFileSync(filePath, contractAddress, "utf8");
  console.log("💾 Address disimpan ke deployed-nilai-address.txt");

  // Tambahkan ke .env backend secara otomatis
  const envPath = path.join(__dirname, "..", "backend", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  if (envContent.includes("TAJWID_NILAI_CONTRACT=")) {
    envContent = envContent.replace(
      /TAJWID_NILAI_CONTRACT=.*/,
      `TAJWID_NILAI_CONTRACT=${contractAddress}`
    );
  } else {
    envContent += `\nTAJWID_NILAI_CONTRACT=${contractAddress}`;
  }

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log("✅ TAJWID_NILAI_CONTRACT otomatis ditambahkan ke backend/.env");

  console.log("\n🎉 Deployment selesai!");
  console.log("➡️ Contract address:", contractAddress);
  console.log("💡 Tambahkan ke frontend (user.html):");
  console.log(`   const NILAI_CONTRACT_ADDRESS = "${contractAddress}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ TERJADI KESALAHAN SAAT DEPLOY:");
    console.error(error);
    process.exit(1);
  });
