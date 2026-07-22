const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ethers = require('ethers');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/images');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============================================================
// In-memory nonce store (untuk user & admin MetaMask sign)
// ============================================================
const userNonces   = {};  // key: wallet_address lowercase
const adminNonces  = {};  // key: wallet_address lowercase


// Helper: buat pesan nonce standar
function buildNonceMessage(role, nonce) {
    return `Selamat datang di Tajwid Learning!\n\nKlik untuk masuk sebagai ${role}.\nProses ini tidak memerlukan biaya gas.\n\nNonce: ${nonce}`;
}

// Helper: validasi format Ethereum address
function isValidEthAddress(addr) {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

const SHARED_WALLET = '0xeeF8b2583b95624285054839F25F5A50b45Cb106';
const JWT_SECRET    = process.env.JWT_SECRET || 'rahasia';



module.exports = (db, dbQuery) => {
    const router = require('express').Router();

    // ============================================================
    // POST /api/auth/register
    // ============================================================
    router.post('/register', upload.single('foto_profil'), async (req, res) => {
        const {
            username, email, nama_lengkap,
            jenis_kelamin, no_hp, instansi, kota,
            wallet_address, use_shared_wallet
        } = req.body;

        let foto_profil = null;
        if (req.file) {
            foto_profil = `/uploads/images/${req.file.filename}`;
        }

        // --- Validasi wallet ---
        const isShared = use_shared_wallet === 'true' || use_shared_wallet === true || use_shared_wallet === '1';
        let finalWallet = null;

        if (isShared) {
            finalWallet = SHARED_WALLET;
        } else {
            if (!wallet_address || !isValidEthAddress(wallet_address.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Alamat wallet tidak valid. Masukkan address Ethereum yang benar (0x...)'
                });
            }
            finalWallet = wallet_address.trim();
        }

        if (!username || !email || !nama_lengkap) {
            return res.status(400).json({ success: false, message: 'Username, email, dan nama lengkap wajib diisi' });
        }

        try {
            // Generate nomor peserta: TL-{YYYYMMDD}-{Nomor Urut 4 digit}
            const countResult = await dbQuery('SELECT COUNT(*) as total FROM users');
            const urutan = (countResult[0].total + 1).toString().padStart(4, '0');
            const dateObj = new Date();
            const year  = dateObj.getFullYear().toString();
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const day   = dateObj.getDate().toString().padStart(2, '0');
            const nomor_peserta = `TL-${year}${month}${day}-${urutan}`;

            await dbQuery(
                `INSERT INTO users 
                 (username, email, nama_lengkap, jenis_kelamin, no_hp, instansi, kota,
                  foto_profil, nomor_peserta, wallet_address, use_shared_wallet)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    username, email,
                    nama_lengkap || '', jenis_kelamin || null,
                    no_hp || null, instansi || null, kota || null,
                    foto_profil, nomor_peserta,
                    finalWallet, isShared ? 1 : 0
                ]
            );

            res.json({ success: true, message: 'Registrasi berhasil!' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('UNIQUE')) {
                res.status(400).json({ success: false, message: 'Username atau email sudah terdaftar' });
            } else {
                res.status(500).json({ success: false, message: err.message });
            }
        }
    });

    // ============================================================
    // POST /api/auth/login  (USER — langkah 1)
    // Validasi username + password, kembalikan info wallet untuk langkah 2
    // ============================================================
    router.post('/login', async (req, res) => {
        const { email, username, password, role } = req.body;

        // ---- LOGIN ADMIN (legacy email+password — dipertahankan agar tidak breaking) ----
        if (role === 'admin') {
            try {
                if (!email) return res.status(400).json({ success: false, message: 'Email dibutuhkan untuk login admin' });
                const results = await dbQuery('SELECT * FROM admins WHERE email = ?', [email]);
                if (results.length === 0) return res.status(401).json({ success: false, message: 'Email atau password salah' });
                const admin = results[0];
                if (admin.password !== password) return res.status(401).json({ success: false, message: 'Email atau password salah' });

                const token = jwt.sign(
                    { id: admin.id, role: 'admin', username: admin.username },
                    JWT_SECRET, { expiresIn: '7d' }
                );
                return res.json({
                    success: true,
                    token,
                    user: { id: admin.id, username: admin.username, email: admin.email, role: 'admin', wallet_address: admin.wallet_address }
                });
            } catch (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
        }

        // ---- LOGIN USER ----
        // wallet_type: 'shared' = wallet umum (login by username)
        //              'own'    = wallet pribadi (login by MetaMask sign)
        const { wallet_type } = req.body;
        try {
            if (!username) return res.status(400).json({ success: false, message: 'Username dibutuhkan' });

            const results = await dbQuery('SELECT * FROM users WHERE username = ?', [username]);
            if (results.length === 0) return res.status(404).json({ success: false, message: 'Username tidak ditemukan' });

            const user     = results[0];
            const isShared = user.use_shared_wallet === 1;

            // ── Wallet Umum: cukup username ──
            if (wallet_type === 'shared' || isShared) {
                if (!isShared) {
                    return res.status(403).json({
                        success: false,
                        message: 'Akun ini menggunakan wallet pribadi. Silakan login lewat MetaMask.'
                    });
                }
                const token = jwt.sign(
                    { id: user.id, role: 'user', username: user.username },
                    JWT_SECRET, { expiresIn: '7d' }
                );
                return res.json({
                    success: true,
                    step: 'direct_login',
                    use_shared_wallet: true,
                    token,
                    user: { id: user.id, username: user.username, email: user.email, role: 'user' }
                });
            }

            // ── Wallet Pribadi: MetaMask sign ──
            if (isShared) {
                return res.status(403).json({
                    success: false,
                    message: 'Akun ini menggunakan wallet umum. Silakan login lewat opsi Wallet Umum.'
                });
            }

            const nonce        = crypto.randomBytes(16).toString('hex');
            const nonceMessage = buildNonceMessage('Siswa', nonce);
            const walletLower  = (user.wallet_address || '').toLowerCase();
            userNonces[walletLower] = { message: nonceMessage, userId: user.id };

            const preToken = jwt.sign(
                { id: user.id, type: 'pre_login' },
                JWT_SECRET, { expiresIn: '5m' }
            );

            return res.json({
                success: true,
                step: 'metamask_required',
                use_shared_wallet: false,
                wallet_hint: maskAddress(user.wallet_address),
                pre_token: preToken,
                nonce_message: nonceMessage
            });

        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    });

    // ============================================================
    // GET /api/auth/user/nonce
    // Generate nonce untuk user berdasarkan wallet address
    // ============================================================
    router.get('/user/nonce', async (req, res) => {
        const { address } = req.query;
        if (!address || !isValidEthAddress(address)) {
            return res.status(400).json({ success: false, message: 'Address tidak valid' });
        }
        const nonce = crypto.randomBytes(16).toString('hex');
        const message = buildNonceMessage('Siswa', nonce);
        userNonces[address.toLowerCase()] = { message, userId: null };
        res.json({ success: true, message });
    });

    // ============================================================
    // POST /api/auth/user/verify-metamask
    // Verifikasi signature MetaMask user → keluarkan JWT penuh
    // ============================================================
    router.post('/user/verify-metamask', async (req, res) => {
        const { address, signature, pre_token } = req.body;

        if (!address || !signature || !pre_token) {
            return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        }

        // Verifikasi pre_token
        let decoded;
        try {
            decoded = jwt.verify(pre_token, JWT_SECRET);
            if (decoded.type !== 'pre_login') throw new Error('Token tidak valid');
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Pre-token tidak valid atau sudah kadaluarsa. Silakan login ulang.' });
        }

        const lowerAddress = address.toLowerCase();
        const nonceData = userNonces[lowerAddress];
        if (!nonceData) {
            return res.status(400).json({ success: false, message: 'Nonce tidak ditemukan. Silakan ulangi proses login.' });
        }

        try {
            // Recover address dari signature
            const recoveredAddress = ethers.utils.verifyMessage(nonceData.message, signature);
            if (recoveredAddress.toLowerCase() !== lowerAddress) {
                return res.status(401).json({ success: false, message: 'Tanda tangan MetaMask tidak valid' });
            }

            // Ambil data user dari DB berdasarkan pre_token
            const users = await dbQuery('SELECT * FROM users WHERE id = ?', [decoded.id]);
            if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            const user = users[0];

            // Pastikan address yang di-sign sesuai dengan wallet_address di DB
            if ((user.wallet_address || '').toLowerCase() !== lowerAddress) {
                return res.status(403).json({
                    success: false,
                    message: 'Wallet address tidak sesuai dengan akun ini. Pastikan Anda menggunakan MetaMask yang benar.'
                });
            }

            // Hapus nonce setelah digunakan
            delete userNonces[lowerAddress];

            const token = jwt.sign(
                { id: user.id, role: 'user', username: user.username },
                JWT_SECRET, { expiresIn: '7d' }
            );

            res.json({
                success: true,
                token,
                user: { id: user.id, username: user.username, email: user.email, role: 'user' }
            });

        } catch (err) {
            console.error('User MetaMask verify error:', err);
            res.status(500).json({ success: false, message: 'Gagal memverifikasi tanda tangan' });
        }
    });

    // ============================================================
    // POST /api/auth/admin/login  (Admin langkah 1 — wallet address)
    // Validasi wallet address admin, kembalikan nonce untuk MetaMask sign
    // ============================================================
    router.post('/admin/login', async (req, res) => {
        const { address } = req.body;

        if (!address || !isValidEthAddress(address.trim())) {
            return res.status(400).json({ success: false, message: 'Masukkan alamat wallet Ethereum yang valid (0x...)' });
        }

        const lowerAddress = address.trim().toLowerCase();

        try {
            const results = await dbQuery(
                'SELECT * FROM admins WHERE LOWER(wallet_address) = ?',
                [lowerAddress]
            );
            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'Wallet address ini tidak terdaftar sebagai admin' });
            }
            const admin = results[0];

            // Buat nonce — key disimpan berdasarkan address
            const nonce = crypto.randomBytes(16).toString('hex');
            const nonceMessage = buildNonceMessage('Administrator', nonce);
            adminNonces[lowerAddress] = { message: nonceMessage, adminId: admin.id, wallet: admin.wallet_address };

            res.json({
                success: true,
                admin_username: admin.username,
                nonce_message: nonceMessage
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // ============================================================
    // POST /api/auth/admin/verify-metamask
    // Verifikasi signature MetaMask admin → keluarkan JWT
    // ============================================================
    router.post('/admin/verify-metamask', async (req, res) => {
        const { address, signature } = req.body;
        if (!address || !signature) {
            return res.status(400).json({ success: false, message: 'Data tidak lengkap (address & signature wajib)' });
        }

        const lowerAddress = address.trim().toLowerCase();
        const nonceData = adminNonces[lowerAddress];
        if (!nonceData) {
            return res.status(400).json({ success: false, message: 'Nonce tidak ditemukan. Silakan ulangi proses login.' });
        }

        try {
            // Verifikasi signature
            const recoveredAddress = ethers.utils.verifyMessage(nonceData.message, signature);
            if (recoveredAddress.toLowerCase() !== lowerAddress) {
                return res.status(401).json({ success: false, message: 'Tanda tangan MetaMask tidak valid' });
            }

            const admins = await dbQuery('SELECT * FROM admins WHERE id = ?', [nonceData.adminId]);
            if (admins.length === 0) return res.status(404).json({ success: false, message: 'Admin tidak ditemukan' });
            const admin = admins[0];

            // Hapus nonce setelah digunakan
            delete adminNonces[lowerAddress];

            const token = jwt.sign(
                { id: admin.id, role: 'admin', username: admin.username },
                JWT_SECRET, { expiresIn: '7d' }
            );

            res.json({
                success: true,
                token,
                user: { id: admin.id, username: admin.username, email: admin.email, role: 'admin', wallet_address: admin.wallet_address }
            });

        } catch (err) {
            console.error('Admin MetaMask verify error:', err);
            res.status(500).json({ success: false, message: 'Gagal memverifikasi tanda tangan' });
        }
    });

    // ============================================================
    // GET /api/auth/admin/nonce  (endpoint lama — dipertahankan)
    // ============================================================
    router.get('/admin/nonce', (req, res) => {
        const { address } = req.query;
        if (!address) return res.status(400).json({ success: false, message: 'Address required' });
        const nonce = crypto.randomBytes(16).toString('hex');
        const message = `Welcome to Tajwid Learning Admin Panel!\n\nClick to sign in and accept the Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nNonce: ${nonce}`;
        adminNonces[address.toLowerCase()] = { message, adminId: null, wallet: address };
        res.json({ success: true, message });
    });

    // ============================================================
    // POST /api/auth/admin/login-web3  (endpoint lama — dipertahankan)
    // ============================================================
    router.post('/admin/login-web3', async (req, res) => {
        const { address, signature } = req.body;
        if (!address || !signature) return res.status(400).json({ success: false, message: 'Address and signature required' });

        const lowerAddress = address.toLowerCase();
        const nonceData = adminNonces[lowerAddress];
        if (!nonceData) return res.status(400).json({ success: false, message: 'Nonce not found. Please refresh and try again.' });

        try {
            const recoveredAddress = ethers.utils.verifyMessage(nonceData.message, signature);
            if (recoveredAddress.toLowerCase() !== lowerAddress) {
                return res.status(401).json({ success: false, message: 'Invalid signature' });
            }
            delete adminNonces[lowerAddress];

            const results = await dbQuery('SELECT * FROM admins WHERE LOWER(wallet_address) = ?', [lowerAddress]);
            if (results.length === 0) {
                return res.status(403).json({ success: false, message: `Akses Ditolak: Dompet ${address} tidak terdaftar sebagai Administrator.` });
            }
            const admin = results[0];
            const token = jwt.sign(
                { id: admin.id, role: 'admin', username: admin.username },
                JWT_SECRET, { expiresIn: '7d' }
            );
            res.json({
                success: true, token,
                user: { id: admin.id, username: admin.username, email: admin.email, role: 'admin', wallet_address: admin.wallet_address }
            });
        } catch (err) {
            console.error('Web3 Login Error:', err);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan saat verifikasi signature' });
        }
    });

    return router;
};

// ============================================================
// Helper: sembunyikan sebagian address wallet
// ============================================================
function maskAddress(addr) {
    if (!addr) return '';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}