const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const ethers = require('ethers');

// Load env dari folder backend
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file statis (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =====================================================
// BUAT FOLDER UPLOADS
// =====================================================
const uploadDirs = [
    'uploads',
    'uploads/videos',
    'uploads/audios',
    'uploads/images',
    'uploads/docs',
    'uploads/payments'
];
uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// =====================================================
// KONEKSI SQLITE
// =====================================================
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Paksa better-sqlite3 mengembalikan Number (bukan BigInt)
// agar aman di-serialize oleh JSON.stringify di Express
db.defaultSafeIntegers(false);

console.log(`🗄️  Database SQLite: ${dbPath}`);

// Inisialisasi tabel & data awal
require('./db/init')(db);

// =====================================================
// HELPER: dbQuery — wrapper agar kompatibel dengan
// pola async/await yang sudah ada di semua routes.
// better-sqlite3 bersifat synchronous, wrapper ini
// membungkusnya dalam Promise agar tidak perlu
// mengubah semua kode routes.
// =====================================================
const dbQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const sqlUpper = sql.trim().toUpperCase();

            if (sqlUpper.startsWith('SELECT') || sqlUpper.startsWith('PRAGMA')) {
                // SELECT → kembalikan array hasil
                const rows = stmt.all(...params);
                resolve(rows);
            } else {
                // INSERT / UPDATE / DELETE
                const info = stmt.run(...params);
                // Konversi lastInsertRowid ke Number untuk menghindari BigInt crash
                resolve({ insertId: Number(info.lastInsertRowid), affectedRows: info.changes });
            }
        } catch (err) {
            reject(err);
        }
    });
};

// =====================================================
// SETUP BLOCKCHAIN WALLET (untuk backend recording)
// =====================================================
let blockchainWallet = null;
let nilaiContract = null;

const NILAI_CONTRACT_ABI = [
    "function submitNilaiBab(address _user, string memory _babNama, uint256 _nilai) external",
    "function getNilaiBab(address _user, string memory _babNama) external view returns (tuple(address user, string babNama, uint256 nilai, bool isLulus, uint256 percobaanKe, uint256 timestamp))",
    "function cekLulusBab(address _user, string memory _babNama) external view returns (bool)",
    "function jumlahPercobaan(address, string) external view returns (uint256)",
    "function totalHasil() external view returns (uint256)",
    "function admin() external view returns (address)"
];

function setupBlockchain() {
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    const mnemonic = process.env.SEPOLIA_MNEMONIC;
    const contractAddr = process.env.TAJWID_NILAI_CONTRACT;

    if (!alchemyKey || !mnemonic) {
        console.warn('⚠️  ALCHEMY_API_KEY atau SEPOLIA_MNEMONIC belum diset. Blockchain recording dinonaktifkan.');
        return;
    }

    try {
        const provider = new ethers.providers.JsonRpcProvider(
            `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
        );
        blockchainWallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
        console.log('🔗 Blockchain wallet:', blockchainWallet.address);

        if (contractAddr && contractAddr.length === 42) {
            nilaiContract = new ethers.Contract(contractAddr, NILAI_CONTRACT_ABI, blockchainWallet);
            console.log('📜 TajwidNilai contract:', contractAddr);
        } else {
            console.warn('⚠️  TAJWID_NILAI_CONTRACT belum diset. Deploy dulu: npx hardhat run scripts/deploy-nilai.js --network sepolia');
        }
    } catch (err) {
        console.error('❌ Gagal setup blockchain:', err.message);
    }
}

setupBlockchain();

// =====================================================
// CEK KONFIGURASI IPFS
// =====================================================
console.log('🔑 INFURA_IPFS_PROJECT_ID:', process.env.INFURA_IPFS_PROJECT_ID ? '✅ SET' : '❌ MISSING');
console.log('🔑 INFURA_IPFS_PROJECT_SECRET:', process.env.INFURA_IPFS_PROJECT_SECRET ? '✅ SET' : '❌ MISSING');

// =====================================================
// ROUTES — pass blockchain objects ke user routes
// =====================================================
app.use('/api/auth',    require('./routes/auth')(db, dbQuery));
app.use('/api/admin',   require('./routes/admin')(db, dbQuery));
app.use('/api/user',    require('./routes/user')(db, dbQuery, { blockchainWallet, nilaiContract }));
app.use('/api/payment', require('./routes/payment')(db, dbQuery));

// =====================================================
// JALANKAN SERVER
// =====================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📦 Mode: SQLite (tidak perlu MySQL/Workbench)`);
});