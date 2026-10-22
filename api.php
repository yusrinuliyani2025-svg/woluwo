<?php
/**
 * ========================================================================
 * BACKEND API RESTFUL - SISTEM ABSENSI DESA (PHP / MySQL XAMPP)
 * ========================================================================
 * Menangani seluruh integrasi CRUD aplikasi dengan Database MySQL XAMPP.
 */

// Enable CORS & JSON Header
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

// Handle preflight OPTIONS request
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
$pdo = getDbConnection();

// Inisialisasi tabel otomatis jika belum dibuat
initTablesIfNotExist($pdo);

// Ambil input (baik dari JSON body maupun form-data/query param)
$rawInput = file_get_contents('php://input');
$inputData = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $inputData = $decoded;
    }
}
$params = array_merge($_GET, $_POST, $inputData);
$action = $params['action'] ?? '';

try {
    switch ($action) {
        case 'getInfo':
        case 'testDb':
            sendResponse([
                'status' => 'success',
                'message' => 'Terkoneksi ke Database MySQL XAMPP (absensi_desa)',
                'database' => DB_NAME,
                'server_time' => date('Y-m-d H:i:s')
            ]);
            break;

        // -------------------------------------------------------------
        // USER & AUTHENTICATION
        // -------------------------------------------------------------
        case 'login':
            $nik = trim($params['nik'] ?? '');
            $pass = trim($params['password'] ?? '');

            $stmt = $pdo->prepare("SELECT * FROM users WHERE nik = ?");
            $stmt->execute([$nik]);
            $user = $stmt->fetch();

            if ($user && $user['password'] === $pass) {
                sendResponse([
                    'status' => 'success',
                    'nik' => $user['nik'],
                    'nama' => $user['nama_lengkap'],
                    'jabatan' => $user['jabatan'] ?? 'Pegawai Desa',
                    'role' => $user['role'] ?? 'user',
                    'namaKantor' => $user['nama_kantor'] ?? '-'
                ]);
            } else {
                sendResponse(['status' => 'error', 'message' => 'NIK atau Password salah!'], 401);
            }
            break;

        case 'getUsers':
            $stmt = $pdo->query("SELECT nik, nama_lengkap AS nama, password, jabatan, role, nama_kantor AS namaKantor, foto, no_hp AS noHp FROM users ORDER BY nama_lengkap ASC");
            $users = $stmt->fetchAll();
            sendResponse(['status' => 'success', 'data' => $users]);
            break;

        case 'saveUser':
            $nik = trim($params['nik'] ?? '');
            if (!$nik) sendResponse(['status' => 'error', 'message' => 'NIK wajib diisi!'], 400);

            $stmt = $pdo->prepare("SELECT nik FROM users WHERE nik = ?");
            $stmt->execute([$nik]);
            $exists = $stmt->fetch();

            $nama = $params['nama'] ?? ($params['nama_lengkap'] ?? '');
            $password = $params['password'] ?? '123456';
            $jabatan = $params['jabatan'] ?? '';
            $role = $params['role'] ?? 'user';
            $namaKantor = $params['namaKantor'] ?? ($params['nama_kantor'] ?? '');
            $foto = $params['foto'] ?? '';
            $noHp = $params['noHp'] ?? ($params['no_hp'] ?? '');

            if ($exists) {
                $sql = "UPDATE users SET nama_lengkap = ?, jabatan = ?, role = ?, nama_kantor = ?";
                $execParams = [$nama, $jabatan, $role, $namaKantor];
                if (!empty($params['password'])) {
                    $sql .= ", password = ?";
                    $execParams[] = $password;
                }
                if (isset($params['foto'])) {
                    $sql .= ", foto = ?";
                    $execParams[] = $foto;
                }
                if (isset($params['noHp'])) {
                    $sql .= ", no_hp = ?";
                    $execParams[] = $noHp;
                }
                $sql .= " WHERE nik = ?";
                $execParams[] = $nik;
                $update = $pdo->prepare($sql);
                $update->execute($execParams);
            } else {
                $insert = $pdo->prepare("INSERT INTO users (nik, password, nama_lengkap, jabatan, role, nama_kantor, foto, no_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $insert->execute([$nik, $password, $nama, $jabatan, $role, $namaKantor, $foto, $noHp]);
            }
            sendResponse(['status' => 'success', 'message' => 'Data pengguna berhasil disimpan di MySQL!']);
            break;

        case 'deleteUser':
            $nik = trim($params['nik'] ?? '');
            $stmt = $pdo->prepare("DELETE FROM users WHERE nik = ?");
            $stmt->execute([$nik]);
            sendResponse(['status' => 'success', 'message' => 'Pengguna berhasil dihapus!']);
            break;

        // -------------------------------------------------------------
        // CONFIG KANTOR
        // -------------------------------------------------------------
        case 'getConfig':
            $stmt = $pdo->query("SELECT id, nama_kantor AS namaKantor, latitude AS lat, longitude AS lng, radius, jam_masuk AS jamMasuk, jam_pulang AS jamPulang FROM config ORDER BY nama_kantor ASC");
            sendResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'saveKantor':
            $id = $params['id'] ?? ('KANTOR-' . time());
            $namaKantor = $params['namaKantor'] ?? '';
            $lat = floatval(str_replace(',', '.', $params['lat'] ?? 0));
            $lng = floatval(str_replace(',', '.', $params['lng'] ?? 0));
            $radius = intval($params['radius'] ?? 100);
            $jamMasuk = $params['jamMasuk'] ?? '08:00:00';
            $jamPulang = $params['jamPulang'] ?? '16:00:00';

            $stmt = $pdo->prepare("INSERT INTO config (id, nama_kantor, latitude, longitude, radius, jam_masuk, jam_pulang) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                nama_kantor = VALUES(nama_kantor), latitude = VALUES(latitude), longitude = VALUES(longitude), 
                radius = VALUES(radius), jam_masuk = VALUES(jam_masuk), jam_pulang = VALUES(jam_pulang)");
            $stmt->execute([$id, $namaKantor, $lat, $lng, $radius, $jamMasuk, $jamPulang]);
            sendResponse(['status' => 'success', 'message' => 'Data kantor berhasil disimpan di MySQL!']);
            break;

        case 'deleteKantor':
            $id = $params['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM config WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['status' => 'success', 'message' => 'Kantor berhasil dihapus!']);
            break;

        // -------------------------------------------------------------
        // ABSENSI & PRESENSI
        // -------------------------------------------------------------
        case 'absen':
            $id = $params['id'] ?? ('ABS-' . round(microtime(true) * 1000));
            $waktu = !empty($params['timestamp']) ? date('Y-m-d H:i:s', strtotime($params['timestamp'])) : date('Y-m-d H:i:s');
            $nik = $params['nik'] ?? '';
            $nama = $params['nama'] ?? '';
            $jabatan = $params['jabatan'] ?? '';
            $tipe = $params['tipe'] ?? 'Masuk';
            $statusLokasi = $params['statusLokasi'] ?? ($params['status'] ?? 'Hadir');
            $foto = $params['foto'] ?? '';
            $koordinat = $params['latLon'] ?? ($params['koordinat'] ?? '');
            $namaKantor = $params['namaKantor'] ?? '';
            $catatan = $params['keterangan'] ?? ($params['catatan'] ?? 'Presensi Mandiri');
            $lampiranSpt = $params['lampiranSpt'] ?? '';

            $stmt = $pdo->prepare("INSERT INTO absensi (id, waktu, nik, nama, jabatan, tipe, status, lokasi, foto_selfie, koordinat, nama_kantor, catatan, lampiran_spt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                waktu = VALUES(waktu), tipe = VALUES(tipe), status = VALUES(status), lokasi = VALUES(lokasi), catatan = VALUES(catatan)");
            $stmt->execute([$id, $waktu, $nik, $nama, $jabatan, $tipe, $statusLokasi, $statusLokasi, $foto, $koordinat, $namaKantor, $catatan, $lampiranSpt]);
            sendResponse(['status' => 'success', 'message' => 'Absensi berhasil disimpan ke MySQL!', 'id' => $id]);
            break;

        case 'syncBatch':
            $records = $params['records'] ?? [];
            if (is_string($records)) {
                $records = json_decode($records, true) ?? [];
            }
            $stmt = $pdo->prepare("INSERT INTO absensi (id, waktu, nik, nama, jabatan, tipe, status, lokasi, foto_selfie, koordinat, nama_kantor, catatan, lampiran_spt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE waktu = VALUES(waktu), tipe = VALUES(tipe), status = VALUES(status), catatan = VALUES(catatan)");
            
            $count = 0;
            foreach ($records as $r) {
                $rId = $r['id'] ?? ('ABS-' . round(microtime(true) * 1000) . '-' . $count);
                $rWaktu = !empty($r['timestamp']) ? date('Y-m-d H:i:s', strtotime($r['timestamp'])) : date('Y-m-d H:i:s');
                $stmt->execute([
                    $rId, $rWaktu, $r['nik'] ?? '', $r['nama'] ?? '', $r['jabatan'] ?? '',
                    $r['tipe'] ?? 'Masuk', $r['statusLokasi'] ?? 'Hadir', $r['statusLokasi'] ?? 'Hadir',
                    $r['foto'] ?? '', $r['latLon'] ?? '', $r['namaKantor'] ?? '',
                    $r['keterangan'] ?? '', $r['lampiranSpt'] ?? ''
                ]);
                $count++;
            }
            sendResponse(['status' => 'success', 'message' => "$count data presensi berhasil disinkronkan ke MySQL!", 'count' => $count]);
            break;

        case 'getRekap':
            $role = $params['role'] ?? 'user';
            $nik = $params['nik'] ?? '';
            $kantor = $params['namaKantor'] ?? '';

            $sql = "SELECT id, waktu AS timestamp, nik, nama, jabatan, tipe, status AS statusLokasi, foto_selfie AS foto, koordinat AS latLon, nama_kantor AS namaKantor, catatan AS keterangan, lampiran_spt AS lampiranSpt FROM absensi WHERE 1=1";
            $execParams = [];

            if ($role === 'user' && !empty($nik)) {
                $sql .= " AND nik = ?";
                $execParams[] = $nik;
            } elseif ($role === 'admin_desa' && !empty($kantor) && $kantor !== 'Semua' && $kantor !== 'Semua Unit Kantor Desa') {
                $sql .= " AND nama_kantor = ?";
                $execParams[] = $kantor;
            }
            $sql .= " ORDER BY waktu DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($execParams);
            sendResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'koreksiAbsen':
            $id = $params['id'] ?? '';
            $tipe = $params['tipeBaru'] ?? ($params['tipe'] ?? null);
            $statusLokasi = $params['statusLokasi'] ?? null;
            $keterangan = $params['keterangan'] ?? null;
            $timestamp = !empty($params['timestamp']) ? date('Y-m-d H:i:s', strtotime($params['timestamp'])) : null;

            $fields = [];
            $exec = [];
            if ($tipe) { $fields[] = "tipe = ?"; $exec[] = $tipe; }
            if ($statusLokasi) { $fields[] = "status = ?"; $exec[] = $statusLokasi; }
            if ($keterangan) { $fields[] = "catatan = ?"; $exec[] = $keterangan; }
            if ($timestamp) { $fields[] = "waktu = ?"; $exec[] = $timestamp; }

            if (empty($fields) || !$id) {
                sendResponse(['status' => 'error', 'message' => 'Parameter koreksi tidak lengkap'], 400);
            }

            $exec[] = $id;
            $sql = "UPDATE absensi SET " . implode(", ", $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($exec);
            sendResponse(['status' => 'success', 'message' => 'Data presensi berhasil dikoreksi di MySQL!']);
            break;

        case 'deleteAbsen':
            $id = $params['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM absensi WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['status' => 'success', 'message' => 'Data presensi berhasil dihapus!']);
            break;

        case 'deleteMultipleAbsen':
            $rawIds = $params['ids'] ?? [];
            if (is_string($rawIds)) {
                $rawIds = json_decode($rawIds, true) ?: explode(',', $rawIds);
            }
            $cleanIds = array_filter(array_map('trim', (array)$rawIds));
            if (!empty($cleanIds)) {
                $placeholders = implode(',', array_fill(0, count($cleanIds), '?'));
                $stmt = $pdo->prepare("DELETE FROM absensi WHERE id IN ($placeholders)");
                $stmt->execute(array_values($cleanIds));
            }
            sendResponse(['status' => 'success', 'message' => count($cleanIds) . ' data presensi berhasil dihapus!']);
            break;

        case 'clearAllAbsen':
            $kantor = trim($params['namaKantor'] ?? '');
            $start = trim($params['startDate'] ?? '');
            $end = trim($params['endDate'] ?? '');

            $sql = "DELETE FROM absensi WHERE 1=1";
            $exec = [];
            if ($kantor && $kantor !== 'Semua' && $kantor !== 'Semua Unit Kantor Desa') {
                $sql .= " AND nama_kantor = ?";
                $exec[] = $kantor;
            }
            if ($start && $end) {
                $sql .= " AND DATE(waktu) BETWEEN ? AND ?";
                $exec[] = $start;
                $exec[] = $end;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($exec);
            sendResponse(['status' => 'success', 'message' => 'Data presensi berhasil dibersihkan!']);
            break;

        // -------------------------------------------------------------
        // IZIN & CUTI
        // -------------------------------------------------------------
        case 'getLeaves':
            $role = $params['role'] ?? 'user';
            $nik = $params['nik'] ?? '';
            $kantor = $params['namaKantor'] ?? '';

            $sql = "SELECT id, waktu, nik, nama, kantor AS namaKantor, tipe, mulai AS tglMulai, selesai AS tglSelesai, alasan, surat, status, catatan_admin AS catatanAdmin, divalidasi_oleh AS divalidasiOleh FROM izin_cuti WHERE 1=1";
            $exec = [];
            if ($role === 'user' && !empty($nik)) {
                $sql .= " AND nik = ?";
                $exec[] = $nik;
            } elseif ($role === 'admin_desa' && !empty($kantor)) {
                $sql .= " AND kantor = ?";
                $exec[] = $kantor;
            }
            $sql .= " ORDER BY waktu DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($exec);
            sendResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'saveLeave':
            $id = $params['id'] ?? ('LEAVE-' . round(microtime(true) * 1000));
            $waktu = date('Y-m-d H:i:s');
            $nik = $params['nik'] ?? '';
            $nama = $params['nama'] ?? '';
            $kantor = $params['namaKantor'] ?? '';
            $tipe = $params['tipe'] ?? '';
            $mulai = $params['tglMulai'] ?? date('Y-m-d');
            $selesai = $params['tglSelesai'] ?? date('Y-m-d');
            $alasan = $params['alasan'] ?? '';
            $surat = $params['surat'] ?? '';
            $status = $params['status'] ?? 'Menunggu Persetujuan';
            $catatanAdmin = $params['catatanAdmin'] ?? '';
            $divalidasiOleh = $params['divalidasiOleh'] ?? '';

            $stmt = $pdo->prepare("INSERT INTO izin_cuti (id, waktu, nik, nama, kantor, tipe, mulai, selesai, alasan, surat, status, catatan_admin, divalidasi_oleh)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $waktu, $nik, $nama, $kantor, $tipe, $mulai, $selesai, $alasan, $surat, $status, $catatanAdmin, $divalidasiOleh]);
            sendResponse(['status' => 'success', 'message' => 'Permohonan izin/cuti berhasil disimpan ke MySQL!', 'id' => $id]);
            break;

        case 'updateLeaveStatus':
            $id = $params['id'] ?? '';
            $status = $params['status'] ?? 'Menunggu Persetujuan';
            $catatan = $params['catatanAdmin'] ?? '';
            $validator = $params['divalidasiOleh'] ?? '';

            $stmt = $pdo->prepare("UPDATE izin_cuti SET status = ?, catatan_admin = ?, divalidasi_oleh = ? WHERE id = ?");
            $stmt->execute([$status, $catatan, $validator, $id]);
            sendResponse(['status' => 'success', 'message' => 'Status izin/cuti berhasil diperbarui di MySQL!']);
            break;

        case 'deleteLeave':
            $id = $params['id'] ?? '';
            break;

        // -------------------------------------------------------------
        // PENGAJUAN KOREKSI PRESENSI (KENDALA SINYAL / MATI LISTRIK)
        // -------------------------------------------------------------
        case 'getPengajuanKoreksi':
            $role = $params['role'] ?? 'user';
            $nik = $params['nik'] ?? '';
            $kantor = $params['namaKantor'] ?? '';

            $sql = "SELECT id, waktu_pengajuan AS waktuPengajuan, waktu_presensi AS waktuPresensi, nik, nama, jabatan, nama_kantor AS namaKantor, tipe, jenis_kendala AS jenisKendala, keterangan, bukti_screenshot AS buktiScreenshot, status, catatan_admin AS catatanAdmin, divalidasi_oleh AS divalidasiOleh, divalidasi_pada AS divalidasiPada FROM koreksi_presensi WHERE 1=1";
            $exec = [];

            if ($role === 'user' && !empty($nik)) {
                $sql .= " AND nik = ?";
                $exec[] = $nik;
            } elseif ($role === 'admin_desa' && !empty($kantor) && $kantor !== 'Semua' && $kantor !== 'Semua Unit Kantor Desa') {
                $sql .= " AND nama_kantor = ?";
                $exec[] = $kantor;
            }
            $sql .= " ORDER BY waktu_pengajuan DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($exec);
            sendResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'savePengajuanKoreksi':
            $id = $params['id'] ?? ('KOR-' . round(microtime(true) * 1000));
            $waktuPengajuan = !empty($params['waktuPengajuan']) ? date('Y-m-d H:i:s', strtotime($params['waktuPengajuan'])) : date('Y-m-d H:i:s');
            $waktuPresensi = !empty($params['waktuPresensi']) ? date('Y-m-d H:i:s', strtotime($params['waktuPresensi'])) : date('Y-m-d H:i:s');
            $nik = $params['nik'] ?? '';
            $nama = $params['nama'] ?? '';
            $jabatan = $params['jabatan'] ?? '';
            $namaKantor = $params['namaKantor'] ?? '';
            $tipe = $params['tipe'] ?? 'Datang';
            $jenisKendala = $params['jenisKendala'] ?? 'Gangguan Sinyal';
            $keterangan = $params['keterangan'] ?? '';
            $buktiScreenshot = $params['buktiScreenshot'] ?? '';
            $status = $params['status'] ?? 'Menunggu Validasi';

            $stmt = $pdo->prepare("INSERT INTO koreksi_presensi (id, waktu_pengajuan, waktu_presensi, nik, nama, jabatan, nama_kantor, tipe, jenis_kendala, keterangan, bukti_screenshot, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $waktuPengajuan, $waktuPresensi, $nik, $nama, $jabatan, $namaKantor, $tipe, $jenisKendala, $keterangan, $buktiScreenshot, $status]);
            sendResponse(['status' => 'success', 'message' => 'Pengajuan koreksi presensi berhasil disimpan!', 'id' => $id]);
            break;

        case 'validasiPengajuanKoreksi':
            $id = $params['id'] ?? '';
            $status = $params['status'] ?? 'Disetujui';
            $catatan = $params['catatanAdmin'] ?? '';
            $validator = $params['divalidasiOleh'] ?? '';
            $divalidasiPada = date('Y-m-d H:i:s');

            $stmt = $pdo->prepare("UPDATE koreksi_presensi SET status = ?, catatan_admin = ?, divalidasi_oleh = ?, divalidasi_pada = ? WHERE id = ?");
            $stmt->execute([$status, $catatan, $validator, $divalidasiPada, $id]);

            // Jika Disetujui, otomatis rekam kehadiran ke tabel absensi MySQL
            if ($status === 'Disetujui') {
                $sK = $pdo->prepare("SELECT * FROM koreksi_presensi WHERE id = ?");
                $sK->execute([$id]);
                $kor = $sK->fetch();
                if ($kor) {
                    $absId = 'ABS-KOR-' . round(microtime(true) * 1000);
                    $tipeAbs = $kor['tipe'];
                    if (strpos($tipeAbs, 'Koreksi') === false) {
                        $tipeAbs .= ' (Koreksi)';
                    }
                    $statusLokasi = 'Valid (Koreksi ' . $kor['jenis_kendala'] . ')';
                    $catatanAbs = 'Koreksi Disetujui: ' . $kor['jenis_kendala'] . ($kor['keterangan'] ? ' - ' . $kor['keterangan'] : '');
                    if ($catatan) {
                        $catatanAbs .= ' [Catatan Admin: ' . $catatan . ']';
                    }
                    $insAbs = $pdo->prepare("INSERT INTO absensi (id, waktu, nik, nama, jabatan, tipe, status, lokasi, foto_selfie, koordinat, nama_kantor, catatan, lampiran_spt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $insAbs->execute([
                        $absId, $kor['waktu_presensi'], $kor['nik'], $kor['nama'], $kor['jabatan'],
                        $tipeAbs, $statusLokasi, $statusLokasi, $kor['bukti_screenshot'], '-',
                        $kor['nama_kantor'], $catatanAbs, ''
                    ]);
                }
            }
            sendResponse(['status' => 'success', 'message' => "Pengajuan koreksi presensi berhasil di-{$status}!"]);
            break;

        case 'deletePengajuanKoreksi':
            $id = $params['id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM koreksi_presensi WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['status' => 'success', 'message' => 'Pengajuan koreksi berhasil dihapus!']);
            break;

        // -------------------------------------------------------------
        // LAPORAN REKAPITULASI
        // -------------------------------------------------------------
        case 'getLaporan':
            $stmt = $pdo->query("SELECT id, waktu_presensi AS timestamp, nik, nama_pegawai AS nama, jabatan, unit_kantor_desa AS namaKantor, tipe_kehadiran AS tipe, status_lokasi AS statusLokasi, keterangan, tanggal_dibuat AS created_at FROM laporan ORDER BY tanggal_dibuat DESC");
            sendResponse(['status' => 'success', 'data' => $stmt->fetchAll()]);
            break;

        case 'saveLaporan':
            $records = $params['records'] ?? [];
            if (is_string($records)) {
                $records = json_decode($records, true) ?: [];
            }
            $stmt = $pdo->prepare("INSERT INTO laporan (id, waktu_presensi, nik, nama_pegawai, jabatan, unit_kantor_desa, tipe_kehadiran, status_lokasi, keterangan, tanggal_dibuat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $count = 0;
            foreach ($records as $r) {
                $rId = $r['id'] ?? ('LAP-' . round(microtime(true) * 1000) . '-' . $count);
                $waktuPresensi = !empty($r['timestamp']) ? date('Y-m-d H:i:s', strtotime($r['timestamp'])) : null;
                $stmt->execute([
                    $rId, $waktuPresensi, $r['nik'] ?? '', $r['nama'] ?? '', $r['jabatan'] ?? '',
                    $r['namaKantor'] ?? '', $r['tipe'] ?? '', $r['statusLokasi'] ?? '', $r['keterangan'] ?? ''
                ]);
                $count++;
            }
            sendResponse(['status' => 'success', 'message' => "$count baris laporan berhasil disimpan ke MySQL!", 'count' => $count]);
            break;

        case 'clearLaporan':
            $pdo->exec("TRUNCATE TABLE laporan");
            sendResponse(['status' => 'success', 'message' => 'Data laporan berhasil dibersihkan!']);
            break;

        default:
            sendResponse(['status' => 'error', 'message' => "Aksi tidak dikenali: '$action'"], 400);
            break;
    }
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function initTablesIfNotExist($pdo) {
    $sql = "
    CREATE TABLE IF NOT EXISTS `users` (
      `nik` VARCHAR(30) NOT NULL PRIMARY KEY,
      `password` VARCHAR(255) NOT NULL,
      `nama_lengkap` VARCHAR(150) NOT NULL,
      `jabatan` VARCHAR(100) DEFAULT NULL,
      `role` ENUM('super_admin', 'admin_desa', 'user') NOT NULL DEFAULT 'user',
      `nama_kantor` VARCHAR(150) DEFAULT NULL,
      `foto` MEDIUMTEXT DEFAULT NULL,
      `no_hp` VARCHAR(25) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `config` (
      `id` VARCHAR(50) NOT NULL PRIMARY KEY,
      `nama_kantor` VARCHAR(150) NOT NULL,
      `latitude` DECIMAL(10, 7) NOT NULL,
      `longitude` DECIMAL(10, 7) NOT NULL,
      `radius` INT UNSIGNED NOT NULL DEFAULT 100,
      `jam_masuk` TIME NOT NULL DEFAULT '08:00:00',
      `jam_pulang` TIME NOT NULL DEFAULT '16:00:00'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `absensi` (
      `id` VARCHAR(50) NOT NULL PRIMARY KEY,
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
      `lampiran_spt` MEDIUMTEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `izin_cuti` (
      `id` VARCHAR(50) NOT NULL PRIMARY KEY,
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
      `divalidasi_oleh` VARCHAR(150) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `laporan` (
      `id` VARCHAR(50) NOT NULL PRIMARY KEY,
      `waktu_presensi` DATETIME DEFAULT NULL,
      `nik` VARCHAR(30) NOT NULL,
      `nama_pegawai` VARCHAR(150) NOT NULL,
      `jabatan` VARCHAR(100) DEFAULT NULL,
      `unit_kantor_desa` VARCHAR(150) DEFAULT NULL,
      `tipe_kehadiran` VARCHAR(50) DEFAULT NULL,
      `status_lokasi` VARCHAR(50) DEFAULT NULL,
      `keterangan` TEXT DEFAULT NULL,
      `tanggal_dibuat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `koreksi_presensi` (
      `id` VARCHAR(50) NOT NULL PRIMARY KEY,
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
      `divalidasi_pada` DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($sql);
}
