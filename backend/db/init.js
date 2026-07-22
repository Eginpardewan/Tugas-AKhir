// =====================================================
// db/init.js — Inisialisasi Database SQLite
// Membuat semua tabel dan data awal secara otomatis
// =====================================================

module.exports = (db) => {
    // Aktifkan foreign keys di SQLite
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // =====================================================
    // 1. TABEL USERS
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            username          TEXT NOT NULL UNIQUE,
            email             TEXT NOT NULL UNIQUE,
            password          TEXT DEFAULT NULL,
            nama_lengkap      TEXT DEFAULT '',
            jenis_kelamin     TEXT CHECK(jenis_kelamin IN ('Laki-laki','Perempuan')) DEFAULT NULL,
            no_hp             TEXT DEFAULT NULL,
            instansi          TEXT DEFAULT NULL,
            kota              TEXT DEFAULT NULL,
            foto_profil       TEXT DEFAULT NULL,
            nomor_peserta     TEXT UNIQUE DEFAULT NULL,
            wallet_address    TEXT DEFAULT NULL,
            use_shared_wallet INTEGER DEFAULT 0,
            created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login        DATETIME NULL
        )
    `);

    // Migrasi: tambah kolom wallet jika belum ada (untuk database yang sudah berjalan)
    try { db.exec(`ALTER TABLE users ADD COLUMN wallet_address TEXT DEFAULT NULL`); } catch(e) { /* kolom sudah ada */ }
    try { db.exec(`ALTER TABLE users ADD COLUMN use_shared_wallet INTEGER DEFAULT 0`); } catch(e) { /* kolom sudah ada */ }

    // =====================================================
    // MIGRASI: Hapus constraint NOT NULL pada kolom password
    // SQLite tidak support ALTER COLUMN, jadi perlu recreate tabel
    // =====================================================
    try {
        const cols = db.prepare(`PRAGMA table_info(users)`).all();
        const pwdCol = cols.find(c => c.name === 'password');
        // notnull = 1 artinya masih ada constraint NOT NULL
        if (pwdCol && pwdCol.notnull === 1) {
            console.log('⚙️  Migrasi: menghapus NOT NULL constraint pada kolom password...');
            db.pragma('foreign_keys = OFF');
            db.exec(`
                CREATE TABLE IF NOT EXISTS users_migration_temp (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    username          TEXT NOT NULL UNIQUE,
                    email             TEXT NOT NULL UNIQUE,
                    password          TEXT DEFAULT NULL,
                    nama_lengkap      TEXT DEFAULT '',
                    jenis_kelamin     TEXT CHECK(jenis_kelamin IN ('Laki-laki','Perempuan')) DEFAULT NULL,
                    no_hp             TEXT DEFAULT NULL,
                    instansi          TEXT DEFAULT NULL,
                    kota              TEXT DEFAULT NULL,
                    foto_profil       TEXT DEFAULT NULL,
                    nomor_peserta     TEXT UNIQUE DEFAULT NULL,
                    wallet_address    TEXT DEFAULT NULL,
                    use_shared_wallet INTEGER DEFAULT 0,
                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login        DATETIME NULL
                );
                INSERT INTO users_migration_temp
                    SELECT id, username, email, password, nama_lengkap, jenis_kelamin,
                           no_hp, instansi, kota, foto_profil, nomor_peserta,
                           wallet_address, use_shared_wallet, created_at, updated_at, last_login
                    FROM users;
                DROP TABLE users;
                ALTER TABLE users_migration_temp RENAME TO users;
            `);
            db.pragma('foreign_keys = ON');
            console.log('✅ Migrasi password NOT NULL selesai');
        }
    } catch(e) {
        console.warn('⚠️  Migrasi password skip:', e.message);
    }

    // =====================================================
    // 2. TABEL ADMINS
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            username       TEXT NOT NULL UNIQUE,
            email          TEXT NOT NULL UNIQUE,
            password       TEXT NOT NULL,
            wallet_address TEXT UNIQUE,
            nama_lengkap   TEXT,
            jabatan        TEXT,
            created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login     DATETIME NULL
        )
    `);

    // =====================================================
    // 3. TABEL BABS
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS babs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nama       TEXT NOT NULL,
            deskripsi  TEXT,
            urutan     INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // =====================================================
    // 4. TABEL MATERIS
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS materis (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            bab_id      INTEGER NOT NULL,
            judul       TEXT NOT NULL,
            deskripsi   TEXT,
            konten      TEXT NOT NULL,
            file_video  TEXT,
            file_audio  TEXT,
            file_gambar TEXT,
            file_pdf    TEXT,
            urutan      INTEGER DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bab_id) REFERENCES babs(id) ON DELETE CASCADE
        )
    `);

    // =====================================================
    // 5. TABEL SOAL_BAB (Pilihan Ganda A-E)
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS soal_bab (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            bab_id        INTEGER NOT NULL,
            pertanyaan    TEXT NOT NULL,
            pilihan_a     TEXT NOT NULL DEFAULT '',
            pilihan_b     TEXT NOT NULL DEFAULT '',
            pilihan_c     TEXT NOT NULL DEFAULT '',
            pilihan_d     TEXT NOT NULL DEFAULT '',
            pilihan_e     TEXT NOT NULL DEFAULT '',
            jawaban_benar TEXT NOT NULL,
            poin          INTEGER DEFAULT 10,
            is_active     INTEGER DEFAULT 1,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bab_id) REFERENCES babs(id) ON DELETE CASCADE
        )
    `);
    // Migrasi: tambah kolom pilihan jika belum ada
    ['pilihan_a','pilihan_b','pilihan_c','pilihan_d','pilihan_e'].forEach(col => {
        try { db.exec(`ALTER TABLE soal_bab ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch(e) {}
    });

    // =====================================================
    // 6. TABEL SOAL_SERTIFIKAT (Pilihan Ganda A-E)
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS soal_sertifikat (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            pertanyaan    TEXT NOT NULL,
            pilihan_a     TEXT NOT NULL DEFAULT '',
            pilihan_b     TEXT NOT NULL DEFAULT '',
            pilihan_c     TEXT NOT NULL DEFAULT '',
            pilihan_d     TEXT NOT NULL DEFAULT '',
            pilihan_e     TEXT NOT NULL DEFAULT '',
            jawaban_benar TEXT NOT NULL,
            poin          INTEGER DEFAULT 10,
            is_active     INTEGER DEFAULT 1,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    // Migrasi: tambah kolom pilihan jika belum ada
    ['pilihan_a','pilihan_b','pilihan_c','pilihan_d','pilihan_e'].forEach(col => {
        try { db.exec(`ALTER TABLE soal_sertifikat ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch(e) {}
    });

    // =====================================================
    // 7. TABEL EXAM_SESSIONS
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS exam_sessions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            exam_type     TEXT CHECK(exam_type IN ('bab','sertifikat')) NOT NULL,
            bab_id        INTEGER NULL,
            session_token TEXT NOT NULL,
            soal_ids      TEXT NOT NULL,
            started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at  DATETIME NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // =====================================================
    // 8. TABEL EXAM_ANSWERS
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS exam_answers (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id   INTEGER NOT NULL,
            soal_id      INTEGER NOT NULL,
            soal_type    TEXT CHECK(soal_type IN ('bab','sertifikat')) NOT NULL,
            jawaban_user TEXT NOT NULL,
            nilai        INTEGER DEFAULT 0,
            feedback     TEXT,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
        )
    `);

    // =====================================================
    // 9. TABEL NILAI_BAB
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS nilai_bab (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER NOT NULL,
            bab_id         INTEGER NOT NULL,
            session_id     INTEGER NOT NULL,
            total_nilai    INTEGER DEFAULT 0,
            maksimal_nilai INTEGER DEFAULT 0,
            persentase     INTEGER DEFAULT 0,
            is_lulus       INTEGER DEFAULT 0,
            completed_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (bab_id)     REFERENCES babs(id)  ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
        )
    `);

    // =====================================================
    // 10. TABEL HASIL_SERTIFIKAT
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS hasil_sertifikat (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER NOT NULL,
            session_id     INTEGER NOT NULL,
            total_nilai    INTEGER DEFAULT 0,
            maksimal_nilai INTEGER DEFAULT 0,
            persentase     INTEGER DEFAULT 0,
            is_lulus       INTEGER DEFAULT 0,
            completed_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
        )
    `);

    // =====================================================
    // 11. TABEL PAYMENTS
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            amount        INTEGER DEFAULT 20000,
            status        TEXT CHECK(status IN ('pending','verified','completed','failed')) DEFAULT 'pending',
            payment_proof TEXT,
            verified_by   INTEGER,
            verified_at   DATETIME NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)     REFERENCES users(id)   ON DELETE CASCADE,
            FOREIGN KEY (verified_by) REFERENCES admins(id)
        )
    `);

    // =====================================================
    // 12. TABEL CERTIFICATES
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS certificates (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER NOT NULL,
            payment_id       INTEGER NOT NULL,
            transaction_hash TEXT NOT NULL,
            certificate_hash TEXT,
            blockchain_id    INTEGER,
            ipfs_cid         TEXT,
            issued_by        INTEGER NOT NULL,
            issued_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
            sertifikat_text  TEXT,
            FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
            FOREIGN KEY (payment_id) REFERENCES payments(id),
            FOREIGN KEY (issued_by)  REFERENCES admins(id)
        )
    `);

    // =====================================================
    // 13. TABEL BLOCKCHAIN_BAB_RESULTS
    // Menyimpan TX hash setelah user mencatat nilai bab ke blockchain
    // =====================================================
    db.exec(`
        CREATE TABLE IF NOT EXISTS blockchain_bab_results (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER NOT NULL,
            bab_id           INTEGER NOT NULL,
            bab_nama         TEXT NOT NULL,
            nilai            INTEGER NOT NULL,
            is_lulus         INTEGER DEFAULT 0,
            transaction_hash TEXT NOT NULL,
            wallet_address   TEXT NOT NULL,
            recorded_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (bab_id)  REFERENCES babs(id)  ON DELETE CASCADE
        )
    `);

    // =====================================================
    // DATA AWAL — hanya insert jika tabel kosong
    // =====================================================

    // Insert Admin awal
    const adminExists = db.prepare('SELECT COUNT(*) as c FROM admins').get();
    if (adminExists.c === 0) {
        db.prepare(`
            INSERT INTO admins (username, email, password, wallet_address, nama_lengkap, jabatan)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            'admin',
            'admin@tajwid.com',
            'admin123',
            '0x5525598B4e3B70530c3acA29f1565dD5BD5344F5',
            'Administrator',
            'Ketua Yayasan'
        );
        console.log('✅ Data admin awal berhasil dibuat');
    }

    // Insert Bab awal
    const babExists = db.prepare('SELECT COUNT(*) as c FROM babs').get();
    if (babExists.c === 0) {
        const insertBab = db.prepare('INSERT INTO babs (nama, deskripsi, urutan) VALUES (?, ?, ?)');
        const insertMany = db.transaction((babs) => {
            for (const b of babs) insertBab.run(b.nama, b.deskripsi, b.urutan);
        });
        insertMany([
            { nama: 'Pengenalan Ilmu Tajwid',      deskripsi: 'Materi dasar tentang pengertian dan pentingnya ilmu tajwid', urutan: 1 },
            { nama: 'Hukum Nun Mati dan Tanwin',   deskripsi: 'Materi tentang hukum izhar, idgham, iqlab, dan ikhfa', urutan: 2 },
            { nama: 'Hukum Mim Mati',              deskripsi: 'Materi tentang izhar syafawi, idgham mimi, dan ikhfa syafawi', urutan: 3 },
            { nama: 'Mad dan Cabangnya',            deskripsi: 'Materi tentang mad asli, mad fari, dan pembagiannya', urutan: 4 },
        ]);
        console.log('✅ Data bab awal berhasil dibuat');
    }

    console.log('✅ Database SQLite siap digunakan');
};
