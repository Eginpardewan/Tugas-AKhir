-- =====================================================
-- DATABASE TAJWID LEARNING (LENGKAP & UPDATED)
-- Versi: 2.0 - Fixed & Compatible dengan Backend
-- =====================================================

-- Hapus database lama jika ada
DROP DATABASE IF EXISTS tajwid_learning;

-- Buat database baru
CREATE DATABASE tajwid_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tajwid_learning;

-- =====================================================
-- 1. TABEL USER (Siswa)
--    PERBAIKAN: nomor_hp -> no_hp, tambah nomor_peserta
-- =====================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(255) DEFAULT '',
    no_hp VARCHAR(20) DEFAULT NULL,
    instansi VARCHAR(255) DEFAULT NULL,
    kota VARCHAR(100) DEFAULT NULL,
    foto_profil VARCHAR(500) DEFAULT NULL,
    nomor_peserta VARCHAR(50) UNIQUE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- =====================================================
-- 2. TABEL ADMIN
-- =====================================================
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(255),
    jabatan VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- =====================================================
-- 3. TABEL BAB
-- =====================================================
CREATE TABLE babs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    urutan INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. TABEL MATERI
-- =====================================================
CREATE TABLE materis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bab_id INT NOT NULL,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    konten TEXT NOT NULL,
    file_video VARCHAR(500),
    file_audio VARCHAR(500),
    file_gambar VARCHAR(500),
    file_pdf VARCHAR(500),
    urutan INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bab_id) REFERENCES babs(id) ON DELETE CASCADE
);

-- =====================================================
-- 5. TABEL SOAL PER BAB (Essay)
-- =====================================================
CREATE TABLE soal_bab (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bab_id INT NOT NULL,
    pertanyaan TEXT NOT NULL,
    jawaban_benar TEXT NOT NULL,
    kata_kunci TEXT,
    poin INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bab_id) REFERENCES babs(id) ON DELETE CASCADE
);

-- =====================================================
-- 6. TABEL SOAL SERTIFIKAT
-- =====================================================
CREATE TABLE soal_sertifikat (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pertanyaan TEXT NOT NULL,
    jawaban_benar TEXT NOT NULL,
    kata_kunci TEXT,
    poin INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. TABEL SESSION UJIAN
-- =====================================================
CREATE TABLE exam_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exam_type ENUM('bab', 'sertifikat') NOT NULL,
    bab_id INT NULL,
    session_token VARCHAR(255) NOT NULL,
    soal_ids TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- 8. TABEL JAWABAN UJIAN
-- =====================================================
CREATE TABLE exam_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    soal_id INT NOT NULL,
    soal_type ENUM('bab', 'sertifikat') NOT NULL,
    jawaban_user TEXT NOT NULL,
    nilai INT DEFAULT 0,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
);

-- =====================================================
-- 9. TABEL NILAI BAB
-- =====================================================
CREATE TABLE nilai_bab (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    bab_id INT NOT NULL,
    session_id INT NOT NULL,
    total_nilai INT DEFAULT 0,
    maksimal_nilai INT DEFAULT 0,
    persentase INT DEFAULT 0,
    is_lulus BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bab_id) REFERENCES babs(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
);

-- =====================================================
-- 10. TABEL HASIL SERTIFIKAT
-- =====================================================
CREATE TABLE hasil_sertifikat (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id INT NOT NULL,
    total_nilai INT DEFAULT 0,
    maksimal_nilai INT DEFAULT 0,
    persentase INT DEFAULT 0,
    is_lulus BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
);

-- =====================================================
-- 11. TABEL PEMBAYARAN
-- =====================================================
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT DEFAULT 20000,
    status ENUM('pending', 'verified', 'completed', 'failed') DEFAULT 'pending',
    payment_proof VARCHAR(500),
    verified_by INT,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES admins(id)
);

-- =====================================================
-- 12. TABEL SERTIFIKAT BLOCKCHAIN
-- =====================================================
CREATE TABLE certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    payment_id INT NOT NULL,
    transaction_hash VARCHAR(255) NOT NULL,
    certificate_hash VARCHAR(255),
    blockchain_id INT,
    issued_by INT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sertifikat_text TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (issued_by) REFERENCES admins(id)
);

-- =====================================================
-- DATA AWAL
-- =====================================================

-- Insert Data Bab
INSERT INTO babs (nama, deskripsi, urutan) VALUES
('Pengenalan Ilmu Tajwid', 'Materi dasar tentang pengertian dan pentingnya ilmu tajwid', 1),
('Hukum Nun Mati dan Tanwin', 'Materi tentang hukum izhar, idgham, iqlab, dan ikhfa', 2),
('Hukum Mim Mati', 'Materi tentang izhar syafawi, idgham mimi, dan ikhfa syafawi', 3),
('Mad dan Cabangnya', 'Materi tentang mad asli, mad fari, dan pembagiannya', 4);

-- Insert Admin
-- Password: admin123 (plain text)
-- Wallet: 0x5525598B4e3B70530c3acA29f1565dD5BD5344F5
INSERT INTO admins (username, email, password, wallet_address, nama_lengkap, jabatan) VALUES
('admin', 'admin@tajwid.com', 'admin123', '0x5525598B4e3B70530c3acA29f1565dD5BD5344F5', 'Administrator', 'Ketua Yayasan');

-- =====================================================
-- VERIFIKASI DATA
-- =====================================================
SELECT 'ADMINS:' as info;
SELECT id, username, email, wallet_address, jabatan FROM admins;

SELECT 'BABS:' as info;
SELECT id, nama, urutan FROM babs;

SELECT 'USERS TABLE COLUMNS:' as info;
SHOW COLUMNS FROM users;
