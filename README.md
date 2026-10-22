# Woluwo - Aplikasi Presensi & Tata Kelola Desa

Aplikasi presensi digital desa modern, responsif, dan elegan dengan desain UI kelas dashboard profesional, dilengkapi dengan sistem multi-role, validasi GPS & radius kantor, webcam selfie watermark, pengajuan izin/sakit/cuti, manajemen hari kerja & libur Super Admin, serta pencetakan laporan resmi.

---

## 🚀 Akun Demo Siap Pakai

Anda dapat langsung mengklik tombol **Login Cepat (Demo)** pada halaman login atau memasukkan kredensial berikut:

| Peran (Role) | NIK / Akun | Password | Unit Kantor | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `198501012010011001` | `admin` | Kantor Camat Botumoito | Dashboard Global, Koreksi Absen, Tambah/Kelola Semua Pegawai, Pengaturan Lokasi Peta & Jam Kerja, Laporan Lengkap |
| **🏢 Admin Desa** | `199002022015021002` | `admin` | Kantor Desa Botumoito | Dashboard Statistik Desa, Koreksi Absen Pegawai Desa, Tambah Pegawai Desa, Cetak Laporan Desa |
| **👤 Pegawai (User)** | `7501020304050001` | `user` | Kantor Desa Botumoito | Absen Masuk & Pulang Selfie, Absensi Teman, Izin, Sakit, Cuti, Profil Saya, Riwayat Presensi |

---

## 🌟 Fitur Utama Sesuai Spesifikasi

### 1. Halaman Login (3 Role)
- Pilihan peran: **Super Admin**, **Admin Desa**, dan **User / Pegawai**.
- Tombol 1-klik pengisian akun demo untuk uji coba instan.
- Validasi keamanan kredensial dan feedback modern.

### 2. Tampilan Pegawai (User)
- **Foto Profil & Status**: Menampilkan avatar, nama lengkap, NIK, jabatan, dan status kehadiran hari ini.
- **Widget Jam Kerja**: Jam digital real-time, target **Jam Masuk (08:00)** dan **Jam Pulang (16:00)**.
- **9 Tombol Aksi Lengkap**:
  1. 🟢 **Absen Masuk**: Selfie webcam dengan watermark waktu, koordinat GPS, dan deteksi radius kantor desa.
  2. 🔵 **Absen Pulang**: Selfie jam pulang dan penghitungan jam kerja.
  3. 🟣 **Absen Penugasan (Dinas Luar)**: 
     - Pilihan **Penugasan Datang** (mulai dinas) dan **Penugasan Pulang** (selesai dinas).
     - **Wajib melampirkan SPT** (Surat Perintah Tugas) via unggah file / foto fisik lembar SPT dengan kamera.
     - Pengisian No. SPT, Instansi/Lokasi Tujuan, dan Uraian Tugas.
     - Selfie dengan watermark resmi SPT & koordinat tugas, langsung tersimpan ke database Google Sheets.
  4. 👥 **Absensi Teman**: Membantu presensi rekan satu kantor desa dengan catatan audit khusus.
  5. 📝 **Tombol Izin**: Form permohonan izin dengan tanggal dan alasan.
  6. 🏥 **Tombol Sakit**: Form pelaporan sakit pegawai disertai surat dokter.
  7. 🏖️ **Tombol Cuti**: Form pengajuan cuti resmi.
  8. 👤 **Tombol Profil**: Edit informasi akun, unggah foto profil baru, dan ganti password.
  9. 📜 **Riwayat Absen**: Tabel riwayat kehadiran pribadi lengkap dengan foto thumbnail dan tombol **Lihat SPT**.

---

## ⚡ Sinkronisasi Database Real-Time (Otomatis & Tanpa Generate Manual)

Seluruh data yang diinput melalui aplikasi sekarang **langsung masuk secara otomatis dan instan ke database Google Sheets**:
1. **Presensi Mandiri & Penugasan**: Saat pegawai melakukan Absen Masuk, Absen Pulang, maupun Absen Penugasan Datang/Pulang, data presensi dan lampiran SPT langsung tersimpan ke lembar *Absensi* di Google Sheets.
2. **Koreksi Absen**: Tiap kali admin melakukan koreksi, perubahan status langsung tersinkron ke baris presensi terkait di Google Sheets.
3. **Pengelolaan Pegawai & Kantor**: Penambahan atau perubahan data pegawai dan unit kantor langsung tersimpan di lembar *Users* dan *Config*.
4. **Indikator Real-time**: Indikator status di dashboard admin menampilkan status `🟢 Database: Google Sheets (Real-Time)`.

---

## 💻 Panduan Pembaruan Google Apps Script (Kode.gs)

Bila Anda memperbarui backend di Google Apps Script:
1. Buka spreadsheet [Mo'eeya Google Spreadsheet](https://docs.google.com/spreadsheets/d/1lM9x10LOVkZFZv-iLRvre2uhpqvycZ_WuDLFagtY7Ic/edit).
2. Masuk ke **Ekstensi** > **Apps Script**.
3. Salin seluruh isi dari file [Kode.gs](file:///d:/DATA%20DEDY/APLIKASI/ABSENSI%20DESA/Kode.gs) atau [CODE_GS.gs](file:///d:/DATA%20DEDY/APLIKASI/ABSENSI%20DESA/CODE_GS.gs).
4. Klik **Terapkan (Deploy)** > **Kelola Penerapan (Manage Deployments)** > edit dan buat versi baru (New Version), atau **Deploy Baru (New Deployment)** dengan opsi:
   - *Jenis*: **Aplikasi Web (Web App)**
   - *Jalankan sebagai*: **Saya (Me)**
   - *Akses*: **Siapa saja (Anyone)**
5. Kolom ke-12 **"Lampiran SPT"** pada sheet **Absensi** akan otomatis dibuat dan siap menampung dokumen SPT secara terintegrasi.

