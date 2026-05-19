const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

module.exports = (db, dbQuery) => {
    const router = require('express').Router();
    
    // REGISTER
    router.post('/register', upload.single('foto_profil'), async (req, res) => {
        const { username, email, password, nama_lengkap, no_hp, instansi, kota } = req.body;
        
        // Generate nomor peserta: TL-{YYYYMMDD}-{4 Random Digits}
        const dateObj = new Date();
        const year = dateObj.getFullYear().toString();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const nomor_peserta = `TL-${year}${month}${day}-${randomDigits}`;

        let foto_profil = null;
        if (req.file) {
            foto_profil = `/uploads/images/${req.file.filename}`;
        }
        
        try {
            await dbQuery(
                'INSERT INTO users (username, email, password, nama_lengkap, no_hp, instansi, kota, foto_profil, nomor_peserta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [username, email, password, nama_lengkap || '', no_hp || null, instansi || null, kota || null, foto_profil, nomor_peserta]
            );
            res.json({ success: true, message: 'Registrasi berhasil!' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ success: false, message: 'Username, email, atau nomor peserta sudah terdaftar' });
            } else {
                res.status(500).json({ success: false, message: err.message });
            }
        }
    });
    
    // LOGIN
    router.post('/login', async (req, res) => {
        const { email, username, password, role } = req.body;
        const table = role === 'admin' ? 'admins' : 'users';
        
        try {
            let results;
            if (role === 'admin') {
                if (!email) return res.status(400).json({ success: false, message: 'Email dibutuhkan untuk login admin' });
                results = await dbQuery(`SELECT * FROM ${table} WHERE email = ?`, [email]);
            } else {
                if (!username) return res.status(400).json({ success: false, message: 'Username dibutuhkan untuk login' });
                results = await dbQuery(`SELECT * FROM ${table} WHERE username = ?`, [username]);
            }
            
            if (results.length === 0) {
                return res.status(401).json({ success: false, message: role === 'admin' ? 'Email atau password salah' : 'Username atau password salah' });
            }
            
            const user = results[0];
            
            // Langsung bandingkan (plain text)
            if (user.password !== password) {
                return res.status(401).json({ success: false, message: role === 'admin' ? 'Email atau password salah' : 'Username atau password salah' });
            }
            
            const token = jwt.sign(
                { id: user.id, role: role, username: user.username },
                'rahasia',
                { expiresIn: '7d' }
            );
            
            res.json({
                success: true,
                token,
                user: { id: user.id, username: user.username, email: user.email, role: role }
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    // ADMIN WEB3 LOGIN - Get Nonce
    const crypto = require('crypto');
    const ethers = require('ethers');
    
    // In-memory store for nonces (in production, use DB or Redis)
    const nonces = {};

    router.get('/admin/nonce', (req, res) => {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ success: false, message: 'Address required' });
        }
        // Generate random nonce
        const nonce = crypto.randomBytes(16).toString('hex');
        const message = `Welcome to Tajwid Learning Admin Panel!\n\nClick to sign in and accept the Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nNonce: ${nonce}`;
        nonces[address.toLowerCase()] = message;
        
        res.json({ success: true, message });
    });

    // ADMIN WEB3 LOGIN - Verify Signature
    router.post('/admin/login-web3', async (req, res) => {
        const { address, signature } = req.body;
        
        if (!address || !signature) {
            return res.status(400).json({ success: false, message: 'Address and signature required' });
        }
        
        const lowerAddress = address.toLowerCase();
        const expectedMessage = nonces[lowerAddress];
        
        if (!expectedMessage) {
            return res.status(400).json({ success: false, message: 'Nonce not found. Please refresh and try again.' });
        }
        
        try {
            // Verify signature
            const recoveredAddress = ethers.utils.verifyMessage(expectedMessage, signature);
            
            if (recoveredAddress.toLowerCase() !== lowerAddress) {
                return res.status(401).json({ success: false, message: 'Invalid signature' });
            }
            
            // Clear nonce after successful verification
            delete nonces[lowerAddress];
            
            console.log("Verifying address in DB:", lowerAddress);
            
            // Check if address exists in admins table
            const results = await dbQuery('SELECT * FROM admins WHERE LOWER(wallet_address) = ?', [lowerAddress]);
            
            console.log("Query results length:", results.length);
            
            if (results.length === 0) {
                console.log("No matching address found for:", lowerAddress);
                return res.status(403).json({ success: false, message: `Akses Ditolak: Dompet ${address} tidak terdaftar sebagai Administrator.` });
            }
            
            const admin = results[0];
            
            const token = jwt.sign(
                { id: admin.id, role: 'admin', username: admin.username },
                process.env.JWT_SECRET || 'rahasia',
                { expiresIn: '7d' }
            );
            
            res.json({
                success: true,
                token,
                user: { id: admin.id, username: admin.username, email: admin.email, role: 'admin', wallet_address: admin.wallet_address }
            });
            
        } catch (err) {
            console.error('Web3 Login Error:', err);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan saat verifikasi signature' });
        }
    });

    return router;
};