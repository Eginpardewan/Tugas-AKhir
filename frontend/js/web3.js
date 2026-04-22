// Konfigurasi Web3 untuk Tajwid Learning
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

// Contract Addresses (akan diupdate setelah deploy)
let SERTIFIKAT_ADDRESS = "";
let MATERI_ADDRESS = "";

// Load contract addresses dari file
async function loadContractAddresses() {
    try {
        const response = await fetch('/contract-address.json');
        const data = await response.json();
        SERTIFIKAT_ADDRESS = data.sertifikatAddress;
        MATERI_ADDRESS = data.materiAddress;
        console.log("✅ Contract addresses loaded:", { SERTIFIKAT_ADDRESS, MATERI_ADDRESS });
        return true;
    } catch (error) {
        console.error("❌ Gagal load contract addresses:", error);
        // Fallback ke hardcoded (update setelah deploy)
        SERTIFIKAT_ADDRESS = localStorage.getItem("sertifikatAddress") || "0x...";
        MATERI_ADDRESS = localStorage.getItem("materiAddress") || "0x...";
        return false;
    }
}

// ABI Contracts
const SERTIFIKAT_ABI = [
    "function simpanHasilUjian(address _user, uint256 _nilai) external",
    "function konfirmasiPembayaran(address _user) external payable",
    "function terbitkanSertifikat(address _pemilik, string memory _namaUser, string memory _ipfsHash) external returns (uint256)",
    "function dapatkanSemuaSertifikat() external view returns (tuple(uint256 id, address pemilik, string namaUser, uint256 nilai, uint256 tanggalTerbit, string ipfsHash, bool isValid)[])",
    "function dapatkanSertifikatSaya(address _user) external view returns (tuple(uint256 id, address pemilik, string namaUser, uint256 nilai, uint256 tanggalTerbit, string ipfsHash, bool isValid)[])",
    "function dapatkanSertifikatById(uint256 _id) external view returns (tuple(uint256 id, address pemilik, string namaUser, uint256 nilai, uint256 tanggalTerbit, string ipfsHash, bool isValid))",
    "function cekKelayakanSertifikat(address _user) external view returns (bool, uint256, bool)",
    "function biayaSertifikat() external view returns (uint256)",
    "function admin() external view returns (address)"
];

const MATERI_ABI = [
    "function tambahMateri(string memory _judul, string memory _bab, string memory _konten, string memory _videoUrl, string memory _audioUrl, uint256 _urutan) external",
    "function tambahSoal(string memory _bab, string memory _pertanyaan, string memory _pilihanA, string memory _pilihanB, string memory _pilihanC, string memory _pilihanD, uint8 _jawabanBenar, uint256 _poin) external",
    "function dapatkanSemuaMateri() external view returns (tuple(uint256 id, string judul, string bab, string konten, string videoUrl, string audioUrl, uint256 urutan, uint256 timestamp)[])",
    "function dapatkanMateriByBab(string memory _bab) external view returns (tuple(uint256 id, string judul, string bab, string konten, string videoUrl, string audioUrl, uint256 urutan, uint256 timestamp)[])",
    "function dapatkanSoalByBab(string memory _bab) external view returns (tuple(uint256 id, string bab, string pertanyaan, string pilihanA, string pilihanB, string pilihanC, string pilihanD, uint8 jawabanBenar, uint256 poin)[])",
    "function submitNilai(address _user, string memory _bab, uint256 _nilai, uint256 _percobaanKe) external",
    "function dapatkanNilaiUser(address _user, string memory _bab) external view returns (uint256)",
    "function dapatkanSemuaNilaiUser(address _user) external view returns (tuple(address user, string bab, uint256 nilai, uint256 timestamp, uint256 percobaanKe)[])"
];

let provider;
let signer;
let contractSertifikat;
let contractMateri;
let currentAccount;

// Inisialisasi Web3
async function initWeb3() {
    if (!window.ethereum) {
        showToast("MetaMask tidak terinstall!", "error");
        return false;
    }
    
    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        currentAccount = await signer.getAddress();
        
        await loadContractAddresses();
        
        contractSertifikat = new ethers.Contract(SERTIFIKAT_ADDRESS, SERTIFIKAT_ABI, signer);
        contractMateri = new ethers.Contract(MATERI_ADDRESS, MATERI_ABI, signer);
        
        // Cek network
        const network = await provider.getNetwork();
        if (network.chainId !== 11155111n) {
            showToast("Harap pindah ke Sepolia Testnet!", "warning");
            return false;
        }
        
        console.log("✅ Web3 initialized:", currentAccount);
        return true;
    } catch (error) {
        console.error("❌ Init Web3 failed:", error);
        return false;
    }
}

// Connect Wallet
async function connectWallet() {
    if (!window.ethereum) {
        showToast("MetaMask tidak ditemukan!", "error");
        return null;
    }
    
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        currentAccount = accounts[0];
        localStorage.setItem("walletAddress", currentAccount);
        
        await initWeb3();
        
        showToast("Wallet berhasil terhubung!", "success");
        return currentAccount;
    } catch (error) {
        console.error(error);
        showToast("Gagal connect wallet", "error");
        return null;
    }
}

// Cek apakah user adalah admin
async function isAdmin() {
    if (!contractSertifikat) return false;
    try {
        const adminAddress = await contractSertifikat.admin();
        return adminAddress.toLowerCase() === currentAccount?.toLowerCase();
    } catch (error) {
        return false;
    }
}

// Simpan hasil ujian (admin only)
async function simpanHasilUjian(userAddress, nilai) {
    if (!contractSertifikat) throw new Error("Contract not initialized");
    
    try {
        const tx = await contractSertifikat.simpanHasilUjian(userAddress, nilai);
        await tx.wait();
        showToast("Hasil ujian berhasil disimpan!", "success");
        return true;
    } catch (error) {
        console.error(error);
        showToast("Gagal menyimpan hasil ujian", "error");
        return false;
    }
}

// Konfirmasi pembayaran (admin only)
async function konfirmasiPembayaran(userAddress, amountInETH) {
    if (!contractSertifikat) throw new Error("Contract not initialized");
    
    try {
        const amount = ethers.parseEther(amountInETH.toString());
        const tx = await contractSertifikat.konfirmasiPembayaran(userAddress, { value: amount });
        await tx.wait();
        showToast("Pembayaran berhasil dikonfirmasi!", "success");
        return true;
    } catch (error) {
        console.error(error);
        showToast("Gagal konfirmasi pembayaran", "error");
        return false;
    }
}

// Terbitkan sertifikat (admin only)
async function terbitkanSertifikat(userAddress, userName, ipfsHash) {
    if (!contractSertifikat) throw new Error("Contract not initialized");
    
    try {
        const tx = await contractSertifikat.terbitkanSertifikat(userAddress, userName, ipfsHash);
        const receipt = await tx.wait();
        showToast("Sertifikat berhasil diterbitkan di blockchain!", "success");
        return receipt;
    } catch (error) {
        console.error(error);
        showToast("Gagal menerbitkan sertifikat", "error");
        return null;
    }
}

// Dapatkan semua sertifikat
async function dapatkanSemuaSertifikat() {
    if (!contractSertifikat) return [];
    try {
        return await contractSertifikat.dapatkanSemuaSertifikat();
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Dapatkan sertifikat user
async function dapatkanSertifikatSaya() {
    if (!contractSertifikat || !currentAccount) return [];
    try {
        return await contractSertifikat.dapatkanSertifikatSaya(currentAccount);
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Cek kelayakan sertifikat
async function cekKelayakanSertifikat() {
    if (!contractSertifikat || !currentAccount) return { layak: false, nilai: 0, sudahBayar: false };
    try {
        const [layak, nilai, sudahBayar] = await contractSertifikat.cekKelayakanSertifikat(currentAccount);
        return { layak, nilai: Number(nilai), sudahBayar };
    } catch (error) {
        console.error(error);
        return { layak: false, nilai: 0, sudahBayar: false };
    }
}

// Dapatkan semua materi
async function dapatkanSemuaMateri() {
    if (!contractMateri) return [];
    try {
        return await contractMateri.dapatkanSemuaMateri();
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Dapatkan soal per bab
async function dapatkanSoalByBab(bab) {
    if (!contractMateri) return [];
    try {
        return await contractMateri.dapatkanSoalByBab(bab);
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Submit nilai ujian (admin only)
async function submitNilaiUjian(userAddress, bab, nilai, percobaanKe) {
    if (!contractMateri) throw new Error("Contract not initialized");
    try {
        const tx = await contractMateri.submitNilai(userAddress, bab, nilai, percobaanKe);
        await tx.wait();
        showToast("Nilai berhasil disimpan!", "success");
        return true;
    } catch (error) {
        console.error(error);
        showToast("Gagal menyimpan nilai", "error");
        return false;
    }
}

// Dapatkan nilai user per bab
async function dapatkanNilaiUser(userAddress, bab) {
    if (!contractMateri) return 0;
    try {
        const nilai = await contractMateri.dapatkanNilaiUser(userAddress, bab);
        return Number(nilai);
    } catch (error) {
        return 0;
    }
}

// Show toast notification
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "cyber-toast";
    toast.style.background = type === "error" ? "linear-gradient(135deg, #ff2a6d, #ff4757)" :
                              type === "success" ? "linear-gradient(135deg, #2E7D32, #00ff88)" :
                              "linear-gradient(135deg, #bc13fe, #00f2ff)";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Event listeners untuk MetaMask
if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            localStorage.removeItem("walletAddress");
            currentAccount = null;
            showToast("Wallet disconnected", "warning");
            window.location.reload();
        } else if (accounts[0] !== currentAccount) {
            currentAccount = accounts[0];
            localStorage.setItem("walletAddress", currentAccount);
            showToast("Akun berubah, reload halaman", "info");
            window.location.reload();
        }
    });
    
    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}

// Export functions
window.web3 = {
    initWeb3,
    connectWallet,
    isAdmin,
    simpanHasilUjian,
    konfirmasiPembayaran,
    terbitkanSertifikat,
    dapatkanSemuaSertifikat,
    dapatkanSertifikatSaya,
    cekKelayakanSertifikat,
    dapatkanSemuaMateri,
    dapatkanSoalByBab,
    submitNilaiUjian,
    dapatkanNilaiUser,
    showToast,
    get currentAccount() { return currentAccount; }
};

// Auto init
document.addEventListener("DOMContentLoaded", async () => {
    await loadContractAddresses();
    const savedWallet = localStorage.getItem("walletAddress");
    if (savedWallet && window.ethereum) {
        await initWeb3();
    }
});