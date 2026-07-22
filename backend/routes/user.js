const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

// Pilihan ganda: bandingkan jawaban huruf
function autoGradePG(jawabanUser, jawabanBenar, poinMaksimal = 10) {
    const benar = (jawabanUser || '').toUpperCase().trim() === (jawabanBenar || '').toUpperCase().trim();
    const nilai = benar ? poinMaksimal : 0;
    const feedback = benar ? 'Jawaban benar! ✅' : `Jawaban salah. Kunci: ${jawabanBenar.toUpperCase()}`;
    return { nilai, benar, feedback };
}

function getRandomSoal(arr, jumlah) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, jumlah);
}

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
    
    // ==================== MATERI ====================
    
    router.get('/babs', verifyUser, async (req, res) => {
        try {
            const babs = await dbQuery('SELECT * FROM babs ORDER BY urutan ASC');
            res.json({ success: true, data: babs });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.get('/materis', verifyUser, async (req, res) => {
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
    
    router.get('/materi/:bab_id', verifyUser, async (req, res) => {
        try {
            const materis = await dbQuery(
                'SELECT * FROM materis WHERE bab_id = ? ORDER BY urutan ASC',
                [req.params.bab_id]
            );
            res.json({ success: true, data: materis });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.get('/materi/detail/:id', verifyUser, async (req, res) => {
        try {
            const materis = await dbQuery(`
                SELECT m.*, b.nama as bab_nama 
                FROM materis m 
                JOIN babs b ON m.bab_id = b.id 
                WHERE m.id = ?
            `, [req.params.id]);
            
            if (materis.length === 0) {
                return res.status(404).json({ success: false, message: 'Materi tidak ditemukan' });
            }
            
            res.json({ success: true, data: materis[0] });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== UJIAN BAB ====================
    
    router.post('/start-bab-exam', verifyUser, async (req, res) => {
        const { bab_id } = req.body;
        
        try {
            const allSoal = await dbQuery(
                'SELECT id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, poin FROM soal_bab WHERE bab_id = ? AND is_active = 1',
                [bab_id]
            );
            
            if (allSoal.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Belum ada soal untuk bab ini. Silakan hubungi admin.' 
                });
            }
            
            const jumlahSoal = Math.min(10, allSoal.length);
            const randomSoal = getRandomSoal(allSoal, jumlahSoal);
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const soalIds = JSON.stringify(randomSoal.map(s => s.id));
            
            const result = await dbQuery(
                `INSERT INTO exam_sessions (user_id, exam_type, bab_id, session_token, soal_ids) 
                 VALUES (?, 'bab', ?, ?, ?)`,
                [req.userId, bab_id, sessionToken, soalIds]
            );
            
            res.json({
                success: true,
                session_id: result.insertId,
                session_token: sessionToken,
                soal: randomSoal.map((s, idx) => ({ 
                    nomor: idx + 1, 
                    id: s.id, 
                    pertanyaan: s.pertanyaan,
                    pilihan: {
                        A: s.pilihan_a,
                        B: s.pilihan_b,
                        C: s.pilihan_c,
                        D: s.pilihan_d,
                        E: s.pilihan_e
                    },
                    poin: s.poin 
                })),
                total_soal: randomSoal.length
            });
        } catch (err) {
            console.error('Error starting bab exam:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.post('/submit-bab-exam', verifyUser, async (req, res) => {
        const { session_id, session_token, jawaban } = req.body;
        
        try {
            const sessions = await dbQuery(
                'SELECT * FROM exam_sessions WHERE id = ? AND session_token = ? AND user_id = ? AND exam_type = "bab" AND completed_at IS NULL',
                [session_id, session_token, req.userId]
            );
            
            if (sessions.length === 0) {
                return res.status(401).json({ success: false, message: 'Session tidak valid atau sudah selesai' });
            }
            
            const session = sessions[0];
            const soalIds = JSON.parse(session.soal_ids);
            const placeholders = soalIds.map(() => '?').join(',');
            const soals = await dbQuery(`SELECT * FROM soal_bab WHERE id IN (${placeholders})`, soalIds);
            
            let totalNilai = 0;
            let totalMaksimal = 0;
            
            for (const jawab of jawaban) {
                const soal = soals.find(s => s.id === jawab.soal_id);
                if (!soal) continue;
                
                const grade = autoGradePG(jawab.jawaban_user, soal.jawaban_benar, soal.poin);
                totalNilai += grade.nilai;
                totalMaksimal += soal.poin;
                
                await dbQuery(
                    `INSERT INTO exam_answers (session_id, soal_id, soal_type, jawaban_user, nilai, feedback) 
                     VALUES (?, ?, 'bab', ?, ?, ?)`,
                    [session_id, jawab.soal_id, jawab.jawaban_user, grade.nilai, grade.feedback]
                );
            }
            
            const persentase = totalMaksimal > 0 ? Math.round((totalNilai / totalMaksimal) * 100) : 0;
            const isLulus = persentase >= 80;
            
            await dbQuery(`UPDATE exam_sessions SET completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [session_id]);
            
            await dbQuery(
                `INSERT INTO nilai_bab (user_id, bab_id, session_id, total_nilai, maksimal_nilai, persentase, is_lulus) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.userId, session.bab_id, session_id, totalNilai, totalMaksimal, persentase, isLulus]
            );
            
            res.json({
                success: true,
                total_nilai: totalNilai,
                total_maksimal: totalMaksimal,
                persentase: persentase,
                is_lulus: isLulus,
                message: isLulus ? '🎉 Selamat! Anda lulus ujian bab ini!' : '📚 Nilai Anda belum mencapai 80. Silakan coba lagi.'
            });
        } catch (err) {
            console.error('Error submitting bab exam:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== PROGRESS USER ====================
    router.get('/progress', verifyUser, async (req, res) => {
        try {
            const allBabs = await dbQuery('SELECT id, nama FROM babs ORDER BY urutan');
            const userNilai = await dbQuery(
                'SELECT bab_id, persentase, is_lulus FROM nilai_bab WHERE user_id = ?',
                [req.userId]
            );
            
            const nilaiMap = {};
            userNilai.forEach(n => {
                nilaiMap[n.bab_id] = { persentase: n.persentase, is_lulus: n.is_lulus };
            });
            
            const babsWithNilai = allBabs.map(bab => ({
                id: bab.id,
                nama: bab.nama,
                nilai: nilaiMap[bab.id]?.persentase || 0,
                is_lulus: nilaiMap[bab.id]?.is_lulus || false
            }));
            
            const totalBab = allBabs.length;
            const babLulus = babsWithNilai.filter(b => b.is_lulus).length;
            const rataRata = totalBab > 0 ? Math.round((babLulus / totalBab) * 100) : 0;
            const isEligibleForCertificate = babLulus === totalBab && totalBab > 0;
            
            res.json({
                success: true,
                data: {
                    babs: babsWithNilai,
                    total_bab: totalBab,
                    bab_lulus: babLulus,
                    rata_rata: rataRata,
                    eligible_for_certificate: isEligibleForCertificate
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== CEK KELAYAKAN SERTIFIKAT ====================
    router.get('/certificate-eligibility', verifyUser, async (req, res) => {
        try {
            const allBabs = await dbQuery('SELECT COUNT(*) as total FROM babs');
            const userNilai = await dbQuery(
                'SELECT COUNT(*) as lulus FROM nilai_bab WHERE user_id = ? AND is_lulus = 1',
                [req.userId]
            );
            
            const isEligible = userNilai[0].lulus === allBabs[0].total && allBabs[0].total > 0;
            const existingExam = await dbQuery(
                'SELECT * FROM hasil_sertifikat WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
                [req.userId]
            );
            
            res.json({
                success: true,
                eligible: isEligible,
                bab_lulus: userNilai[0].lulus,
                total_bab: allBabs[0].total,
                previous_exam: existingExam[0] || null
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== UJIAN SERTIFIKAT ====================
    router.post('/start-certificate-exam', verifyUser, async (req, res) => {
        try {
            const allBabs = await dbQuery('SELECT COUNT(*) as total FROM babs');
            const userNilai = await dbQuery(
                'SELECT COUNT(*) as lulus FROM nilai_bab WHERE user_id = ? AND is_lulus = 1',
                [req.userId]
            );
            
            if (userNilai[0].lulus < allBabs[0].total) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Anda harus menyelesaikan semua ujian bab terlebih dahulu' 
                });
            }
            
            const allSoal = await dbQuery(
                'SELECT id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, poin FROM soal_sertifikat WHERE is_active = 1'
            );
            
            if (allSoal.length < 25) {
                return res.status(404).json({ 
                    success: false, 
                    message: `Soal sertifikat belum mencukupi. Tersedia ${allSoal.length} soal, butuh minimal 25.` 
                });
            }
            
            const randomSoal = getRandomSoal(allSoal, 25);
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const soalIds = JSON.stringify(randomSoal.map(s => s.id));
            
            const result = await dbQuery(
                `INSERT INTO exam_sessions (user_id, exam_type, bab_id, session_token, soal_ids) 
                 VALUES (?, 'sertifikat', NULL, ?, ?)`,
                [req.userId, sessionToken, soalIds]
            );
            
            res.json({
                success: true,
                session_id: result.insertId,
                session_token: sessionToken,
                soal: randomSoal.map((s, idx) => ({ 
                    nomor: idx + 1, 
                    id: s.id, 
                    pertanyaan: s.pertanyaan,
                    pilihan: {
                        A: s.pilihan_a,
                        B: s.pilihan_b,
                        C: s.pilihan_c,
                        D: s.pilihan_d,
                        E: s.pilihan_e
                    },
                    poin: s.poin 
                })),
                total_soal: randomSoal.length
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    router.post('/submit-certificate-exam', verifyUser, async (req, res) => {
        const { session_id, session_token, jawaban } = req.body;
        
        try {
            const sessions = await dbQuery(
                'SELECT * FROM exam_sessions WHERE id = ? AND session_token = ? AND user_id = ? AND exam_type = "sertifikat" AND completed_at IS NULL',
                [session_id, session_token, req.userId]
            );
            
            if (sessions.length === 0) {
                return res.status(401).json({ success: false, message: 'Session tidak valid' });
            }
            
            const session = sessions[0];
            const soalIds = JSON.parse(session.soal_ids);
            const placeholders = soalIds.map(() => '?').join(',');
            const soals = await dbQuery(`SELECT * FROM soal_sertifikat WHERE id IN (${placeholders})`, soalIds);
            
            let totalNilai = 0;
            let totalMaksimal = 0;
            
            for (const jawab of jawaban) {
                const soal = soals.find(s => s.id === jawab.soal_id);
                if (!soal) continue;
                
                const grade = autoGradePG(jawab.jawaban_user, soal.jawaban_benar, soal.poin);
                totalNilai += grade.nilai;
                totalMaksimal += soal.poin;
                
                await dbQuery(
                    `INSERT INTO exam_answers (session_id, soal_id, soal_type, jawaban_user, nilai, feedback) 
                     VALUES (?, ?, 'sertifikat', ?, ?, ?)`,
                    [session_id, jawab.soal_id, jawab.jawaban_user, grade.nilai, grade.feedback]
                );
            }
            
            const persentase = totalMaksimal > 0 ? Math.round((totalNilai / totalMaksimal) * 100) : 0;
            const isLulus = persentase >= 80;
            
            await dbQuery(`UPDATE exam_sessions SET completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [session_id]);
            
            await dbQuery(
                `INSERT INTO hasil_sertifikat (user_id, session_id, total_nilai, maksimal_nilai, persentase, is_lulus) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.userId, session_id, totalNilai, totalMaksimal, persentase, isLulus]
            );
            
            res.json({
                success: true,
                total_nilai: totalNilai,
                total_maksimal: totalMaksimal,
                persentase: persentase,
                is_lulus: isLulus,
                message: isLulus 
                    ? '🎉 SELAMAT! Anda lulus ujian sertifikat! Silakan lakukan pembayaran untuk mendapatkan sertifikat blockchain.' 
                    : '📚 Maaf, Anda belum lulus. Silakan pelajari materi lagi dan coba kembali.'
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== HASIL SERTIFIKAT ====================
    router.get('/certificate-result', verifyUser, async (req, res) => {
        try {
            const result = await dbQuery(
                'SELECT * FROM hasil_sertifikat WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
                [req.userId]
            );
            res.json({ success: true, data: result[0] || null });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== SERTIFIKAT YANG DIMILIKI ====================
    router.get('/my-certificates', verifyUser, async (req, res) => {
        try {
            const certificates = await dbQuery(
                `SELECT c.*, p.amount, p.status as payment_status,
                        u.nama_lengkap, u.nomor_peserta, h.persentase as nilai
                 FROM certificates c 
                 JOIN payments p ON c.payment_id = p.id 
                 JOIN users u ON c.user_id = u.id
                 LEFT JOIN hasil_sertifikat h ON h.user_id = c.user_id AND h.is_lulus = 1
                 WHERE c.user_id = ? 
                 ORDER BY c.issued_at DESC`,
                [req.userId]
            );
            res.json({ success: true, data: certificates });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    // ==================== PROFIL USER ====================
    router.get('/profile', verifyUser, async (req, res) => {
        try {
            const users = await dbQuery(
                'SELECT id, username, email, nama_lengkap, jenis_kelamin, no_hp, instansi, kota, foto_profil, nomor_peserta FROM users WHERE id = ?',
                [req.userId]
            );
            if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            res.json({ success: true, data: users[0] });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    router.put('/profile', verifyUser, upload.single('foto_profil'), async (req, res) => {
        const { nama_lengkap, jenis_kelamin, no_hp, instansi, kota, username, new_password } = req.body;
        
        try {
            // Cek apakah username baru sudah dipakai user lain
            if (username) {
                const existingUser = await dbQuery(
                    'SELECT id FROM users WHERE username = ? AND id != ?',
                    [username, req.userId]
                );
                if (existingUser.length > 0) {
                    return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh akun lain!' });
                }
            }

            let updateQuery = 'UPDATE users SET nama_lengkap = ?, jenis_kelamin = ?, no_hp = ?, instansi = ?, kota = ?, username = ?';
            let params = [nama_lengkap || '', jenis_kelamin || null, no_hp || null, instansi || null, kota || null, username || null];

            // Ganti password jika diisi
            if (new_password && new_password.trim().length >= 6) {
                updateQuery += ', password = ?';
                params.push(new_password.trim());
            }

            if (req.file) {
                updateQuery += ', foto_profil = ?';
                params.push(`/uploads/images/${req.file.filename}`);
            }

            updateQuery += ' WHERE id = ?';
            params.push(req.userId);

            await dbQuery(updateQuery, params);
            res.json({ success: true, message: 'Profil berhasil diperbarui!' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // ==================== BLOCKCHAIN NILAI BAB ====================

    /**
     * POST /api/user/record-bab-blockchain
     * Dipanggil frontend setelah user berhasil kirim transaksi ke blockchain.
     * Menyimpan TX hash ke database agar bisa ditampilkan di profil/progress.
     */
    router.post('/record-bab-blockchain', verifyUser, async (req, res) => {
        const { bab_id, bab_nama, nilai, is_lulus, transaction_hash, wallet_address } = req.body;

        if (!bab_id || !bab_nama || nilai === undefined || !transaction_hash || !wallet_address) {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap: bab_id, bab_nama, nilai, transaction_hash, wallet_address wajib diisi'
            });
        }

        // Validasi format TX hash Ethereum
        if (!/^0x[a-fA-F0-9]{64}$/.test(transaction_hash)) {
            return res.status(400).json({ success: false, message: 'Format transaction_hash tidak valid' });
        }

        try {
            // Cek apakah TX hash sudah pernah tersimpan (mencegah duplikasi)
            const existing = await dbQuery(
                'SELECT id FROM blockchain_bab_results WHERE transaction_hash = ?',
                [transaction_hash]
            );
            if (existing.length > 0) {
                return res.status(409).json({ success: false, message: 'Transaction hash sudah tersimpan sebelumnya' });
            }

            await dbQuery(
                `INSERT INTO blockchain_bab_results 
                 (user_id, bab_id, bab_nama, nilai, is_lulus, transaction_hash, wallet_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [req.userId, bab_id, bab_nama, nilai, is_lulus ? 1 : 0, transaction_hash, wallet_address]
            );

            res.json({
                success: true,
                message: 'Nilai bab berhasil dicatat ke blockchain dan database',
                data: { transaction_hash, bab_nama, nilai, is_lulus }
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * GET /api/user/blockchain-bab-results
     * Ambil semua hasil ujian bab yang sudah dicatat di blockchain milik user ini.
     */
    router.get('/blockchain-bab-results', verifyUser, async (req, res) => {
        try {
            const results = await dbQuery(
                `SELECT bbr.*, b.nama as bab_nama_full
                 FROM blockchain_bab_results bbr
                 LEFT JOIN babs b ON bbr.bab_id = b.id
                 WHERE bbr.user_id = ?
                 ORDER BY bbr.recorded_at DESC`,
                [req.userId]
            );
            res.json({ success: true, data: results });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // Public route to verify certificate by transaction hash or blockchain id or nomor_peserta
    router.get('/public/verify-certificate/:identifier', async (req, res) => {
        const { identifier } = req.params;
        try {
            const certificates = await dbQuery(
                `SELECT c.*, p.amount, p.status as payment_status,
                        u.nama_lengkap, u.nomor_peserta, h.persentase as nilai
                 FROM certificates c
                 JOIN payments p ON c.payment_id = p.id
                 JOIN users u ON c.user_id = u.id
                 LEFT JOIN hasil_sertifikat h ON h.user_id = c.user_id AND h.is_lulus = 1
                 WHERE c.transaction_hash = ? OR c.blockchain_id = ? OR u.nomor_peserta = ?
                 ORDER BY c.issued_at DESC`,
                [identifier, identifier, identifier]
            );
            
            if (certificates.length === 0) {
                return res.status(404).json({ success: false, message: 'Sertifikat tidak ditemukan atau belum terdaftar di blockchain' });
            }
            
            res.json({ success: true, data: certificates[0] });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    return router;
};