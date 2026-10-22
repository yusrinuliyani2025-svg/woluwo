/**
 * =========================================================================
 * APLIKASI ABSENSI DESA "Woluwo" - BACKEND GOOGLE APPS SCRIPT (Kode.gs)
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

// Inisialisasi otomatis lembar kerja jika belum ada
function initSheets() {
  var ss = getSpreadsheet();
  
  // Sheet Users
  if (!ss.getSheetByName("Users")) {
    var shUser = ss.insertSheet("Users");
    shUser.appendRow(["NIK", "Password", "Nama Lengkap", "Jabatan", "Role", "Nama Kantor", "Foto", "No HP"]);
    shUser.appendRow(["198501012010011001", "admin", "Drs. Hendra Puluhulawa, M.Si", "Super Administrator Wilayah", "super_admin", "Kantor Camat Botumoito", "", "081234567890"]);
    shUser.appendRow(["199002022015021002", "admin", "Fahri Hasan, S.IP", "Admin Desa Botumoito", "admin_desa", "Kantor Desa Botumoito", "", "081234567891"]);
    shUser.appendRow(["7501020304050001", "user", "Harry Potter", "Kaur Keuangan", "user", "Kantor Desa Botumoito", "", "081234567892"]);
  }
  
  // Sheet Config (Lokasi & Jam Kerja)
  if (!ss.getSheetByName("Config")) {
    var shCfg = ss.insertSheet("Config");
    shCfg.appendRow(["ID", "Nama Kantor", "Latitude", "Longitude", "Radius", "Jam Masuk", "Jam Pulang"]);
    shCfg.appendRow(["KANTOR-001", "Kantor Camat Botumoito", "'0.536780", "'122.259810", 100, "08:00", "16:00"]);
    shCfg.appendRow(["KANTOR-002", "Kantor Desa Botumoito", "'0.538120", "'122.261200", 80, "08:00", "16:00"]);
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
}

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
    
    if (action === "login") return handleLogin(data);
    if (action === "absen") return handleAbsen(data);
    if (action === "syncBatch") return handleBatchAbsen(data);
    if (action === "saveKantor") return handleSaveKantor(data);
    if (action === "deleteKantor") return handleDeleteKantor(data);
    if (action === "koreksiAbsen") return handleKoreksiAbsen(data);
    if (action === "deleteAbsen") return handleDeleteAbsen(data);
    if (action === "deleteMultipleAbsen") return handleDeleteMultipleAbsen(data);
    if (action === "clearAllAbsen") return handleClearAllAbsen(data);
    if (action === "saveUser") return handleSaveUser(data);
    if (action === "deleteUser") return handleDeleteUser(data);
    if (action === "saveLeave") return handleSaveLeave(data);
    if (action === "updateLeaveStatus") return handleUpdateLeaveStatus(data);
    if (action === "deleteLeave") return handleDeleteLeave(data);
    if (action === "saveLaporan") return handleSaveLaporan(data);
    if (action === "getLaporan") return handleGetLaporan(data);
    if (action === "clearLaporan") return handleClearLaporan(data);
    
    return jsonResponse({ status: "error", message: "Action tidak dikenali: " + action });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  try {
    initSheets();
    var p = (e && e.parameter) ? e.parameter : {};
    var action = p.action;
    
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
    if (action === "getLeaves") return handleGetLeaves(p);
    if (action === "deleteLeave") return handleDeleteLeave(p);
    if (action === "saveLaporan") return handleSaveLaporan(p);
    if (action === "getLaporan") return handleGetLaporan(p);
    if (action === "clearLaporan") return handleClearLaporan(p);
    if (action === "getRekap") return getRekap(p.role, p.nik, p.namaKantor);
    if (action === "getConfig") return getConfigList();
    if (action === "getUsers") return getUsers();
    if (action === "getInfo") {
      var ss = getSpreadsheet();
      return jsonResponse({ status: "success", sheetId: ss.getId(), sheetName: ss.getName(), sheetUrl: ss.getUrl() });
    }
    
    return jsonResponse({ status: "success", message: "Server Woluwo Aktif Siap Digunakan!" });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

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
        namaKantor: rows[i][5] || "-"
      });
    }
  }
  return jsonResponse({ status: "error", message: "NIK atau Password salah!" });
}

function getUsers() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  var rows = sheet.getDataRange().getValues();
  var users = [];
  
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    users.push({
      nik: rows[i][0],
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
    sheet.appendRow([data.nik, data.password, data.nama, data.jabatan, data.role, data.namaKantor, fotoVal, data.noHp || ""]);
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
    var newId = "KANTOR-" + new Date().getTime();
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
  for (var i = 0; i < list.length; i++) {
    var rec = list[i];
    var fotoVal = (rec.foto || "").toString();
    if (fotoVal.length > 45000) fotoVal = fotoVal.substring(0, 45000);
    var sptVal = (rec.lampiranSpt || rec.spt || "").toString();
    if (sptVal.length > 45000) sptVal = sptVal.substring(0, 45000);

    sheet.appendRow([
      rec.id || ("ABS-" + new Date().getTime() + "-" + i),
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
  }
  return jsonResponse({ status: "success", message: list.length + " data absensi berhasil disinkronkan!" });
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

function handleSaveLeave(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("IzinCuti");
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName("IzinCuti");
  }
  var id = data.id || ("LEAVE-" + new Date().getTime());
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
    data.surat || "",
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
