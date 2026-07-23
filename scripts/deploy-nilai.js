const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Memulai deployment TajwidNilai ke Sepolia...\n");

  if (!process.env.ALCHEMY_API_KEY || !process.env.SEPOLIA_MNEMONIC) {
    throw new Error("❌ Pastikan ALCHEMY_API_KEY dan SEPOLIA_MNEMONIC sudah di .env");
  }

  const [deployer] = await ethers.getSigners();

  console.log("👤 Alamat Deployer :", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Saldo Deployer  :", ethers.utils.formatEther(balance), "ETH");

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.warn("⚠️  Saldo rendah, gas mungkin tidak cukup!");
  }

  console.log("\n⏳ Menyiapkan kontrak TajwidNilai...");

  const Contract = await ethers.getContractFactory("TajwidNilai");
  const contract = await Contract.deploy();
  await contract.deployed();

  const contractAddress = contract.address;

  console.log("\n✅ TajwidNilai berhasil di-deploy!");
  console.log("📍 Alamat Kontrak   :", contractAddress);
  console.log("🌐 Network          : Sepolia Testnet");
  console.log("👤 Admin (deployer) :", deployer.address);

  // Simpan address ke file
  const filePath = path.join(__dirname, "..", "deployed-nilai-address.txt");
  fs.writeFileSync(filePath, contractAddress, "utf8");
  console.log("💾 Address disimpan ke deployed-nilai-address.txt");

  // Update backend .env
  const envPath = path.join(__dirname, "..", "backend", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  // Update atau tambah TAJWID_NILAI_CONTRACT
  if (envContent.includes("TAJWID_NILAI_CONTRACT=")) {
    envContent = envContent.replace(
      /TAJWID_NILAI_CONTRACT=.*/,
      `TAJWID_NILAI_CONTRACT=${contractAddress}`
    );
  } else {
    envContent += `\nTAJWID_NILAI_CONTRACT=${contractAddress}`;
  }

  // Update atau tambah ALCHEMY_API_KEY di backend .env
  if (!envContent.includes("ALCHEMY_API_KEY=") || envContent.includes("ALCHEMY_API_KEY=\n") || envContent.includes("ALCHEMY_API_KEY=\r")) {
    if (envContent.includes("ALCHEMY_API_KEY=")) {
      envContent = envContent.replace(
        /ALCHEMY_API_KEY=.*/,
        `ALCHEMY_API_KEY=${process.env.ALCHEMY_API_KEY}`
      );
    } else {
      envContent += `\nALCHEMY_API_KEY=${process.env.ALCHEMY_API_KEY}`;
    }
  }

  // Update atau tambah SEPOLIA_MNEMONIC di backend .env
  if (!envContent.includes("SEPOLIA_MNEMONIC=")) {
    envContent += `\nSEPOLIA_MNEMONIC=${process.env.SEPOLIA_MNEMONIC}`;
  }

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log("✅ Backend .env updated dengan contract address + blockchain config");

  // Validasi bytecode
  const code = await deployer.provider.getCode(contractAddress);
  console.log(
    "\n📦 Bytecode Terpasang :",
    code !== "0x" ? "✅ YA" : "❌ TIDAK"
  );

  console.log("\n🎉 Deployment selesai!");
  console.log("➡️ Contract address:", contractAddress);
  console.log("💡 Backend akan otomatis menggunakan address ini dari .env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ TERJADI KESALAHAN SAAT DEPLOY:");
    console.error(error);
    process.exit(1);
  });
