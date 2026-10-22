<?php
/**
 * ========================================================================
 * KONEKSI DATABASE MYSQL XAMPP (Sistem Absensi Desa)
 * ========================================================================
 */

// Konfigurasi Database XAMPP
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'absensi_desa');

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        // Coba koneksi ke server MySQL
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        
        // Buat database jika belum ada
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `" . DB_NAME . "`");
        
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => 'Gagal terhubung ke MySQL XAMPP: ' . $e->getMessage(),
            'hint' => 'Pastikan Apache & MySQL di XAMPP Control Panel sudah berstatus RUNNING.'
        ]);
        exit;
    }
}
