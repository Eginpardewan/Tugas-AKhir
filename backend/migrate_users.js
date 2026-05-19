const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

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
    
    const queries = [
        "ALTER TABLE users ADD COLUMN nama_lengkap VARCHAR(255) DEFAULT ''",
        "ALTER TABLE users ADD COLUMN no_hp VARCHAR(20) DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN instansi VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN kota VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN foto_profil VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN nomor_peserta VARCHAR(50) UNIQUE DEFAULT NULL"
    ];

    let completed = 0;
    
    queries.forEach((q) => {
        db.query(q, (err) => {
            if (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️ Kolom sudah ada (diabaikan)`);
                } else {
                    console.error("⚠️ Error eksekusi:", err.message);
                }
            } else {
                console.log("✅ Berhasil menambahkan kolom");
            }
            
            completed++;
            if (completed === queries.length) {
                console.log("Selesai migrasi database users.");
                process.exit(0);
            }
        });
    });
});
