const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Memulai proses deployment ke Sepolia Testnet...\n");

  if (!process.env.ALCHEMY_API_KEY || !process.env.SEPOLIA_MNEMONIC) {
    throw new Error("❌ Pastikan ALCHEMY_API_KEY dan SEPOLIA_MNEMONIC sudah di .env");
  }

  const provider = new ethers.providers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  );

  const wallet = ethers.Wallet.fromMnemonic(process.env.SEPOLIA_MNEMONIC).connect(provider);

  console.log("👤 Alamat Deployer :", wallet.address);

  const balance = await wallet.getBalance();
  console.log("💰 Saldo Deployer  :", ethers.utils.formatEther(balance), "ETH");

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.warn("⚠️  Saldo rendah, gas mungkin tidak cukup!");
  }

  console.log("\n⏳ Menyiapkan kontrak SertifikatTajwid...");

  const SertifikatTajwid = await ethers.getContractFactory("SertifikatTajwid", wallet);
  const sertifikat = await SertifikatTajwid.deploy();
  await sertifikat.deployed();
  const sertifikatAddress = sertifikat.address;

  console.log("✅ SertifikatTajwid berhasil di-deploy!");
  console.log("📍 Alamat Kontrak Sertifikat :", sertifikatAddress);

  console.log("\n⏳ Menyiapkan kontrak TajwidMateri...");

  const TajwidMateri = await ethers.getContractFactory("TajwidMateri", wallet);
  const materi = await TajwidMateri.deploy();
  await materi.deployed();
  const materiAddress = materi.address;

  console.log("✅ TajwidMateri berhasil di-deploy!");
  console.log("📍 Alamat Kontrak Materi :", materiAddress);

  // Simpan alamat kontrak
  const deployedData = {
    sertifikatAddress: sertifikatAddress,
    materiAddress: materiAddress,
    network: "sepolia",
    deployedAt: new Date().toISOString()
  };

  const filePath = path.join(__dirname, "..", "deployed-address.txt");
  fs.writeFileSync(filePath, 
    `SertifikatTajwid: ${sertifikatAddress}\nTajwidMateri: ${materiAddress}\nNetwork: sepolia\nDeployed: ${new Date().toISOString()}`,
    "utf8"
  );
  console.log("💾 Alamat kontrak disimpan ke deployed-address.txt");

  // Simpan juga untuk frontend
  const frontendPath = path.join(__dirname, "..", "frontend", "contract-address.json");
  if (!fs.existsSync(path.dirname(frontendPath))) {
    fs.mkdirSync(path.dirname(frontendPath), { recursive: true });
  }
  fs.writeFileSync(frontendPath, JSON.stringify(deployedData, null, 2));
  console.log("💾 Alamat kontrak disimpan ke frontend/contract-address.json");

  const code = await provider.getCode(sertifikatAddress);
  console.log("📦 Bytecode Sertifikat Terpasang :", code.length > 10 ? "✅ YA" : "❌ TIDAK");

  console.log("\n🎉 Deployment selesai dengan sukses!");
  console.log("👉 Jangan lupa update contractAddress di frontend:", sertifikatAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ TERJADI KESALAHAN SAAT DEPLOY:");
    console.error(error);

    console.error("\n🔍 Kemungkinan penyebab:");
    console.error("1. Saldo Sepolia ETH tidak mencukupi");
    console.error("2. ALCHEMY_API_KEY salah atau belum diisi");
    console.error("3. MNEMONIC salah atau belum diisi");
    console.error("4. Koneksi internet bermasalah");

    process.exit(1);
  });