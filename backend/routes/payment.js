const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi upload bukti bayar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/payments');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

module.exports = (db, dbQuery) => {
    const router = require('express').Router();
    
    const verifyUser = async (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia');
            if (decoded.role !== 'user') {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
            req.userId = decoded.id;
            next();
        } catch (err) {
            res.status(401).json({ success: false, message: 'Invalid token' });
        }
    };
    
    // Upload bukti pembayaran
    router.post('/upload-proof', verifyUser, upload.single('payment_proof'), async (req, res) => {
        const { amount } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Bukti pembayaran wajib diupload' });
        }
        
        const paymentProof = `/uploads/payments/${req.file.filename}`;
        
        try {
            // Cek apakah user sudah lulus ujian sertifikat
            const hasilSertifikat = await dbQuery(
                'SELECT * FROM hasil_sertifikat WHERE user_id = ? AND is_lulus = 1 ORDER BY persentase DESC LIMIT 1',
                [req.userId]
            );
            
            if (hasilSertifikat.length === 0) {
                return res.status(400).json({ success: false, message: 'Anda belum lulus ujian sertifikat' });
            }
            
            // Cek apakah sudah pernah bayar
            const existingPayment = await dbQuery(
                'SELECT * FROM payments WHERE user_id = ? AND status IN ("pending", "verified", "completed")',
                [req.userId]
            );
            
            if (existingPayment.length > 0) {
                return res.status(400).json({ success: false, message: 'Anda sudah melakukan pembayaran sebelumnya' });
            }
            
            const result = await dbQuery(
                `INSERT INTO payments (user_id, amount, status, payment_proof) 
                 VALUES (?, ?, 'pending', ?)`,
                [req.userId, amount || 20000, paymentProof]
            );
            
            res.json({ 
                success: true, 
                message: 'Bukti pembayaran berhasil diupload. Silakan tunggu verifikasi admin.',
                payment_id: result.insertId
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // Cek status pembayaran user
    router.get('/status', verifyUser, async (req, res) => {
        try {
            const payment = await dbQuery(
                `SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
                [req.userId]
            );
            
            res.json({ success: true, data: payment[0] || null });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    return router;
};