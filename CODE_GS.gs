/**
 * =========================================================================
 * APLIKASI ABSENSI DESA "Woluwo" - BACKEND GOOGLE APPS SCRIPT (Kode.gs)
 * =========================================================================
 * VERSI LENGKAP - SEMUA DATA TERSIMPAN DI GOOGLE SHEETS
 * =========================================================================
 * Petunjuk Pemasangan:
 * 1. Buka Google Sheets Anda
 * 2. Klik menu "Ekstensi" > "Apps Script" (atau "Extensions" > "Apps Script")
 * 3. HAPUS SEMUA teks bawaan (seperti function myFunction() { ... })
 * 4. Paste SELURUH KODE DI BAWAH INI dari baris pertama sampai baris terakhir
 * 5. Klik "Simpan" (ikon disket), lalu "Terapkan" (Deploy) > "Kelola Penerapan" > "Deploy baru"
 *    - Jenis: Aplikasi Web (Web App)
 *    - Jalankan sebagai: Saya (Me)
 *    - Yang memiliki akses: Siapa saja (Anyone)
 * =========================================================================
 * DAFTAR SHEET YANG DIKELOLA:
 *   1. Users         - Data semua pengguna (Super Admin, Admin Desa, Pegawai)
 *   2. Config        - Lokasi kantor desa, koordinat GPS, radius & jam kerja
 *   3. Absensi       - Semua rekaman presensi (masuk, pulang, dinas, dll)
 *   4. IzinCuti      - Permohonan izin, sakit, dan cuti pegawai
 *   5. Laporan       - Rekapitulasi laporan presensi
 *   6. JadwalKerja   - Pengaturan hari kerja aktif & override harian
 *   7. HariLibur     - Daftar hari libur nasional & khusus
 * =========================================================================
 */

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch(e) {}
  
  // ID Spreadsheet Google Sheet Woluwo (Sesuai Spreadsheet Aktif):
  var DEFAULT_SHEET_ID = "1lM9x10LOVkZFZv-iLRvre2uhpqvycZ_WuDLFagtY7Ic";
  return SpreadsheetApp.openById(DEFAULT_SHEET_ID);
}

// Inisialisasi otomatis SEMUA lembar kerja jika belum ada
function initSheets() {
  var ss = getSpreadsheet();
  
  // Sheet Users
  if (!ss.getSheetByName("Users")) {
    var shUser = ss.insertSheet("Users");
    shUser.appendRow(["NIK", "Password", "Nama Lengkap", "Jabatan", "Role", "Nama Kantor", "Foto", "No HP"]);
    shUser.appendRow(["198501012010011001", "admin", "Super Admin", "Super Administrator", "super_admin", "Kantor Camat Botumoito", "", ""]);
  }
  
  // Sheet Config (Lokasi & Jam Kerja)
  if (!ss.getSheetByName("Config")) {
    var shCfg = ss.insertSheet("Config");
    shCfg.appendRow(["ID", "Nama Kantor", "Latitude", "Longitude", "Radius", "Jam Masuk", "Jam Pulang"]);
  }
  
  // Sheet Absensi
  if (!ss.getSheetByName("Absensi")) {
    var shAbs = ss.insertSheet("Absensi");
    shAbs.appendRow(["ID", "Waktu", "NIK", "Nama", "Jabatan", "Tipe", "Status Lokasi", "Foto Selfie", "Koordinat", "Nama Kantor", "Catatan", "Lampiran SPT"]);
  } else {
    var shAbs = ss.getSheetByName("Absensi");
    if (shAbs && shAbs.getLastColumn() < 12) {
      shAbs.getRange(1, 12).setValue("Lampiran SPT");
    }
  }
  
  // Sheet Izin / Cuti
  if (!ss.getSheetByName("IzinCuti")) {
    var shLeave = ss.insertSheet("IzinCuti");
    shLeave.appendRow(["ID", "Waktu", "NIK", "Nama", "Kantor", "Tipe", "Mulai", "Selesai", "Alasan", "Surat", "Status", "Catatan Admin", "Divalidasi Oleh"]);
  } else {
    // Pastikan header baru otomatis terpasang jika sheet lama baru memiliki 9 kolom
    var shLeave = ss.getSheetByName("IzinCuti");
    var lastCol = shLeave.getLastColumn();
    if (lastCol < 13) {
      shLeave.getRange(1, 10).setValue("Surat");
      shLeave.getRange(1, 11).setValue("Status");
      shLeave.getRange(1, 12).setValue("Catatan Admin");
      shLeave.getRange(1, 13).setValue("Divalidasi Oleh");
    }
  }

  // Sheet Laporan (Database Rekapitulasi Presensi Desa)
  if (!ss.getSheetByName("Laporan")) {
    var shLap = ss.insertSheet("Laporan");
    shLap.appendRow(["ID", "Waktu Presensi", "NIK", "Nama Pegawai", "Jabatan", "Unit Kantor Desa", "Tipe Kehadiran", "Status Lokasi", "Keterangan", "Tanggal Dibuat"]);
  }

  // Sheet JadwalKerja (Pengaturan Hari Kerja Aktif & Override Harian oleh Super Admin)
  if (!ss.getSheetByName("JadwalKerja")) {
    var shJadwal = ss.insertSheet("JadwalKerja");
    shJadwal.appendRow(["Key", "Value"]);
    shJadwal.appendRow(["activeDays", "[1,2,3,4,5]"]);
    shJadwal.appendRow(["todayManualOverride", ""]);
    shJadwal.appendRow(["lastOverrideDate", ""]);
  }

  // Sheet HariLibur (Daftar Hari Libur Nasional & Khusus)
  if (!ss.getSheetByName("HariLibur")) {
    var shLibur = ss.insertSheet("HariLibur");
    shLibur.appendRow(["ID", "Tanggal", "Nama Hari Libur", "Tipe"]);
    // Isi default hari libur nasional 2026
    var defaultHolidays = [
      ["HOL-2026-01", "2026-01-01", "Tahun Baru 2026 Masehi", "Libur Nasional"],
      ["HOL-2026-02", "2026-01-16", "Isra Mi'raj Nabi Muhammad SAW", "Libur Nasional"],
      ["HOL-2026-03", "2026-02-17", "Tahun Baru Imlek 2577 Kongzili", "Libur Nasional"],
      ["HOL-2026-04", "2026-03-20", "Hari Raya Idul Fitri 1447 H (Hari ke-1)", "Libur Nasional"],
      ["HOL-2026-05", "2026-03-21", "Hari Raya Idul Fitri 1447 H (Hari ke-2)", "Libur Nasional"],
      ["HOL-2026-06", "2026-03-23", "Cuti Bersama Idul Fitri 1447 H", "Cuti Bersama"],
      ["HOL-2026-07", "2026-03-24", "Cuti Bersama Idul Fitri 1447 H", "Cuti Bersama"],
      ["HOL-2026-08", "2026-03-31", "Hari Suci Nyepi (Tahun Baru Saka 1948)", "Libur Nasional"],
      ["HOL-2026-09", "2026-04-03", "Wafat Isa Almasih", "Libur Nasional"],
      ["HOL-2026-10", "2026-05-01", "Hari Buruh Internasional", "Libur Nasional"],
      ["HOL-2026-11", "2026-05-14", "Kenaikan Isa Almasih", "Libur Nasional"],
      ["HOL-2026-12", "2026-05-27", "Hari Raya Idul Adha 1447 H", "Libur Nasional"],
      ["HOL-2026-13", "2026-05-31", "Hari Raya Waisak 2570 BE", "Libur Nasional"],
      ["HOL-2026-14", "2026-06-01", "Hari Lahir Pancasila", "Libur Nasional"],
      ["HOL-2026-15", "2026-06-16", "Tahun Baru Islam 1448 H", "Libur Nasional"],
      ["HOL-2026-16", "2026-08-17", "Hari Proklamasi Kemerdekaan RI", "Libur Nasional"],
      ["HOL-2026-17", "2026-08-25", "Maulid Nabi Muhammad SAW", "Libur Nasional"],
      ["HOL-2026-18", "2026-12-25", "Hari Raya Natal", "Libur Nasional"]
    ];
    for (var h = 0; h < defaultHolidays.length; h++) {
      shLibur.appendRow(defaultHolidays[h]);
    }
  }
}

// =========================================================================
// ROUTING POST (Menerima data dari aplikasi)
// =========================================================================
function doPost(e) {
  try {
    initSheets();
    var data = null;
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch(pErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      data = {};
    }

    var action = data.action;
    
    // === AUTENTIKASI ===
    if (action === "login") return handleLogin(data);
    
    // === PENGGUNA (Users) ===
    if (action === "saveUser") return handleSaveUser(data);
    if (action === "deleteUser") return handleDeleteUser(data);
    
    // === KANTOR DESA (Config) ===
    if (action === "saveKantor") return handleSaveKantor(data);
    if (action === "deleteKantor") return handleDeleteKantor(data);
    
    // === PRESENSI / ABSENSI ===
    if (action === "absen") return handleAbsen(data);
    if (action === "syncBatch") return handleBatchAbsen(data);
    if (action === "koreksiAbsen") return handleKoreksiAbsen(data);
    if (action === "deleteAbsen") return handleDeleteAbsen(data);
    if (action === "deleteMultipleAbsen") return handleDeleteMultipleAbsen(data);
    if (action === "clearAllAbsen") return handleClearAllAbsen(data);
    
    // === IZIN & CUTI ===
    if (action === "saveLeave") return handleSaveLeave(data);
    if (action === "updateLeaveStatus") return handleUpdateLeaveStatus(data);
    if (action === "deleteLeave") return handleDeleteLeave(data);
    
    // === LAPORAN ===
    if (action === "saveLaporan") return handleSaveLaporan(data);
    if (action === "getLaporan") return handleGetLaporan(data);
    if (action === "clearLaporan") return handleClearLaporan(data);
    
    // === JADWAL KERJA (Super Admin) ===
    if (action === "saveWorkSchedule") return handleSaveWorkSchedule(data);
    
    // === HARI LIBUR (Super Admin) ===
    if (action === "saveHoliday") return handleSaveHoliday(data);
    if (action === "deleteHoliday") return handleDeleteHoliday(data);
    if (action === "resetHolidays") return handleResetHolidays(data);
    
    return jsonResponse({ status: "error", message: "Action tidak dikenali: " + action });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// =========================================================================
// ROUTING GET (Mengambil data ke aplikasi)
// =========================================================================
function doGet(e) {
  try {
    initSheets();
    var p = (e && e.parameter) ? e.parameter : {};
    var action = p.action;
    
    // === GET DATA ===
    if (action === "getUsers") return getUsers();
    if (action === "getConfig") return getConfigList();
    if (action === "getRekap") return getRekap(p.role, p.nik, p.namaKantor);
    if (action === "getLeaves") return handleGetLeaves(p);
    if (action === "getLaporan") return handleGetLaporan(p);
    if (action === "getWorkSchedule") return handleGetWorkSchedule();
    if (action === "getHolidays") return handleGetHolidays();
    if (action === "getInfo") {
      var ss = getSpreadsheet();
      return jsonResponse({ status: "success", sheetId: ss.getId(), sheetName: ss.getName(), sheetUrl: ss.getUrl() });
    }
    
    // Mendukung fallback eksekusi via GET jika fetch POST diblokir oleh CORS di browser
    if (action === "absen") return handleAbsen(p);
    if (action === "saveUser") return handleSaveUser(p);
    if (action === "deleteUser") return handleDeleteUser(p);
    if (action === "saveKantor") return handleSaveKantor(p);
    if (action === "deleteKantor") return handleDeleteKantor(p);
    if (action === "koreksiAbsen") return handleKoreksiAbsen(p);
    if (action === "deleteAbsen") return handleDeleteAbsen(p);
    if (action === "deleteMultipleAbsen") return handleDeleteMultipleAbsen(p);
    if (action === "clearAllAbsen") return handleClearAllAbsen(p);
    if (action === "saveLeave") return handleSaveLeave(p);
    if (action === "updateLeaveStatus") return handleUpdateLeaveStatus(p);
    if (action === "deleteLeave") return handleDeleteLeave(p);
    if (action === "saveLaporan") return handleSaveLaporan(p);
    if (action === "clearLaporan") return handleClearLaporan(p);
    if (action === "saveWorkSchedule") return handleSaveWorkSchedule(p);
    if (action === "saveHoliday") return handleSaveHoliday(p);
    if (action === "deleteHoliday") return handleDeleteHoliday(p);
    if (action === "resetHolidays") return handleResetHolidays(p);
    if (action === "login") return handleLogin(p);
    
    return jsonResponse({ status: "success", message: "Server Woluwo Aktif Siap Digunakan! Semua 7 sheet database terhubung." });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// =========================================================================
// HANDLER: AUTENTIKASI (LOGIN)
// =========================================================================
function handleLogin(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.nik && rows[i][1] == data.password) {
      return jsonResponse({
        status: "success",
        nik: rows[i][0],
        nama: rows[i][2],
        jabatan: rows[i][3] || "Pegawai Desa",
        role: rows[i][4] || "user",
        namaKantor: rows[i][5] || "-",
        foto: rows[i][6] || "",
        noHp: rows[i][7] || ""
      });
    }
  }
  return jsonResponse({ status: "error", message: "NIK atau Password salah!" });
}

// =========================================================================
// HANDLER: PENGGUNA (Users) - Simpan, Hapus, Ambil
// =========================================================================
function getUsers() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  var rows = sheet.getDataRange().getValues();
  var users = [];
  
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    users.push({
      nik: rows[i][0],
      password: rows[i][1] || "",
      nama: rows[i][2],
      jabatan: rows[i][3] || "-",
      role: rows[i][4] || "user",
      namaKantor: rows[i][5] || "-",
      foto: rows[i][6] || "",
      noHp: rows[i][7] || ""
    });
  }
  return jsonResponse({ status: "success", data: users });
}

function handleSaveUser(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  var rows = sheet.getDataRange().getValues();
  var found = false;
  var fotoVal = (data.foto || "").toString();
  if (fotoVal.length > 45000) fotoVal = fotoVal.substring(0, 45000);
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.nik) {
      if (data.password && data.password.trim() !== "") {
        sheet.getRange(i + 1, 2).setValue(data.password);
      }
      sheet.getRange(i + 1, 3).setValue(data.nama);
      sheet.getRange(i + 1, 4).setValue(data.jabatan);
      sheet.getRange(i + 1, 5).setValue(data.role);
      sheet.getRange(i + 1, 6).setValue(data.namaKantor);
      if (data.foto !== undefined) {
        sheet.getRange(i + 1, 7).setValue(fotoVal);
      }
      if (data.noHp !== undefined) {
        sheet.getRange(i + 1, 8).setValue(data.noHp);
      }
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow([data.nik, data.password || "123456", data.nama, data.jabatan, data.role, data.namaKantor, fotoVal, data.noHp || ""]);
  }
  
  return jsonResponse({ status: "success", message: "Data pengguna berhasil disimpan!" });
}

function handleDeleteUser(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.nik) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success", message: "Pengguna berhasil dihapus!" });
    }
  }
  return jsonResponse({ status: "error", message: "Pengguna tidak ditemukan!" });
}

// =========================================================================
// HANDLER: KANTOR DESA (Config) - Simpan, Hapus, Ambil
// =========================================================================
function getConfigList() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Config");
  var rows = sheet.getDataRange().getValues();
  var list = [];
  
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    list.push({
      id: rows[i][0],
      namaKantor: rows[i][1],
      lat: rows[i][2],
      lng: rows[i][3],
      radius: rows[i][4],
      jamMasuk: rows[i][5] || "08:00",
      jamPulang: rows[i][6] || "16:00"
    });
  }
  return jsonResponse({ status: "success", data: list });
}

function handleSaveKantor(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Config");
  var rows = sheet.getDataRange().getValues();
  var found = false;
  
  var latVal = "'" + data.lat.toString().replace(/,/g, '.');
  var lngVal = "'" + data.lng.toString().replace(/,/g, '.');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 2).setValue(data.namaKantor);
      sheet.getRange(i + 1, 3).setValue(latVal);
      sheet.getRange(i + 1, 4).setValue(lngVal);
      sheet.getRange(i + 1, 5).setValue(data.radius);
      sheet.getRange(i + 1, 6).setValue(data.jamMasuk || "08:00");
      sheet.getRange(i + 1, 7).setValue(data.jamPulang || "16:00");
      found = true;
      break;
    }
  }
  
  if (!found) {
    var newId = data.id || ("KANTOR-" + new Date().getTime());
    sheet.appendRow([newId, data.namaKantor, latVal, lngVal, data.radius, data.jamMasuk || "08:00", data.jamPulang || "16:00"]);
  }
  
  return jsonResponse({ status: "success", message: "Data kantor berhasil disimpan!" });
}

function handleDeleteKantor(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Config");
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success", message: "Kantor berhasil dihapus!" });
    }
  }
  return jsonResponse({ status: "error", message: "Kantor tidak ditemukan!" });
}

// =========================================================================
// HANDLER: PRESENSI / ABSENSI - Simpan, Batch, Koreksi, Hapus
// =========================================================================
function handleAbsen(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName("Absensi");
  }
  if (sheet && sheet.getLastColumn() < 12) {
    sheet.getRange(1, 12).setValue("Lampiran SPT");
  }

  var id = data.id || ("ABS-" + new Date().getTime());
  var fotoVal = (data.foto || "").toString();
  if (fotoVal.length > 45000) fotoVal = fotoVal.substring(0, 45000);
  var sptVal = (data.lampiranSpt || data.spt || "").toString();
  if (sptVal.length > 45000) sptVal = sptVal.substring(0, 45000);
  
  // Cek duplikasi berdasarkan ID agar tidak double entry saat sync
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(id).trim()) {
      // Update existing row instead of creating duplicate
      sheet.getRange(i + 1, 2).setValue(data.timestamp ? new Date(data.timestamp) : new Date());
      sheet.getRange(i + 1, 3).setValue(data.nik);
      sheet.getRange(i + 1, 4).setValue(data.nama);
      sheet.getRange(i + 1, 5).setValue(data.jabatan);
      sheet.getRange(i + 1, 6).setValue(data.tipe);
      sheet.getRange(i + 1, 7).setValue(data.statusLokasi);
      sheet.getRange(i + 1, 8).setValue(fotoVal);
      sheet.getRange(i + 1, 9).setValue(data.latLon);
      sheet.getRange(i + 1, 10).setValue(data.namaKantor);
      sheet.getRange(i + 1, 11).setValue(data.keterangan || "Presensi Mandiri");
      sheet.getRange(i + 1, 12).setValue(sptVal);
      return jsonResponse({ status: "success", message: "Absensi berhasil diperbarui!", id: id });
    }
  }

  sheet.appendRow([
    id, 
    data.timestamp ? new Date(data.timestamp) : new Date(), 
    data.nik, 
    data.nama, 
    data.jabatan, 
    data.tipe, 
    data.statusLokasi, 
    fotoVal, 
    data.latLon, 
    data.namaKantor, 
    data.keterangan || "Presensi Mandiri",
    sptVal
  ]);
  return jsonResponse({ status: "success", message: "Absensi berhasil disimpan!", id: id });
}

function handleBatchAbsen(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName("Absensi");
  }
  if (sheet && sheet.getLastColumn() < 12) {
    sheet.getRange(1, 12).setValue("Lampiran SPT");
  }

  var list = data.records || [];
  if (typeof list === "string") {
    try { list = JSON.parse(list); } catch(e) { list = []; }
  }
  
  // Ambil semua ID yang sudah ada untuk mencegah duplikat
  var existingRows = sheet.getDataRange().getValues();
  var existingIds = {};
  for (var x = 1; x < existingRows.length; x++) {
    existingIds[String(existingRows[x][0]).trim()] = true;
  }
  
  var added = 0;
  for (var i = 0; i < list.length; i++) {
    var rec = list[i];
    var recId = rec.id || ("ABS-" + new Date().getTime() + "-" + i);
    
    // Skip jika sudah ada
    if (existingIds[String(recId).trim()]) continue;
    
    var fotoVal = (rec.foto || "").toString();
    if (fotoVal.length > 45000) fotoVal = fotoVal.substring(0, 45000);
    var sptVal = (rec.lampiranSpt || rec.spt || "").toString();
    if (sptVal.length > 45000) sptVal = sptVal.substring(0, 45000);

    sheet.appendRow([
      recId,
      rec.timestamp ? new Date(rec.timestamp) : new Date(),
      rec.nik,
      rec.nama,
      rec.jabatan,
      rec.tipe,
      rec.statusLokasi,
      fotoVal,
      rec.latLon,
      rec.namaKantor,
      rec.keterangan || "Sinkronisasi Lokal",
      sptVal
    ]);
    added++;
  }
  return jsonResponse({ status: "success", message: added + " data absensi baru berhasil disinkronkan! (" + (list.length - added) + " sudah ada)", count: added });
}

function handleKoreksiAbsen(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      if (data.timestamp) {
        sheet.getRange(i + 1, 2).setValue(new Date(data.timestamp));
      }
      if (data.tipeBaru) {
        sheet.getRange(i + 1, 6).setValue(data.tipeBaru);
      }
      if (data.statusLokasi) {
        sheet.getRange(i + 1, 7).setValue(data.statusLokasi);
      } else if (data.keterangan) {
        sheet.getRange(i + 1, 7).setValue("Dikoreksi Admin (" + data.keterangan + ")");
      }
      if (data.keterangan) {
        sheet.getRange(i + 1, 11).setValue(data.keterangan);
      }
      return jsonResponse({ status: "success", message: "Data presensi berhasil dikoreksi!" });
    }
  }
  return jsonResponse({ status: "error", message: "Data tidak ditemukan" });
}

function handleDeleteAbsen(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success", message: "Data presensi berhasil dihapus!" });
    }
  }
  return jsonResponse({ status: "error", message: "Data presensi tidak ditemukan!" });
}

function handleDeleteMultipleAbsen(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet Absensi tidak ditemukan" });
  var rows = sheet.getDataRange().getValues();
  
  var rawIds = data.ids || [];
  if (typeof rawIds === "string") {
    try { rawIds = JSON.parse(rawIds); } catch(e) { rawIds = rawIds.split(","); }
  }
  if (!Array.isArray(rawIds) && data.id) rawIds = [data.id];
  
  var idSet = {};
  for (var k = 0; k < rawIds.length; k++) {
    idSet[String(rawIds[k]).trim()] = true;
  }
  
  var count = 0;
  // Loop dari baris paling bawah ke atas agar indeks baris tidak bergeser saat dihapus
  for (var i = rows.length - 1; i >= 1; i--) {
    var rowId = String(rows[i][0]).trim();
    if (idSet[rowId]) {
      sheet.deleteRow(i + 1);
      count++;
    }
  }
  return jsonResponse({ status: "success", message: count + " data presensi berhasil dihapus!", count: count });
}

function handleClearAllAbsen(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet Absensi tidak ditemukan" });
  var rows = sheet.getDataRange().getValues();
  
  var kantorFilter = data.namaKantor ? String(data.namaKantor).trim() : "";
  var start = data.startDate ? String(data.startDate).trim() : "";
  var end = data.endDate ? String(data.endDate).trim() : "";
  
  var count = 0;
  for (var i = rows.length - 1; i >= 1; i--) {
    var rowKantor = String(rows[i][9] || "").trim(); // Kolom ke-10 (indeks 9) adalah Nama Kantor
    var rowTime = String(rows[i][1] || "").trim(); // Kolom ke-2 (indeks 1) adalah Waktu
    var rowDate = rowTime.length >= 10 ? rowTime.slice(0, 10) : "";
    
    var matchKantor = (!kantorFilter || kantorFilter === "Semua" || kantorFilter === "Semua Unit Kantor Desa" || rowKantor === kantorFilter);
    var matchDate = true;
    if (start && end && rowDate) {
      matchDate = (rowDate >= start && rowDate <= end);
    }
    
    if (matchKantor && matchDate) {
      sheet.deleteRow(i + 1);
      count++;
    }
  }
  return jsonResponse({ status: "success", message: count + " data presensi berhasil dibersihkan!", count: count });
}

// =========================================================================
// HANDLER: IZIN & CUTI - Simpan, Update Status, Ambil, Hapus
// =========================================================================
function handleSaveLeave(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("IzinCuti");
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName("IzinCuti");
  }
  
  var id = data.id || ("LEAVE-" + new Date().getTime());
  var suratVal = (data.surat || "").toString();
  if (suratVal.length > 45000) suratVal = suratVal.substring(0, 45000);
  
  // Cek apakah sudah ada (update jika ada)
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(id).trim()) {
      // Update existing
      sheet.getRange(i + 1, 3).setValue(data.nik || "");
      sheet.getRange(i + 1, 4).setValue(data.nama || "");
      sheet.getRange(i + 1, 5).setValue(data.namaKantor || "");
      sheet.getRange(i + 1, 6).setValue(data.tipe || "");
      sheet.getRange(i + 1, 7).setValue(data.tglMulai || "");
      sheet.getRange(i + 1, 8).setValue(data.tglSelesai || "");
      sheet.getRange(i + 1, 9).setValue(data.alasan || "");
      sheet.getRange(i + 1, 10).setValue(suratVal);
      sheet.getRange(i + 1, 11).setValue(data.status || "Menunggu Persetujuan");
      sheet.getRange(i + 1, 12).setValue(data.catatanAdmin || "");
      sheet.getRange(i + 1, 13).setValue(data.divalidasiOleh || "");
      return jsonResponse({ status: "success", message: "Data izin/cuti berhasil diperbarui!", id: id });
    }
  }
  
  sheet.appendRow([
    id, 
    new Date(), 
    data.nik || "", 
    data.nama || "", 
    data.namaKantor || "", 
    data.tipe || "", 
    data.tglMulai || "", 
    data.tglSelesai || "", 
    data.alasan || "",
    suratVal,
    data.status || "Menunggu Persetujuan",
    data.catatanAdmin || "",
    data.divalidasiOleh || ""
  ]);
  return jsonResponse({ status: "success", message: "Permohonan izin/cuti berhasil disimpan ke Google Sheets!", id: id });
}

function handleUpdateLeaveStatus(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("IzinCuti");
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet IzinCuti tidak ditemukan" });
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.id).trim()) {
      // Kolom 11: Status, Kolom 12: Catatan Admin, Kolom 13: Divalidasi Oleh
      if (data.status) sheet.getRange(i + 1, 11).setValue(data.status);
      if (data.catatanAdmin !== undefined) sheet.getRange(i + 1, 12).setValue(data.catatanAdmin);
      if (data.divalidasiOleh !== undefined) sheet.getRange(i + 1, 13).setValue(data.divalidasiOleh);
      return jsonResponse({ status: "success", message: "Status permohonan berhasil diperbarui!" });
    }
  }
  return jsonResponse({ status: "error", message: "Data izin/cuti tidak ditemukan!" });
}

function handleGetLeaves(params) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("IzinCuti");
  if (!sheet) return jsonResponse({ status: "success", data: [] });
  var rows = sheet.getDataRange().getValues();
  var result = [];
  
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var row = {
      id: String(rows[i][0]),
      timestamp: rows[i][1] ? new Date(rows[i][1]).toISOString() : "",
      nik: String(rows[i][2] || ""),
      nama: String(rows[i][3] || ""),
      namaKantor: String(rows[i][4] || ""),
      tipe: String(rows[i][5] || ""),
      tglMulai: String(rows[i][6] || ""),
      tglSelesai: String(rows[i][7] || ""),
      alasan: String(rows[i][8] || ""),
      surat: String(rows[i][9] || ""),
      status: String(rows[i][10] || "Menunggu Persetujuan"),
      catatanAdmin: String(rows[i][11] || ""),
      divalidasiOleh: String(rows[i][12] || "")
    };
    
    if (params && params.role === "user" && params.nik && row.nik !== params.nik) {
      continue;
    }
    if (params && params.role === "admin_desa" && params.namaKantor && row.namaKantor !== params.namaKantor) {
      continue;
    }
    result.push(row);
  }
  return jsonResponse({ status: "success", data: result });
}

function handleDeleteLeave(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("IzinCuti");
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet IzinCuti tidak ditemukan" });
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.id).trim()) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success", message: "Permohonan izin/cuti berhasil dihapus!" });
    }
  }
  return jsonResponse({ status: "error", message: "Data tidak ditemukan!" });
}

// =========================================================================
// HANDLER: LAPORAN REKAPITULASI
// =========================================================================
function handleSaveLaporan(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Laporan");
  if (!sheet) {
    sheet = ss.insertSheet("Laporan");
    sheet.appendRow(["ID", "Waktu Presensi", "NIK", "Nama Pegawai", "Jabatan", "Unit Kantor Desa", "Tipe Kehadiran", "Status Lokasi", "Keterangan", "Tanggal Dibuat"]);
  }
  
  var rows = data.records || [];
  if (typeof rows === "string") {
    try { rows = JSON.parse(rows); } catch(e) { rows = []; }
  }
  
  var nowStr = new Date().toISOString();
  var added = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    sheet.appendRow([
      r.id || ("LAP-" + new Date().getTime() + "-" + i),
      r.timestamp || "",
      r.nik || "",
      r.nama || "",
      r.jabatan || "",
      r.namaKantor || "",
      r.tipe || "",
      r.statusLokasi || "",
      r.keterangan || "",
      nowStr
    ]);
    added++;
  }
  return jsonResponse({ status: "success", message: added + " baris laporan berhasil disimpan ke Sheet Laporan!", count: added });
}

function handleGetLaporan(p) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Laporan");
  if (!sheet) return jsonResponse({ status: "success", data: [] });
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var rowKantor = rows[i][5] || "";
    if (p && p.role === "admin_desa" && p.namaKantor && rowKantor !== p.namaKantor) continue;
    result.push({
      id: rows[i][0],
      timestamp: rows[i][1],
      nik: rows[i][2],
      nama: rows[i][3],
      jabatan: rows[i][4],
      namaKantor: rows[i][5],
      tipe: rows[i][6],
      statusLokasi: rows[i][7],
      keterangan: rows[i][8],
      created_at: rows[i][9]
    });
  }
  return jsonResponse({ status: "success", data: result });
}

function handleClearLaporan(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Laporan");
  if (sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  }
  return jsonResponse({ status: "success", message: "Sheet Laporan berhasil dibersihkan!" });
}

// =========================================================================
// HANDLER: REKAP ABSENSI (getRekap)
// =========================================================================
function getRekap(role, nik, namaKantor) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  var rows = sheet.getDataRange().getValues();
  var result = [];
  
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var rowKantor = rows[i][9] || "";
    
    if (role === "user" && rows[i][2] != nik) continue;
    if (role === "admin_desa" && namaKantor !== "Semua Kantor" && rowKantor !== namaKantor) continue;
    
    result.push({
      id: rows[i][0],
      timestamp: rows[i][1],
      nik: rows[i][2],
      nama: rows[i][3],
      jabatan: rows[i][4] || "-",
      tipe: rows[i][5],
      statusLokasi: rows[i][6],
      foto: rows[i][7] || "",
      latLon: rows[i][8],
      namaKantor: rowKantor,
      keterangan: rows[i][10] || "",
      lampiranSpt: rows[i][11] || ""
    });
  }
  return jsonResponse({ status: "success", data: result });
}

// =========================================================================
// HANDLER: JADWAL KERJA (Super Admin) - Simpan & Ambil
// =========================================================================
function handleSaveWorkSchedule(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("JadwalKerja");
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName("JadwalKerja");
  }

  // Clear dan tulis ulang
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  var activeDaysStr = data.activeDays || "[1,2,3,4,5]";
  if (typeof activeDaysStr !== "string") {
    activeDaysStr = JSON.stringify(activeDaysStr);
  }

  sheet.appendRow(["activeDays", activeDaysStr]);
  sheet.appendRow(["todayManualOverride", data.todayManualOverride || ""]);
  sheet.appendRow(["lastOverrideDate", data.lastOverrideDate || ""]);

  return jsonResponse({ status: "success", message: "Jadwal kerja berhasil disimpan ke Google Sheets!" });
}

function handleGetWorkSchedule() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("JadwalKerja");
  if (!sheet) return jsonResponse({ status: "success", data: { activeDays: [1,2,3,4,5], todayManualOverride: null, lastOverrideDate: "" } });

  var rows = sheet.getDataRange().getValues();
  var result = {
    activeDays: [1, 2, 3, 4, 5],
    todayManualOverride: null,
    lastOverrideDate: ""
  };

  for (var i = 1; i < rows.length; i++) {
    var key = String(rows[i][0]).trim();
    var val = String(rows[i][1] || "").trim();

    if (key === "activeDays") {
      try {
        result.activeDays = JSON.parse(val);
      } catch(e) {
        result.activeDays = [1, 2, 3, 4, 5];
      }
    } else if (key === "todayManualOverride") {
      result.todayManualOverride = val || null;
    } else if (key === "lastOverrideDate") {
      result.lastOverrideDate = val || "";
    }
  }

  return jsonResponse({ status: "success", data: result });
}

// =========================================================================
// HANDLER: HARI LIBUR (Super Admin) - Simpan, Hapus, Ambil, Reset
// =========================================================================
function handleSaveHoliday(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("HariLibur");
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName("HariLibur");
  }

  var id = data.id || ("HOL-" + new Date().getTime());
  var rows = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < rows.length; i++) {
    // Match berdasarkan ID atau tanggal yang sama
    if (String(rows[i][0]).trim() === String(id).trim() || String(rows[i][1]).trim() === String(data.tanggal).trim()) {
      sheet.getRange(i + 1, 1).setValue(id);
      sheet.getRange(i + 1, 2).setValue(data.tanggal || "");
      sheet.getRange(i + 1, 3).setValue(data.nama || "");
      sheet.getRange(i + 1, 4).setValue(data.tipe || "Libur Khusus");
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([id, data.tanggal || "", data.nama || "", data.tipe || "Libur Khusus"]);
  }

  return jsonResponse({ status: "success", message: "Hari libur berhasil disimpan!", id: id });
}

function handleDeleteHoliday(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("HariLibur");
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet HariLibur tidak ditemukan" });
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.id).trim()) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success", message: "Hari libur berhasil dihapus!" });
    }
  }
  return jsonResponse({ status: "error", message: "Data hari libur tidak ditemukan!" });
}

function handleGetHolidays() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("HariLibur");
  if (!sheet) return jsonResponse({ status: "success", data: [] });
  var rows = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0] && !rows[i][1]) continue;
    result.push({
      id: String(rows[i][0] || ""),
      tanggal: String(rows[i][1] || ""),
      nama: String(rows[i][2] || ""),
      tipe: String(rows[i][3] || "Libur Nasional")
    });
  }
  return jsonResponse({ status: "success", data: result });
}

function handleResetHolidays(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("HariLibur");
  if (sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  } else {
    sheet = ss.insertSheet("HariLibur");
    sheet.appendRow(["ID", "Tanggal", "Nama Hari Libur", "Tipe"]);
  }

  // Isi ulang dengan default
  var defaultHolidays = [
    ["HOL-2026-01", "2026-01-01", "Tahun Baru 2026 Masehi", "Libur Nasional"],
    ["HOL-2026-02", "2026-01-16", "Isra Mi'raj Nabi Muhammad SAW", "Libur Nasional"],
    ["HOL-2026-03", "2026-02-17", "Tahun Baru Imlek 2577 Kongzili", "Libur Nasional"],
    ["HOL-2026-04", "2026-03-20", "Hari Raya Idul Fitri 1447 H (Hari ke-1)", "Libur Nasional"],
    ["HOL-2026-05", "2026-03-21", "Hari Raya Idul Fitri 1447 H (Hari ke-2)", "Libur Nasional"],
    ["HOL-2026-06", "2026-03-23", "Cuti Bersama Idul Fitri 1447 H", "Cuti Bersama"],
    ["HOL-2026-07", "2026-03-24", "Cuti Bersama Idul Fitri 1447 H", "Cuti Bersama"],
    ["HOL-2026-08", "2026-03-31", "Hari Suci Nyepi (Tahun Baru Saka 1948)", "Libur Nasional"],
    ["HOL-2026-09", "2026-04-03", "Wafat Isa Almasih", "Libur Nasional"],
    ["HOL-2026-10", "2026-05-01", "Hari Buruh Internasional", "Libur Nasional"],
    ["HOL-2026-11", "2026-05-14", "Kenaikan Isa Almasih", "Libur Nasional"],
    ["HOL-2026-12", "2026-05-27", "Hari Raya Idul Adha 1447 H", "Libur Nasional"],
    ["HOL-2026-13", "2026-05-31", "Hari Raya Waisak 2570 BE", "Libur Nasional"],
    ["HOL-2026-14", "2026-06-01", "Hari Lahir Pancasila", "Libur Nasional"],
    ["HOL-2026-15", "2026-06-16", "Tahun Baru Islam 1448 H", "Libur Nasional"],
    ["HOL-2026-16", "2026-08-17", "Hari Proklamasi Kemerdekaan RI", "Libur Nasional"],
    ["HOL-2026-17", "2026-08-25", "Maulid Nabi Muhammad SAW", "Libur Nasional"],
    ["HOL-2026-18", "2026-12-25", "Hari Raya Natal", "Libur Nasional"]
  ];
  for (var h = 0; h < defaultHolidays.length; h++) {
    sheet.appendRow(defaultHolidays[h]);
  }

  return jsonResponse({ status: "success", message: "Daftar hari libur berhasil direset ke default!" });
}
