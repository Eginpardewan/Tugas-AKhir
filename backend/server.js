const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Buat folder uploads
const uploadDirs = ['uploads', 'uploads/videos', 'uploads/audios', 'uploads/images', 'uploads/docs', 'uploads/payments'];
uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Koneksi MySQL - HARDCODE PASSWORD
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ars1pneg@r@',
    database: 'tajwid_learning'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal koneksi ke MySQL:', err);
        process.exit(1);
    }
    console.log('✅ Terhubung ke MySQL Database');
    
    // Auto-update database: add wallet_address to admins table if not exists
    db.query("ALTER TABLE admins ADD COLUMN wallet_address VARCHAR(255) UNIQUE", (err) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ Kolom wallet_address sudah ada di tabel admins.");
            } else {
                console.error("⚠️ Gagal menambahkan kolom wallet_address:", err.message);
            }
        } else {
            console.log("✅ Berhasil menambahkan kolom wallet_address ke tabel admins.");
        }
    });
});

// Helper query promise
const dbQuery = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

// Routes
app.use('/api/auth', require('./routes/auth')(db, dbQuery));
app.use('/api/admin', require('./routes/admin')(db, dbQuery));
app.use('/api/user', require('./routes/user')(db, dbQuery));
app.use('/api/payment', require('./routes/payment')(db, dbQuery));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});