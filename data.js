// Mo'eeya - Data Layer & Persistence Store with Google Sheets Cloud Sync
const STORAGE_PREFIX = "mo_eeya_v3_"; // Fresh storage version to clear old dummy data
const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx_Ze0Ad1BRimxDFy836mAEw0ZxOPOfav1yW_3ZR5EIsZFmNkUBz-9Upxp77pArUyDN/exec";

// Default Avatar SVG Data URI (Neutral Icon - No hardcoded photos)
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b' width='120' height='120'><rect width='100%25' height='100%25' fill='%23e2e8f0'/><circle cx='12' cy='8' r='4' fill='%2394a3b8'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6' fill='%2394a3b8'/></svg>";

// Cloud & Local MySQL API Manager
const API = {
  getUrl: function() {
    const isHttp = typeof window !== "undefined" && window.location && window.location.protocol.startsWith("http");
    const saved = localStorage.getItem("mo_eeya_webapp_url");
    
    // Jika aplikasi dijalankan di web server (XAMPP / Apache / localhost):
    // Prioritaskan MySQL api.php secara otomatis agar semua penyimpanan langsung masuk ke database MySQL
    if (isHttp) {
      if (!saved || saved.includes("script.google.com") || saved === "api.php") {
        const path = window.location.pathname;
        const dir = path.substring(0, path.lastIndexOf('/') + 1);
        return window.location.origin + dir + "api.php";
      }
      return saved.trim();
    }
    if (saved && saved.trim() !== "") {
      return saved.trim();
    }
    return "api.php";
  },
  isMySql: function() {
    const url = this.getUrl();
    return url.includes("api.php") || url.includes("localhost") || url.includes("127.0.0.1");
  },
  setUrl: function(url) {
    if (url && url.trim() !== "") {
      localStorage.setItem("mo_eeya_webapp_url", url.trim());
    } else {
      localStorage.removeItem("mo_eeya_webapp_url");
    }
  },
  post: async function(payload) {
    const url = this.getUrl();
    if (!url) return null;
    
    // 1. Coba fetch POST standar (JSON)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      try {
        const data = await res.json();
        return data;
      } catch (e) {
        return { status: "success" };
      }
    } catch (err) {
      // 2. Fallback no-cors jika fetch biasa diblokir CORS (khusus Google Apps Script jika dibuka via file://)
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        return { status: "success", note: "Sent via no-cors fallback" };
      } catch (err2) {
        // 3. Fallback GET jika payload memungkinkan (misal foto dipangkas)
        try {
          const smallPayload = { ...payload };
          if (smallPayload.foto && smallPayload.foto.length > 500) {
            smallPayload.foto = ""; // Hindari URL kepanjangan di GET
          }
          const q = new URLSearchParams(smallPayload).toString();
          await fetch(`${url}?${q}`, { mode: 'no-cors' });
          return { status: "success", note: "Sent via GET fallback" };
        } catch(err3) {
          console.warn("Sync POST Error all attempts:", err3);
          return null;
        }
      }
    }
  },
  get: async function(action, params = {}) {
    const url = this.getUrl();
    if (!url) return null;
    try {
      const q = new URLSearchParams({ action, ...params }).toString();
      const res = await fetch(`${url}?${q}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn("Sync GET Error:", err);
      return null;
    }
  }
};

// Data Kantor Desa dikosongkan secara default (Super Admin yang akan menambahkannya)
const DEFAULT_OFFICES = [];

// Data Pegawai dikosongkan, HANYA Super Admin yang aktif secara default
const DEFAULT_USERS = [
  {
    nik: "198501012010011001",
    nama: "Super Admin",
    password: "admin",
    jabatan: "Super Administrator",
    role: "super_admin",
    namaKantor: "Kantor Camat Botumoito",
    noHp: "",
    foto: "" // Menggunakan icon default
  }
];

// Riwayat Absensi awal dikosongkan
const DEFAULT_ATTENDANCE = [];

// Pengaturan Jadwal Hari Kerja Default (1: Senin s/d 5: Jumat aktif)
const DEFAULT_WORK_SCHEDULE = {
  activeDays: [1, 2, 3, 4, 5], // Senin - Jumat
  todayManualOverride: null,   // null (sesuai jadwal), 'holiday' (diliburkan hari ini), 'work' (dipaksa hari kerja)
  lastOverrideDate: ""
};

// Daftar Hari Libur Nasional & Khusus Default
const DEFAULT_HOLIDAYS = [
  { id: "HOL-2026-01", tanggal: "2026-01-01", nama: "Tahun Baru 2026 Masehi", tipe: "Libur Nasional" },
  { id: "HOL-2026-02", tanggal: "2026-01-16", nama: "Isra Mi'raj Nabi Muhammad SAW", tipe: "Libur Nasional" },
  { id: "HOL-2026-03", tanggal: "2026-02-17", nama: "Tahun Baru Imlek 2577 Kongzili", tipe: "Libur Nasional" },
  { id: "HOL-2026-04", tanggal: "2026-03-20", nama: "Hari Raya Idul Fitri 1447 H (Hari ke-1)", tipe: "Libur Nasional" },
  { id: "HOL-2026-05", tanggal: "2026-03-21", nama: "Hari Raya Idul Fitri 1447 H (Hari ke-2)", tipe: "Libur Nasional" },
  { id: "HOL-2026-06", tanggal: "2026-03-23", nama: "Cuti Bersama Idul Fitri 1447 H", tipe: "Cuti Bersama" },
  { id: "HOL-2026-07", tanggal: "2026-03-24", nama: "Cuti Bersama Idul Fitri 1447 H", tipe: "Cuti Bersama" },
  { id: "HOL-2026-08", tanggal: "2026-03-31", nama: "Hari Suci Nyepi (Tahun Baru Saka 1948)", tipe: "Libur Nasional" },
  { id: "HOL-2026-09", tanggal: "2026-04-03", nama: "Wafat Isa Almasih", tipe: "Libur Nasional" },
  { id: "HOL-2026-10", tanggal: "2026-05-01", nama: "Hari Buruh Internasional", tipe: "Libur Nasional" },
  { id: "HOL-2026-11", tanggal: "2026-05-14", nama: "Kenaikan Isa Almasih", tipe: "Libur Nasional" },
  { id: "HOL-2026-12", tanggal: "2026-05-27", nama: "Hari Raya Idul Adha 1447 H", tipe: "Libur Nasional" },
  { id: "HOL-2026-13", tanggal: "2026-05-31", nama: "Hari Raya Waisak 2570 BE", tipe: "Libur Nasional" },
  { id: "HOL-2026-14", tanggal: "2026-06-01", nama: "Hari Lahir Pancasila", tipe: "Libur Nasional" },
  { id: "HOL-2026-15", tanggal: "2026-06-16", nama: "Tahun Baru Islam 1448 H", tipe: "Libur Nasional" },
  { id: "HOL-2026-16", tanggal: "2026-08-17", nama: "Hari Proklamasi Kemerdekaan RI", tipe: "Libur Nasional" },
  { id: "HOL-2026-17", tanggal: "2026-08-25", nama: "Maulid Nabi Muhammad SAW", tipe: "Libur Nasional" },
  { id: "HOL-2026-18", tanggal: "2026-12-25", nama: "Hari Raya Natal", tipe: "Libur Nasional" }
];

const DB = {
  getOffices: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "offices");
    if (!data) {
      localStorage.setItem(STORAGE_PREFIX + "offices", JSON.stringify(DEFAULT_OFFICES));
      return DEFAULT_OFFICES;
    }
    return JSON.parse(data);
  },
  saveOffice: function(office) {
    let offices = this.getOffices();
    const idx = offices.findIndex(o => o.id === office.id);
    if (idx >= 0) {
      offices[idx] = { ...offices[idx], ...office };
    } else {
      office.id = office.id || "KANTOR-" + Date.now();
      offices.push(office);
    }
    localStorage.setItem(STORAGE_PREFIX + "offices", JSON.stringify(offices));

    // Kirim sinkronisasi ke Google Spreadsheet di latar belakang
    API.post({
      action: "saveKantor",
      id: office.id,
      namaKantor: office.namaKantor,
      lat: office.lat,
      lng: office.lng,
      radius: office.radius,
      jamMasuk: office.jamMasuk || "08:00",
      jamPulang: office.jamPulang || "16:00"
    });

    return offices;
  },
  deleteOffice: function(id) {
    let offices = this.getOffices().filter(o => o.id !== id);
    localStorage.setItem(STORAGE_PREFIX + "offices", JSON.stringify(offices));
    
    // Sinkronisasi hapus ke Google Spreadsheet
    API.post({ action: "deleteKantor", id: id });
    return offices;
  },
  getUsers: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "users");
    if (!data) {
      localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    let users = JSON.parse(data);
    let changed = false;
    users = users.map(u => {
      if (u.foto && u.foto.includes("unsplash.com")) {
        u.foto = "";
        changed = true;
      }
      return u;
    });
    if (changed) {
      localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(users));
    }
    return users;
  },
  saveUser: function(user) {
    let users = this.getUsers();
    const idx = users.findIndex(u => String(u.nik) === String(user.nik));
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(users));

    // Kirim sinkronisasi otomatis ke Google Spreadsheet!
    API.post({
      action: "saveUser",
      nik: user.nik,
      password: user.password || "123456",
      nama: user.nama,
      jabatan: user.jabatan,
      role: user.role,
      namaKantor: user.namaKantor,
      foto: user.foto || "",
      noHp: user.noHp || ""
    }).then(res => {
      if (res && res.status === 'success') {
        console.log("✓ Pengguna tersinkronisasi ke Google Sheets:", user.nama);
      }
    });

    return users;
  },
  deleteUser: function(nik) {
    let users = this.getUsers().filter(u => String(u.nik) !== String(nik));
    localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(users));

    // Sinkronisasi hapus ke Google Spreadsheet
    API.post({ action: "deleteUser", nik: nik });
    return users;
  },
  getAttendance: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "attendance");
    if (!data) {
      localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(DEFAULT_ATTENDANCE));
      return DEFAULT_ATTENDANCE;
    }
    let att = JSON.parse(data);
    let changed = false;
    att = att.map(r => {
      if (r.foto && r.foto.includes("unsplash.com")) {
        r.foto = "";
        changed = true;
      }
      return r;
    });
    if (changed) {
      localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));
    }
    return att;
  },
  addAttendance: async function(record) {
    let att = this.getAttendance();
    record.id = record.id || "ABS-" + Date.now();
    record.timestamp = record.timestamp || new Date().toISOString();
    record.lampiranSpt = record.lampiranSpt || "";
    att.unshift(record);
    localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));

    // Sinkronisasi presensi langsung ke Google Spreadsheet secara real-time
    let fotoPayload = record.foto || "";
    if (fotoPayload.length > 45000) fotoPayload = fotoPayload.substring(0, 45000);
    let sptPayload = record.lampiranSpt || "";
    if (sptPayload.length > 45000) sptPayload = sptPayload.substring(0, 45000);

    const res = await API.post({
      action: "absen",
      id: record.id,
      timestamp: record.timestamp,
      nik: record.nik,
      nama: record.nama,
      jabatan: record.jabatan,
      tipe: record.tipe,
      statusLokasi: record.statusLokasi,
      foto: fotoPayload,
      latLon: record.latLon,
      namaKantor: record.namaKantor,
      keterangan: record.keterangan || "Presensi Mandiri",
      lampiranSpt: sptPayload
    });

    return { record, cloudResult: res };
  },
  updateAttendance: function(id, updateData) {
    let att = this.getAttendance();
    const idx = att.findIndex(a => a.id === id);
    if (idx >= 0) {
      att[idx] = { ...att[idx], ...updateData };
      localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));

      // Sinkronisasi koreksi ke Google Spreadsheet
      API.post({
        action: "koreksiAbsen",
        id: id,
        timestamp: updateData.timestamp || att[idx].timestamp,
        tipeBaru: updateData.tipe,
        statusLokasi: updateData.statusLokasi || att[idx].statusLokasi,
        keterangan: updateData.keterangan || "Dikoreksi Admin"
      });

      return att[idx];
    }
    return null;
  },
  deleteAttendance: function(id) {
    let att = this.getAttendance().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));

    // Sinkronisasi hapus presensi ke Google Spreadsheet
    API.post({
      action: "deleteAbsen",
      id: id
    });

    return att;
  },
  deleteMultipleAttendance: function(ids) {
    if (!ids || ids.length === 0) return this.getAttendance();
    const idSet = new Set(ids.map(String));
    let att = this.getAttendance().filter(a => !idSet.has(String(a.id)));
    localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));

    // Sinkronisasi hapus batch ke Google Spreadsheet
    API.post({
      action: "deleteMultipleAbsen",
      ids: ids
    }).catch(e => console.warn("deleteMultipleAbsen err:", e));

    // Fallback individual deletes untuk memastikan data terhapus di backend lama
    if (ids.length <= 25) {
      ids.forEach(id => {
        API.post({ action: "deleteAbsen", id: id }).catch(() => {});
      });
    }

    return att;
  },
  getDeletedAbsents: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "deleted_absents");
    return data ? JSON.parse(data) : [];
  },
  addDeletedAbsent: function(id) {
    let list = this.getDeletedAbsents();
    const sId = String(id);
    if (!list.includes(sId)) {
      list.push(sId);
      localStorage.setItem(STORAGE_PREFIX + "deleted_absents", JSON.stringify(list));
    }
  },
  addDeletedAbsents: function(ids) {
    let list = this.getDeletedAbsents();
    ids.forEach(id => {
      const sId = String(id);
      if (!list.includes(sId)) list.push(sId);
    });
    localStorage.setItem(STORAGE_PREFIX + "deleted_absents", JSON.stringify(list));
  },
  clearDeletedAbsents: function() {
    localStorage.removeItem(STORAGE_PREFIX + "deleted_absents");
  },
  deleteAllAttendance: function(filterOptions = {}) {
    let att = this.getAttendance();
    const { namaKantor, startDate, endDate } = filterOptions;

    const deletedIds = [];
    att = att.filter(a => {
      let matchKantor = true;
      if (namaKantor && namaKantor !== "Semua" && namaKantor !== "Semua Unit Kantor Desa") {
        matchKantor = (a.namaKantor === namaKantor);
      }
      let matchDate = true;
      if (startDate && endDate) {
        const d = a.timestamp ? a.timestamp.slice(0, 10) : "";
        matchDate = (d >= startDate && d <= endDate);
      }
      const shouldDelete = matchKantor && matchDate;
      if (shouldDelete && a.id) {
        deletedIds.push(a.id);
      }
      return !shouldDelete;
    });

    localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));

    // Sinkronisasi hapus semua presensi ke Google Spreadsheet
    API.post({
      action: "clearAllAbsen",
      namaKantor: namaKantor || "",
      startDate: startDate || "",
      endDate: endDate || ""
    }).catch(e => console.warn("clearAllAbsen err:", e));

    if (deletedIds.length > 0 && deletedIds.length <= 25) {
      deletedIds.forEach(id => {
        API.post({ action: "deleteAbsen", id: id }).catch(() => {});
      });
    }

    return att;
  },
  getLeaves: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "leaves");
    return data ? JSON.parse(data) : [];
  },
  addLeave: function(leave) {
    let leaves = this.getLeaves();
    leave.id = leave.id || ("LEAVE-" + Date.now());
    leave.created_at = leave.created_at || new Date().toISOString();
    leave.status = leave.status || "Menunggu Persetujuan";
    leaves.unshift(leave);
    localStorage.setItem(STORAGE_PREFIX + "leaves", JSON.stringify(leaves));

    // Sinkronisasi izin/cuti ke Google Spreadsheet
    API.post({
      action: "saveLeave",
      id: leave.id,
      nik: leave.nik,
      nama: leave.nama,
      namaKantor: leave.namaKantor,
      tipe: leave.tipe,
      tglMulai: leave.tglMulai,
      tglSelesai: leave.tglSelesai,
      alasan: leave.alasan,
      surat: leave.surat || "",
      status: leave.status,
      catatanAdmin: leave.catatanAdmin || "",
      divalidasiOleh: leave.divalidasiOleh || ""
    }).catch(e => console.warn("saveLeave post err:", e));

    return leave;
  },
  updateLeaveStatus: function(id, newStatus, catatanAdmin = "", adminName = "") {
    let leaves = this.getLeaves();
    const idx = leaves.findIndex(l => l.id === id);
    if (idx >= 0) {
      leaves[idx].status = newStatus;
      leaves[idx].catatanAdmin = catatanAdmin;
      leaves[idx].divalidasiOleh = adminName;
      leaves[idx].waktuValidasi = new Date().toISOString();
      localStorage.setItem(STORAGE_PREFIX + "leaves", JSON.stringify(leaves));

      // Jika Disetujui, buat/perbarui rekaman presensi dispensasi resmi di DB.attendance
      if (newStatus === "Disetujui") {
        const l = leaves[idx];
        const dStart = new Date(l.tglMulai);
        const dEnd = new Date(l.tglSelesai);
        
        for (let cur = new Date(dStart); cur <= dEnd; cur.setDate(cur.getDate() + 1)) {
          if (cur.getDay() === 0) continue; // Lewati Minggu
          const curDateStr = cur.toISOString().slice(0, 10);
          
          let att = this.getAttendance();
          const existingIdx = att.findIndex(a => String(a.nik) === String(l.nik) && a.timestamp && a.timestamp.slice(0, 10) === curDateStr);
          
          const attEntry = {
            id: `DISP-${l.nik}-${curDateStr}`,
            timestamp: `${curDateStr}T08:00:00`,
            nik: l.nik,
            nama: l.nama,
            jabatan: l.jabatan || "-",
            namaKantor: l.namaKantor,
            tipe: `${l.tipe} (Disetujui)`,
            statusLokasi: "Dispensasi Izin/Cuti Resmi",
            latLon: "-",
            foto: l.surat || "",
            keterangan: `${l.tipe}: ${l.alasan || '-'}${catatanAdmin ? ' (' + catatanAdmin + ')' : ''}`
          };
          
          if (existingIdx >= 0) {
            att[existingIdx] = { ...att[existingIdx], ...attEntry };
          } else {
            att.unshift(attEntry);
          }
          localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));
        }
      }

      // Sinkronisasi pembaruan status ke Google Spreadsheet
      API.post({
        action: "updateLeaveStatus",
        id: id,
        status: newStatus,
        catatanAdmin: catatanAdmin,
        divalidasiOleh: adminName
      }).catch(e => console.warn("updateLeaveStatus post err:", e));

      return leaves[idx];
    }
    return null;
  },
  deleteLeave: function(id) {
    let leaves = this.getLeaves().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_PREFIX + "leaves", JSON.stringify(leaves));
    API.post({ action: "deleteLeave", id: id }).catch(e => console.warn(e));
    return leaves;
  },

  // -------------------------------------------------------------
  // FITUR KOREKSI PRESENSI (KENDALA SINYAL / MATI LISTRIK)
  // -------------------------------------------------------------
  getPengajuanKoreksi: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "koreksi_presensi");
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch(e) {
      return [];
    }
  },
  savePengajuanKoreksi: async function(item) {
    let list = this.getPengajuanKoreksi();
    item.id = item.id || "KOR-" + Date.now();
    item.waktuPengajuan = item.waktuPengajuan || new Date().toISOString();
    item.status = item.status || "Menunggu Validasi";
    item.buktiScreenshot = item.buktiScreenshot || "";
    list.unshift(item);
    localStorage.setItem(STORAGE_PREFIX + "koreksi_presensi", JSON.stringify(list));

    // Langsung simpan ke Database MySQL (api.php)
    let buktiPayload = item.buktiScreenshot;
    const res = await API.post({
      action: "savePengajuanKoreksi",
      id: item.id,
      waktuPengajuan: item.waktuPengajuan,
      waktuPresensi: item.waktuPresensi,
      nik: item.nik,
      nama: item.nama,
      jabatan: item.jabatan || "-",
      namaKantor: item.namaKantor || "-",
      tipe: item.tipe,
      jenisKendala: item.jenisKendala,
      keterangan: item.keterangan || "",
      buktiScreenshot: buktiPayload,
      status: item.status
    });

    return { item, cloudResult: res };
  },
  validasiPengajuanKoreksi: async function(id, status, catatanAdmin = "", adminName = "") {
    let list = this.getPengajuanKoreksi();
    const idx = list.findIndex(k => k.id === id);
    if (idx >= 0) {
      list[idx].status = status;
      list[idx].catatanAdmin = catatanAdmin;
      list[idx].divalidasiOleh = adminName;
      list[idx].divalidasiPada = new Date().toISOString();
      localStorage.setItem(STORAGE_PREFIX + "koreksi_presensi", JSON.stringify(list));

      // Jika Disetujui, otomatis rekam kehadiran di attendance lokal
      if (status === "Disetujui") {
        const k = list[idx];
        const absId = "ABS-KOR-" + Date.now();
        let tipeAbs = k.tipe;
        if (!tipeAbs.includes("Koreksi")) tipeAbs += " (Koreksi)";
        const statusLokasi = `Valid (Koreksi ${k.jenisKendala})`;
        const catatanAbs = `Koreksi Disetujui: ${k.jenisKendala}${k.keterangan ? ' - ' + k.keterangan : ''}${catatanAdmin ? ' [Catatan Admin: ' + catatanAdmin + ']' : ''}`;
        
        const newAtt = {
          id: absId,
          timestamp: k.waktuPresensi,
          nik: k.nik,
          nama: k.nama,
          jabatan: k.jabatan,
          namaKantor: k.namaKantor,
          tipe: tipeAbs,
          statusLokasi: statusLokasi,
          latLon: "-",
          foto: k.buktiScreenshot || "",
          keterangan: catatanAbs,
          lampiranSpt: ""
        };
        let att = this.getAttendance();
        att.unshift(newAtt);
        localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(att));
      }

      // Kirim validasi langsung ke Database MySQL
      const res = await API.post({
        action: "validasiPengajuanKoreksi",
        id: id,
        status: status,
        catatanAdmin: catatanAdmin,
        divalidasiOleh: adminName
      });

      return { record: list[idx], cloudResult: res };
    }
    return null;
  },
  deletePengajuanKoreksi: async function(id) {
    let list = this.getPengajuanKoreksi().filter(k => k.id !== id);
    localStorage.setItem(STORAGE_PREFIX + "koreksi_presensi", JSON.stringify(list));
    await API.post({ action: "deletePengajuanKoreksi", id: id });
    return list;
  },
  saveLaporanToCloud: async function(records) {
    if (!records || records.length === 0) return { status: "error", message: "Tidak ada data laporan untuk disimpan" };
    return await API.post({
      action: "saveLaporan",
      records: records
    });
  },
  getLaporanFromCloud: async function(role = "super_admin", namaKantor = "") {
    return await API.get("getLaporan", { role: role, namaKantor: namaKantor });
  },
  clearLaporanOnCloud: async function() {
    return await API.post({ action: "clearLaporan" });
  },

  // Mengirim seluruh data absensi lokal ke Google Spreadsheet
  pushLocalAttendanceToCloud: async function(showFeedback = true) {
    const att = this.getAttendance();
    if (!att || att.length === 0) {
      if (showFeedback && typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'info',
          title: 'Tidak Ada Data Lokal',
          text: 'Belum ada data presensi tersimpan di aplikasi untuk dikirim ke Google Sheets.'
        });
      }
      return true;
    }

    if (showFeedback && typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Mengirim Data ke Google Sheets...',
        text: `Sedang mengirim ${att.length} data presensi ke spreadsheet...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
    }

    // Coba kirim batch terlebih dahulu jika didukung
    try {
      const batchPayload = att.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        nik: r.nik,
        nama: r.nama,
        jabatan: r.jabatan,
        tipe: r.tipe,
        statusLokasi: r.statusLokasi,
        foto: (r.foto && r.foto.length > 45000) ? r.foto.substring(0, 45000) : (r.foto || ""),
        latLon: r.latLon,
        namaKantor: r.namaKantor,
        keterangan: r.keterangan || "Sinkronisasi Lokal",
        lampiranSpt: (r.lampiranSpt && r.lampiranSpt.length > 45000) ? r.lampiranSpt.substring(0, 45000) : (r.lampiranSpt || "")
      }));

      await API.post({
        action: "syncBatch",
        records: batchPayload
      });
    } catch (bErr) {
      console.warn("Batch sync error, fallback ke single submit:", bErr);
    }

    // Juga kirim satu-persatu untuk memastikan backend lama/baru menerima semua
    let sentCount = 0;
    for (const r of att) {
      try {
        let fotoVal = r.foto || "";
        if (fotoVal.length > 45000) fotoVal = fotoVal.substring(0, 45000);
        let sptVal = r.lampiranSpt || "";
        if (sptVal.length > 45000) sptVal = sptVal.substring(0, 45000);

        await API.post({
          action: "absen",
          id: r.id,
          timestamp: r.timestamp,
          nik: r.nik,
          nama: r.nama,
          jabatan: r.jabatan,
          tipe: r.tipe,
          statusLokasi: r.statusLokasi,
          foto: fotoVal,
          latLon: r.latLon,
          namaKantor: r.namaKantor,
          keterangan: r.keterangan || "Sinkronisasi Lokal",
          lampiranSpt: sptVal
        });
        sentCount++;
      } catch (err) {
        console.warn("Gagal mengirim absen:", r.id, err);
      }
    }

    if (showFeedback && typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Data Berhasil Terkirim!',
        text: `${att.length} riwayat presensi di aplikasi telah berhasil dikirim ke Google Sheets. Database kini terisi!`,
        confirmButtonColor: '#0f172a'
      });
    }
    return true;
  },

  // Sinkronisasi Penuh (Tarik Data dari Google Spreadsheet ke Aplikasi & Gabungkan)
  syncFromCloud: async function(showFeedback = false) {
    try {
      const usersRes = await API.get("getUsers");
      if (usersRes && usersRes.status === "success" && Array.isArray(usersRes.data) && usersRes.data.length > 0) {
        let localUsers = this.getUsers();
        // Gabungkan data dari spreadsheet
        usersRes.data.forEach(cloudUser => {
          const idx = localUsers.findIndex(u => String(u.nik) === String(cloudUser.nik));
          if (idx >= 0) {
            localUsers[idx] = { ...localUsers[idx], ...cloudUser };
          } else {
            localUsers.push({
              nik: cloudUser.nik,
              nama: cloudUser.nama,
              password: cloudUser.password || "user",
              jabatan: cloudUser.jabatan || "-",
              role: cloudUser.role || "user",
              namaKantor: cloudUser.namaKantor || "-",
              foto: cloudUser.foto || "",
              noHp: cloudUser.noHp || ""
            });
          }
        });
        localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(localUsers));
      }

      const cfgRes = await API.get("getConfig");
      if (cfgRes && cfgRes.status === "success" && Array.isArray(cfgRes.data) && cfgRes.data.length > 0) {
        localStorage.setItem(STORAGE_PREFIX + "offices", JSON.stringify(cfgRes.data));
      }

      const attRes = await API.get("getRekap", { role: "super_admin", namaKantor: "Semua Kantor" });
      let localAtt = this.getAttendance();
      
      if (attRes && attRes.status === "success" && Array.isArray(attRes.data)) {
        if (attRes.data.length > 0) {
          // Gabungkan data absensi spreadsheet dan data absensi lokal agar data lokal tidak terhapus
          const merged = [...attRes.data];
          localAtt.forEach(loc => {
            const exists = merged.some(m => m.id === loc.id || (String(m.nik) === String(loc.nik) && String(m.timestamp) === String(loc.timestamp)));
            if (!exists) {
              merged.push(loc);
            }
          });
          localStorage.setItem(STORAGE_PREFIX + "attendance", JSON.stringify(merged));
        } else if (localAtt.length > 0) {
          // Jika di Google Sheets masih KOSONG, kirim otomatis data lokal ke spreadsheet!
          console.log("Database Google Sheets kosong. Mengirimkan data lokal otomatis...");
          this.pushLocalAttendanceToCloud(false);
        }
      }

      // Tarik data izin & cuti dari database
      const leaveRes = await API.get("getLeaves", { role: "super_admin" });
      if (leaveRes && leaveRes.status === "success" && Array.isArray(leaveRes.data)) {
        let localLeaves = this.getLeaves();
        const mergedLeaves = [...leaveRes.data];
        localLeaves.forEach(loc => {
          const exists = mergedLeaves.some(m => m.id === loc.id);
          if (!exists) mergedLeaves.push(loc);
        });
        localStorage.setItem(STORAGE_PREFIX + "leaves", JSON.stringify(mergedLeaves));
      }

      // Tarik data pengajuan koreksi presensi dari database
      const korRes = await API.get("getPengajuanKoreksi", { role: "super_admin" });
      if (korRes && korRes.status === "success" && Array.isArray(korRes.data)) {
        let localKor = this.getPengajuanKoreksi();
        const mergedKor = [...korRes.data];
        localKor.forEach(loc => {
          const exists = mergedKor.some(m => m.id === loc.id);
          if (!exists) mergedKor.push(loc);
        });
        localStorage.setItem(STORAGE_PREFIX + "koreksi_presensi", JSON.stringify(mergedKor));
      }

      if (showFeedback && typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'Database Terhubung & Tersinkron!',
          text: 'Data pegawai, kantor desa, dan absensi berhasil disinkronkan dengan Google Spreadsheet.',
          timer: 2000,
          showConfirmButton: false
        });
      }
      return true;
    } catch(err) {
      console.warn("Gagal sinkronisasi dari Google Sheets:", err);
      if (showFeedback && typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Sinkronisasi',
          text: 'Tidak dapat mengambil data dari URL Google Apps Script. Pastikan URL benar dan status Web App "Anyone" / "Siapa saja".'
        });
      }
      return false;
    }
  },

  // -------------------------------------------------------------
  // PENGATURAN HARI KERJA & HARI LIBUR (SUPER ADMIN)
  // -------------------------------------------------------------
  getWorkSchedule: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "work_schedule");
    if (!data) {
      localStorage.setItem(STORAGE_PREFIX + "work_schedule", JSON.stringify(DEFAULT_WORK_SCHEDULE));
      return { ...DEFAULT_WORK_SCHEDULE };
    }
    try {
      const parsed = JSON.parse(data);
      return {
        activeDays: Array.isArray(parsed.activeDays) ? parsed.activeDays : [1, 2, 3, 4, 5],
        todayManualOverride: parsed.todayManualOverride || null,
        lastOverrideDate: parsed.lastOverrideDate || ""
      };
    } catch(e) {
      return { ...DEFAULT_WORK_SCHEDULE };
    }
  },

  saveWorkSchedule: function(schedule) {
    const cleanSchedule = {
      activeDays: Array.isArray(schedule.activeDays) ? schedule.activeDays : [1, 2, 3, 4, 5],
      todayManualOverride: schedule.todayManualOverride || null,
      lastOverrideDate: schedule.lastOverrideDate || ""
    };
    localStorage.setItem(STORAGE_PREFIX + "work_schedule", JSON.stringify(cleanSchedule));

    API.post({
      action: "saveWorkSchedule",
      activeDays: JSON.stringify(cleanSchedule.activeDays),
      todayManualOverride: cleanSchedule.todayManualOverride || "",
      lastOverrideDate: cleanSchedule.lastOverrideDate || ""
    }).catch(e => console.warn("Sync work schedule err:", e));

    return cleanSchedule;
  },

  getHolidays: function() {
    const data = localStorage.getItem(STORAGE_PREFIX + "holidays");
    if (!data) {
      localStorage.setItem(STORAGE_PREFIX + "holidays", JSON.stringify(DEFAULT_HOLIDAYS));
      return [...DEFAULT_HOLIDAYS];
    }
    try {
      const list = JSON.parse(data);
      return Array.isArray(list) ? list : [...DEFAULT_HOLIDAYS];
    } catch(e) {
      return [...DEFAULT_HOLIDAYS];
    }
  },

  saveHoliday: function(holiday) {
    let holidays = this.getHolidays();
    holiday.id = holiday.id || ("HOL-" + Date.now());
    const idx = holidays.findIndex(h => h.id === holiday.id || h.tanggal === holiday.tanggal);
    if (idx >= 0) {
      holidays[idx] = { ...holidays[idx], ...holiday };
    } else {
      holidays.push(holiday);
    }
    holidays.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    localStorage.setItem(STORAGE_PREFIX + "holidays", JSON.stringify(holidays));

    API.post({
      action: "saveHoliday",
      id: holiday.id,
      tanggal: holiday.tanggal,
      nama: holiday.nama,
      tipe: holiday.tipe || "Libur Khusus"
    }).catch(e => console.warn("Sync holiday err:", e));

    return holidays;
  },

  deleteHoliday: function(id) {
    let holidays = this.getHolidays().filter(h => h.id !== id);
    localStorage.setItem(STORAGE_PREFIX + "holidays", JSON.stringify(holidays));

    API.post({
      action: "deleteHoliday",
      id: id
    }).catch(e => console.warn("Delete holiday err:", e));

    return holidays;
  },

  resetDefaultHolidays: function() {
    localStorage.setItem(STORAGE_PREFIX + "holidays", JSON.stringify(DEFAULT_HOLIDAYS));
    return [...DEFAULT_HOLIDAYS];
  },

  setTodayOverride: function(mode) {
    // mode: 'holiday' (diliburkan), 'work' (dipaksa hari kerja), null (sesuai jadwal rutin)
    let schedule = this.getWorkSchedule();
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    schedule.todayManualOverride = mode;
    schedule.lastOverrideDate = todayStr;
    return this.saveWorkSchedule(schedule);
  },

  isHoliday: function(dateInput = new Date()) {
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return { isHoliday: false, reason: "Tanggal Tidak Valid", type: "Normal" };

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayOfWeek = d.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const currentDayName = dayNames[dayOfWeek];

    const schedule = this.getWorkSchedule();

    // 1. Cek Manual Override Hari Ini (jika tanggal cocok hari ini)
    const now = new Date();
    const todayActualStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    if (dateStr === todayActualStr && schedule.lastOverrideDate === todayActualStr && schedule.todayManualOverride) {
      if (schedule.todayManualOverride === 'holiday') {
        return {
          isHoliday: true,
          reason: "Diliburkan Khusus Hari Ini oleh Super Admin",
          type: "Libur Khusus Super Admin",
          date: dateStr,
          dayName: currentDayName,
          isManualOverride: true
        };
      } else if (schedule.todayManualOverride === 'work') {
        return {
          isHoliday: false,
          reason: "Diaktifkan Masuk Kerja Khusus Hari Ini oleh Super Admin",
          type: "Hari Kerja Khusus",
          date: dateStr,
          dayName: currentDayName,
          isManualOverride: true
        };
      }
    }

    // 2. Cek Daftar Hari Libur Khusus / Nasional
    const holidays = this.getHolidays();
    const matchedHoliday = holidays.find(h => h.tanggal === dateStr);
    if (matchedHoliday) {
      return {
        isHoliday: true,
        reason: matchedHoliday.nama,
        type: matchedHoliday.tipe || "Hari Libur Nasional",
        date: dateStr,
        dayName: currentDayName,
        holidayId: matchedHoliday.id
      };
    }

    // 3. Cek Hari Kerja Mingguan
    const activeDays = Array.isArray(schedule.activeDays) ? schedule.activeDays : [1, 2, 3, 4, 5];
    if (!activeDays.includes(dayOfWeek)) {
      return {
        isHoliday: true,
        reason: `Hari Libur Rutin (${currentDayName})`,
        type: "Libur Mingguan",
        date: dateStr,
        dayName: currentDayName
      };
    }

    return {
      isHoliday: false,
      reason: `Hari Kerja Aktif (${currentDayName})`,
      type: "Hari Kerja",
      date: dateStr,
      dayName: currentDayName
    };
  }
};
