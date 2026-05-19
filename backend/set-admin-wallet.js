const mysql = require('mysql2');

// Ambil argumen dari terminal
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('❌ Cara penggunaan: node set-admin-wallet.js "email_admin" "wallet_address"');
    console.error('Contoh: node set-admin-wallet.js "admin@test.com" "0x123..."');
    process.exit(1);
}

const adminEmail = args[0];
const walletAddress = args[1];

// Koneksi ke Database (menggunakan konfigurasi yang sama dengan server.js)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ars1pneg@r@',
    database: 'tajwid_learning'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal koneksi ke database:', err.message);
        process.exit(1);
    }

    console.log(`Mencari admin dengan email: ${adminEmail}...`);

    // Cari admin berdasarkan email
    db.query('SELECT * FROM admins WHERE email = ?', [adminEmail], (err, results) => {
        if (err) {
            console.error('❌ Terjadi kesalahan query:', err.message);
            db.end();
            return;
        }

        if (results.length === 0) {
            console.error('❌ Admin dengan email tersebut tidak ditemukan!');
            db.end();
            return;
        }

        // Update wallet address
        db.query('UPDATE admins SET wallet_address = ? WHERE email = ?', [walletAddress, adminEmail], (err, updateResult) => {
            if (err) {
                console.error('❌ Gagal menyimpan wallet address:', err.message);
            } else {
                console.log(`✅ BERHASIL! Alamat dompet ${walletAddress} telah didaftarkan untuk admin ${adminEmail}.`);
                console.log(`🚀 Silakan coba login kembali melalui halaman admin-login.html`);
            }
            db.end();
        });
    });
});
