-- ========================================================================
-- DATABASE SETUP: SISTEM ABSENSI DESA (XAMPP / MySQL)
-- ========================================================================

CREATE DATABASE IF NOT EXISTS `absensi_desa` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `absensi_desa`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABEL: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `nik` VARCHAR(30) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `nama_lengkap` VARCHAR(150) NOT NULL,
  `jabatan` VARCHAR(100) DEFAULT NULL,
  `role` ENUM('super_admin', 'admin_desa', 'user') NOT NULL DEFAULT 'user',
  `nama_kantor` VARCHAR(150) DEFAULT NULL,
  `foto` MEDIUMTEXT DEFAULT NULL,
  `no_hp` VARCHAR(25) DEFAULT NULL,
  PRIMARY KEY (`nik`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_kantor` (`nama_kantor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL: config
DROP TABLE IF EXISTS `config`;
CREATE TABLE `config` (
  `id` VARCHAR(50) NOT NULL,
  `nama_kantor` VARCHAR(150) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `radius` INT UNSIGNED NOT NULL DEFAULT 100 COMMENT 'Radius dalam meter',
  `jam_masuk` TIME NOT NULL DEFAULT '08:00:00',
  `jam_pulang` TIME NOT NULL DEFAULT '16:00:00',
  PRIMARY KEY (`id`),
  KEY `idx_config_kantor` (`nama_kantor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL: absensi
DROP TABLE IF EXISTS `absensi`;
CREATE TABLE `absensi` (
  `id` VARCHAR(50) NOT NULL,
  `waktu` DATETIME NOT NULL,
  `nik` VARCHAR(30) NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `jabatan` VARCHAR(100) DEFAULT NULL,
  `tipe` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) DEFAULT NULL,
  `lokasi` VARCHAR(100) DEFAULT NULL,
  `foto_selfie` MEDIUMTEXT DEFAULT NULL,
  `koordinat` VARCHAR(100) DEFAULT NULL,
  `nama_kantor` VARCHAR(150) DEFAULT NULL,
  `catatan` TEXT DEFAULT NULL,
  `lampiran_spt` MEDIUMTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_absensi_nik` (`nik`),
  KEY `idx_absensi_waktu` (`waktu`),
  KEY `idx_absensi_kantor` (`nama_kantor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL: izin_cuti
DROP TABLE IF EXISTS `izin_cuti`;
CREATE TABLE `izin_cuti` (
  `id` VARCHAR(50) NOT NULL,
  `waktu` DATETIME NOT NULL,
  `nik` VARCHAR(30) NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `kantor` VARCHAR(150) DEFAULT NULL,
  `tipe` VARCHAR(50) NOT NULL,
  `mulai` DATE NOT NULL,
  `selesai` DATE NOT NULL,
  `alasan` TEXT DEFAULT NULL,
  `surat` MEDIUMTEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Menunggu Persetujuan',
  `catatan_admin` TEXT DEFAULT NULL,
  `divalidasi_oleh` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_izin_nik` (`nik`),
  KEY `idx_izin_periode` (`mulai`, `selesai`),
  KEY `idx_izin_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL: laporan
DROP TABLE IF EXISTS `laporan`;
CREATE TABLE `laporan` (
  `id` VARCHAR(50) NOT NULL,
  `waktu_presensi` DATETIME DEFAULT NULL,
  `nik` VARCHAR(30) NOT NULL,
  `nama_pegawai` VARCHAR(150) NOT NULL,
  `jabatan` VARCHAR(100) DEFAULT NULL,
  `unit_kantor_desa` VARCHAR(150) DEFAULT NULL,
  `tipe_kehadiran` VARCHAR(50) DEFAULT NULL,
  `status_lokasi` VARCHAR(50) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `tanggal_dibuat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_laporan_nik` (`nik`),
  KEY `idx_laporan_waktu` (`waktu_presensi`),
  KEY `idx_laporan_unit` (`unit_kantor_desa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL: koreksi_presensi (Kendala Sinyal / Mati Listrik)
DROP TABLE IF EXISTS `koreksi_presensi`;
CREATE TABLE `koreksi_presensi` (
  `id` VARCHAR(50) NOT NULL,
  `waktu_pengajuan` DATETIME NOT NULL,
  `waktu_presensi` DATETIME NOT NULL,
  `nik` VARCHAR(30) NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `jabatan` VARCHAR(100) DEFAULT NULL,
  `nama_kantor` VARCHAR(150) DEFAULT NULL,
  `tipe` VARCHAR(50) NOT NULL,
  `jenis_kendala` VARCHAR(100) NOT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `bukti_screenshot` MEDIUMTEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Menunggu Validasi',
  `catatan_admin` TEXT DEFAULT NULL,
  `divalidasi_oleh` VARCHAR(150) DEFAULT NULL,
  `divalidasi_pada` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_koreksi_nik` (`nik`),
  KEY `idx_koreksi_status` (`status`),
  KEY `idx_koreksi_kantor` (`nama_kantor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================================
-- DATA AWAL (SEED DATA)
-- ========================================================================

-- Users
INSERT INTO `users` (`nik`, `password`, `nama_lengkap`, `jabatan`, `role`, `nama_kantor`, `foto`, `no_hp`) VALUES
('198501012010011001', 'admin', 'Drs. Hendra Puluhulawa, M.Si', 'Super Administrator Wilayah', 'super_admin', 'Kantor Camat Botumoito', '', '081234567890'),
('199002022015021002', 'admin', 'Fahri Hasan, S.IP', 'Admin Desa Botumoito', 'admin_desa', 'Kantor Desa Botumoito', '', '081234567891'),
('7501020304050001', 'user', 'Harry Potter', 'Kaur Keuangan', 'user', 'Kantor Desa Botumoito', '', '081234567892')
ON DUPLICATE KEY UPDATE `nama_lengkap` = VALUES(`nama_lengkap`);

-- Config Kantor
INSERT INTO `config` (`id`, `nama_kantor`, `latitude`, `longitude`, `radius`, `jam_masuk`, `jam_pulang`) VALUES
('KANTOR-001', 'Kantor Camat Botumoito', 0.5367800, 122.2598100, 100, '08:00:00', '16:00:00'),
('KANTOR-002', 'Kantor Desa Botumoito', 0.5381200, 122.2612000, 80, '08:00:00', '16:00:00')
ON DUPLICATE KEY UPDATE `nama_kantor` = VALUES(`nama_kantor`);
