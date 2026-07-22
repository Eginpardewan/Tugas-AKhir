const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'docs';
        if (file.fieldname === 'video') folder = 'videos';
        else if (file.fieldname === 'audio') folder = 'audios';
        else if (file.fieldname === 'gambar') folder = 'images';
        
        const uploadPath = path.join(__dirname, '../uploads', folder);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

module.exports = (db, dbQuery) => {
    const router = require('express').Router();
    
    // Middleware verify admin
    const verifyAdmin = async (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia');
            if (decoded.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
            req.adminId = decoded.id;
            next();
        } catch (err) {
            res.status(401).json({ success: false, message: 'Invalid token' });
        }
    };
    
    // ==================== BAB ====================
    router.get('/babs', verifyAdmin, async (req, res) => {
        try {
            const babs = await dbQuery('SELECT * FROM babs ORDER BY urutan ASC');
            res.json({ success: true, data: babs });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ✅ UPDATE URUTAN BAB - HARUS DIATAS ROUTE /:id
    router.put('/bab/update-order', verifyAdmin, async (req, res) => {
        const { orders } = req.body;
        
        console.log('Received update-order request:', orders);
        
        if (!orders || !Array.isArray(orders)) {
            return res.status(400).json({ success: false, message: 'Invalid orders data' });
        }
        
        try {
            for (const item of orders) {
                // item.urutan adalah index 0-based (0,1,2...), simpan sebagai 1,2,3...
                const newUrutan = item.urutan + 1;
                await dbQuery('UPDATE babs SET urutan = ? WHERE id = ?', [newUrutan, item.id]);
            }
            res.json({ success: true, message: 'Urutan bab berhasil diupdate' });
        } catch (err) {
            console.error('Error updating order:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.post('/bab', verifyAdmin, async (req, res) => {
        const { nama, deskripsi, urutan } = req.body;
        try {
            let newUrutan = urutan;
            if (!newUrutan || newUrutan === 0) {
                const lastBab = await dbQuery('SELECT MAX(urutan) as maxUrutan FROM babs');
                newUrutan = (lastBab[0].maxUrutan || 0) + 1;
            }
            const result = await dbQuery(
                'INSERT INTO babs (nama, deskripsi, urutan) VALUES (?, ?, ?)',
                [nama, deskripsi, newUrutan]
            );
            res.json({ success: true, id: result.insertId });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.put('/bab/:id', verifyAdmin, async (req, res) => {
        const { nama, deskripsi, urutan } = req.body;
        try {
            await dbQuery(
                'UPDATE babs SET nama = ?, deskripsi = ?, urutan = ? WHERE id = ?',
                [nama, deskripsi, urutan, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.delete('/bab/:id', verifyAdmin, async (req, res) => {
        try {
            await dbQuery('DELETE FROM materis WHERE bab_id = ?', [req.params.id]);
            await dbQuery('DELETE FROM soal_bab WHERE bab_id = ?', [req.params.id]);
            await dbQuery('DELETE FROM babs WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== MATERI ====================
    router.get('/materis', verifyAdmin, async (req, res) => {
        try {
            const materis = await dbQuery(`
                SELECT m.*, b.nama as bab_nama 
                FROM materis m 
                JOIN babs b ON m.bab_id = b.id 
                ORDER BY b.urutan, m.urutan
            `);
            res.json({ success: true, data: materis });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.post('/materi', verifyAdmin, upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
        { name: 'gambar', maxCount: 1 },
        { name: 'pdf', maxCount: 1 }
    ]), async (req, res) => {
        console.log('=== MATERI UPLOAD ===');
        console.log('Body:', req.body);
        console.log('Files:', req.files);
        
        const { bab_id, judul, deskripsi, konten, urutan } = req.body;
        const files = req.files;
        
        if (!bab_id) {
            console.log('ERROR: bab_id is missing');
            return res.status(400).json({ success: false, message: 'bab_id is required' });
        }
        
        const fileVideo = files?.video?.[0]?.filename ? `/uploads/videos/${files.video[0].filename}` : null;
        const fileAudio = files?.audio?.[0]?.filename ? `/uploads/audios/${files.audio[0].filename}` : null;
        const fileGambar = files?.gambar?.[0]?.filename ? `/uploads/images/${files.gambar[0].filename}` : null;
        const filePdf = files?.pdf?.[0]?.filename ? `/uploads/docs/${files.pdf[0].filename}` : null;
        
        console.log('Processed files:', { fileVideo, fileAudio, fileGambar, filePdf });
        
        try {
            const sql = `INSERT INTO materis (bab_id, judul, deskripsi, konten, file_video, file_audio, file_gambar, file_pdf, urutan) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [bab_id, judul, deskripsi, konten, fileVideo, fileAudio, fileGambar, filePdf, urutan || 0];
            
            console.log('SQL:', sql);
            console.log('Params:', params);
            
            const result = await dbQuery(sql, params);
            console.log('Insert result:', result);
            
            res.json({ success: true, id: result.insertId });
        } catch (err) {
            console.error('Database error:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.put('/materi/:id', verifyAdmin, upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
        { name: 'gambar', maxCount: 1 },
        { name: 'pdf', maxCount: 1 }
    ]), async (req, res) => {
        console.log('PUT /materi/:id received body:', req.body);
        const { judul, deskripsi, konten, urutan, remove_video, remove_audio, remove_gambar } = req.body;
        const files = req.files;
        const materiId = req.params.id;
        
        try {
            const oldMateri = await dbQuery('SELECT * FROM materis WHERE id = ?', [materiId]);
            if (oldMateri.length === 0) {
                return res.status(404).json({ success: false, message: 'Materi tidak ditemukan' });
            }
            
            let fileVideo = oldMateri[0].file_video;
            let fileAudio = oldMateri[0].file_audio;
            let fileGambar = oldMateri[0].file_gambar;
            let filePdf = oldMateri[0].file_pdf;
            
            // Handle removal flags
            if (remove_video === 'true' && fileVideo) {
                const oldPath = path.join(__dirname, '..', fileVideo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                fileVideo = null;
            }
            if (remove_audio === 'true' && fileAudio) {
                const oldPath = path.join(__dirname, '..', fileAudio);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                fileAudio = null;
            }
            if (remove_gambar === 'true' && fileGambar) {
                const oldPath = path.join(__dirname, '..', fileGambar);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                fileGambar = null;
            }

            if (files?.video?.[0]?.filename) {
                fileVideo = `/uploads/videos/${files.video[0].filename}`;
                if (oldMateri[0].file_video && oldMateri[0].file_video !== fileVideo) {
                    const oldPath = path.join(__dirname, '..', oldMateri[0].file_video);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }
            if (files?.audio?.[0]?.filename) {
                fileAudio = `/uploads/audios/${files.audio[0].filename}`;
                if (oldMateri[0].file_audio && oldMateri[0].file_audio !== fileAudio) {
                    const oldPath = path.join(__dirname, '..', oldMateri[0].file_audio);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }
            if (files?.gambar?.[0]?.filename) {
                fileGambar = `/uploads/images/${files.gambar[0].filename}`;
                if (oldMateri[0].file_gambar && oldMateri[0].file_gambar !== fileGambar) {
                    const oldPath = path.join(__dirname, '..', oldMateri[0].file_gambar);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }
            if (files?.pdf?.[0]?.filename) {
                filePdf = `/uploads/docs/${files.pdf[0].filename}`;
                if (oldMateri[0].file_pdf && oldMateri[0].file_pdf !== filePdf) {
                    const oldPath = path.join(__dirname, '..', oldMateri[0].file_pdf);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }
            
            await dbQuery(
                `UPDATE materis SET 
                    judul = ?, deskripsi = ?, konten = ?, 
                    file_video = ?, file_audio = ?, file_gambar = ?, file_pdf = ?, 
                    urutan = ? 
                 WHERE id = ?`,
                [judul, deskripsi, konten, fileVideo, fileAudio, fileGambar, filePdf, urutan || 0, materiId]
            );
            
            res.json({ success: true });
        } catch (err) {
            console.error('Error updating materi:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.delete('/materi/:id', verifyAdmin, async (req, res) => {
        try {
            const materi = await dbQuery('SELECT file_video, file_audio, file_gambar, file_pdf FROM materis WHERE id = ?', [req.params.id]);
            if (materi.length > 0) {
                const files = materi[0];
                if (files.file_video) {
                    const filePath = path.join(__dirname, '..', files.file_video);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                if (files.file_audio) {
                    const filePath = path.join(__dirname, '..', files.file_audio);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                if (files.file_gambar) {
                    const filePath = path.join(__dirname, '..', files.file_gambar);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                if (files.file_pdf) {
                    const filePath = path.join(__dirname, '..', files.file_pdf);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            }
            await dbQuery('DELETE FROM materis WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== SOAL PER BAB ====================
    router.get('/soal-bab', verifyAdmin, async (req, res) => {
        try {
            const soals = await dbQuery(`
                SELECT s.*, b.nama as bab_nama 
                FROM soal_bab s 
                JOIN babs b ON s.bab_id = b.id 
                ORDER BY b.urutan, s.id
            `);
            res.json({ success: true, data: soals });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.post('/soal-bab', verifyAdmin, async (req, res) => {
        const { bab_id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, poin } = req.body;
        try {
            await dbQuery(
                `INSERT INTO soal_bab (bab_id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, poin) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [bab_id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar.toUpperCase(), poin || 10]
            );
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.put('/soal-bab/:id', verifyAdmin, async (req, res) => {
        const { pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, poin, is_active } = req.body;
        try {
            await dbQuery(
                `UPDATE soal_bab SET pertanyaan = ?, pilihan_a = ?, pilihan_b = ?, pilihan_c = ?, pilihan_d = ?, pilihan_e = ?, jawaban_benar = ?, poin = ?, is_active = ? WHERE id = ?`,
                [pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar.toUpperCase(), poin, is_active, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.delete('/soal-bab/:id', verifyAdmin, async (req, res) => {
        try {
            await dbQuery('DELETE FROM soal_bab WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== SOAL SERTIFIKAT ====================
    router.get('/soal-sertifikat', verifyAdmin, async (req, res) => {
        try {
            const soals = await dbQuery('SELECT * FROM soal_sertifikat ORDER BY id');
            res.json({ success: true, data: soals });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.post('/soal-sertifikat', verifyAdmin, async (req, res) => {
        const { pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, poin } = req.body;
        try {
            await dbQuery(
                `INSERT INTO soal_sertifikat (pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, poin) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar.toUpperCase(), poin || 10]
            );
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.put('/soal-sertifikat/:id', verifyAdmin, async (req, res) => {
        const { pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, poin, is_active } = req.body;
        try {
            await dbQuery(
                `UPDATE soal_sertifikat SET pertanyaan = ?, pilihan_a = ?, pilihan_b = ?, pilihan_c = ?, pilihan_d = ?, pilihan_e = ?, jawaban_benar = ?, poin = ?, is_active = ? WHERE id = ?`,
                [pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar.toUpperCase(), poin, is_active, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.delete('/soal-sertifikat/:id', verifyAdmin, async (req, res) => {
        try {
            await dbQuery('DELETE FROM soal_sertifikat WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== USER ====================
    router.get('/users', verifyAdmin, async (req, res) => {
        try {
            const users = await dbQuery(`
                SELECT id, username, email, nama_lengkap, jenis_kelamin, no_hp, instansi, kota, 
                       foto_profil, nomor_peserta, created_at
                FROM users ORDER BY created_at DESC
            `);
            res.json({ success: true, data: users });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    router.get('/users/:id', verifyAdmin, async (req, res) => {
        try {
            const users = await dbQuery(`
                SELECT u.id, u.username, u.email, u.nama_lengkap, u.jenis_kelamin, u.no_hp, 
                       u.instansi, u.kota, u.foto_profil, u.nomor_peserta, u.created_at,
                       COUNT(DISTINCT nb.bab_id) as bab_lulus,
                       (SELECT persentase FROM hasil_sertifikat WHERE user_id = u.id AND is_lulus = 1 ORDER BY completed_at DESC LIMIT 1) as nilai_sertifikat,
                       (SELECT completed_at FROM hasil_sertifikat WHERE user_id = u.id AND is_lulus = 1 ORDER BY completed_at DESC LIMIT 1) as tanggal_lulus,
                       (SELECT COUNT(*) FROM certificates WHERE user_id = u.id) as total_sertifikat
                FROM users u
                LEFT JOIN nilai_bab nb ON nb.user_id = u.id AND nb.is_lulus = 1
                WHERE u.id = ?
                GROUP BY u.id
            `, [req.params.id]);
            if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            res.json({ success: true, data: users[0] });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== STATISTIK ====================
    router.get('/stats', verifyAdmin, async (req, res) => {
        try {
            const [totalUsers] = await dbQuery('SELECT COUNT(*) as total FROM users');
            const [totalBabs] = await dbQuery('SELECT COUNT(*) as total FROM babs');
            const [totalMateris] = await dbQuery('SELECT COUNT(*) as total FROM materis');
            const [totalSoalBab] = await dbQuery('SELECT COUNT(*) as total FROM soal_bab WHERE is_active = 1');
            const [totalSoalSertifikat] = await dbQuery('SELECT COUNT(*) as total FROM soal_sertifikat WHERE is_active = 1');
            const [pendingPayments] = await dbQuery('SELECT COUNT(*) as total FROM payments WHERE status = "pending"');
            const [totalCertificates] = await dbQuery('SELECT COUNT(*) as total FROM certificates');
            
            res.json({
                success: true,
                data: {
                    totalUsers: totalUsers.total,
                    totalBabs: totalBabs.total,
                    totalMateris: totalMateris.total,
                    totalSoalBab: totalSoalBab.total,
                    totalSoalSertifikat: totalSoalSertifikat.total,
                    pendingPayments: pendingPayments.total,
                    totalCertificates: totalCertificates.total
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== PEMBAYARAN ====================
    router.get('/payments', verifyAdmin, async (req, res) => {
        try {
            const payments = await dbQuery(`
                SELECT p.*, u.username, u.email 
                FROM payments p 
                JOIN users u ON p.user_id = u.id 
                ORDER BY p.created_at DESC
            `);
            res.json({ success: true, data: payments });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.put('/verify-payment/:id', verifyAdmin, async (req, res) => {
        try {
            await dbQuery(
                'UPDATE payments SET status = "verified", verified_by = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?',
                [req.adminId, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== SERTIFIKAT BLOCKCHAIN ====================
    router.get('/certificates', verifyAdmin, async (req, res) => {
        try {
            const certificates = await dbQuery(`
                SELECT c.*, u.username, u.email 
                FROM certificates c 
                JOIN users u ON c.user_id = u.id 
                ORDER BY c.issued_at DESC
            `);
            res.json({ success: true, data: certificates });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // Helper function to upload JSON metadata to Pinata IPFS
    const pinJSONToIPFS = async (content, name) => {
        const jwt = process.env.PINATA_JWT;
        if (!jwt) {
            console.warn("⚠️ PINATA_JWT tidak ditemukan di .env, menggunakan mock IPFS hash");
            return null;
        }
        
        try {
            const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${jwt}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    pinataContent: content,
                    pinataMetadata: { name: name }
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return `ipfs://${data.IpfsHash}`;
            } else {
                const errText = await response.text();
                console.error("❌ Pinata API Error:", errText);
                return null;
            }
        } catch (error) {
            console.error("❌ Pinata Fetch Error:", error);
            return null;
        }
    };

    // Endpoint to compile and upload certificate metadata to IPFS
    router.post('/upload-ipfs', verifyAdmin, async (req, res) => {
        const { user_id, payment_id } = req.body;
        
        try {
            // 1. Fetch user data
            const users = await dbQuery('SELECT id, username, nama_lengkap, nomor_peserta FROM users WHERE id = ?', [user_id]);
            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            }
            const user = users[0];
            
            // 2. Fetch exam details
            const exams = await dbQuery(
                'SELECT persentase, completed_at FROM hasil_sertifikat WHERE user_id = ? AND is_lulus = 1 ORDER BY completed_at DESC LIMIT 1',
                [user_id]
            );
            const exam = exams[0] || null;
            
            // 3. Construct ERC721 metadata
            const metadata = {
                name: `Sertifikat Kelulusan - ${user.nama_lengkap || user.username}`,
                description: `Sertifikat Kelulusan Resmi Tajwid Learning - Al Firqoh An-Najiyah`,
                image: "ipfs://QmYwAPJzv5CZ11A9cu3tF98rGaM9C4L8B8QFaX6m8jEw1U", // default certificate badge icon
                attributes: [
                    { trait_type: "Nama Lengkap", value: user.nama_lengkap || user.username },
                    { trait_type: "Nomor Peserta", value: user.nomor_peserta || "Masa Tunggu" },
                    { trait_type: "Nilai Ujian", value: exam ? `${exam.persentase}%` : "80%" },
                    { trait_type: "Tanggal Kelulusan", value: new Date(exam ? exam.completed_at : Date.now()).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) }
                ]
            };
            
            // 4. Pin to IPFS
            const pinataName = `sertifikat-user-${user_id}-${payment_id}`;
            let ipfsHash = await pinJSONToIPFS(metadata, pinataName);
            
            // Fallback to mock hash if Pinata is not configured
            if (!ipfsHash) {
                const crypto = require('crypto');
                const contentHash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
                ipfsHash = `ipfs://QmMock${contentHash.substring(0, 36)}`;
                console.log(`[IPFS Fallback] Generated mock CID: ${ipfsHash}`);
            }
            
            res.json({ success: true, ipfsHash, metadata });
        } catch (err) {
            console.error('Error uploading to IPFS:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });

    router.post('/issue-certificate', verifyAdmin, async (req, res) => {
        const { user_id, payment_id, transaction_hash, blockchain_id, ipfs_hash } = req.body;
        try {
            await dbQuery(
                `INSERT INTO certificates (user_id, payment_id, transaction_hash, blockchain_id, certificate_hash, issued_by) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [user_id, payment_id, transaction_hash, blockchain_id, ipfs_hash, req.adminId]
            );
            await dbQuery('UPDATE payments SET status = "completed" WHERE id = ?', [payment_id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    return router;
};