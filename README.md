# SajiTrace — Web MVP

SajiTrace adalah prototipe website penelusuran rantai pasok pangan untuk skenario operasional Satuan Pelayanan Pemenuhan Gizi (SPPG). Aplikasi ini menghubungkan catatan asal bahan pangan, penggunaan bahan dalam proses produksi, distribusi makanan, serta pencatatan risiko dan tindak lanjut dalam satu platform.

SajiTrace bertujuan membantu petugas menelusuri hubungan antara bahan baku, batch produksi, dan lokasi penerima secara lebih cepat dan terstruktur, khususnya ketika ditemukan masalah yang memerlukan pemeriksaan lebih lanjut.

> **Catatan:** SajiTrace merupakan prototipe untuk demonstrasi dan pengujian. Data awal yang digunakan adalah data simulasi. Aplikasi belum terintegrasi dengan SIPGN/BGN dan belum ditujukan untuk penggunaan operasional produksi.

## Fitur Utama

- **Dashboard:** Menampilkan ringkasan inventaris bahan, produksi, distribusi, dan catatan risiko.
- **Manajemen Bahan Pangan:** Mencatat jenis bahan, pemasok, kode lot, tanggal penerimaan, tanggal kedaluwarsa, jumlah, dan kondisi awal bahan.
- **Batch Produksi:** Menghubungkan bahan baku yang digunakan dengan catatan produksi dan jumlah porsi yang dihasilkan.
- **Distribusi Makanan:** Mencatat batch yang didistribusikan, lokasi penerima, jumlah porsi, status pengiriman, dan konfirmasi penerimaan.
- **Traceability:** Menelusuri hubungan kode lot bahan pangan dengan batch produksi dan tujuan distribusi terkait.
- **Pusat Risiko:** Mencatat temuan, batch yang berkaitan, potensi cakupan distribusi, serta tindak lanjut yang dilakukan.
- **QR Code:** Menghasilkan QR Code untuk membuka halaman ringkasan verifikasi batch.
- **Riwayat Aktivitas:** Menyediakan catatan aktivitas dasar dan data demo yang tersimpan secara lokal.

## Teknologi yang Digunakan

| Teknologi | Fungsi |
|---|---|
| React | Membangun antarmuka pengguna interaktif |
| Vite | Menjalankan server pengembangan dan membangun frontend |
| Node.js | Menjalankan backend aplikasi |
| Express.js | Menyediakan REST API untuk pengelolaan data |
| JSON lokal | Menyimpan data prototipe tanpa database eksternal |
| qrcode.react | Menghasilkan QR Code |
| Lucide React | Menyediakan ikon antarmuka |

## Persyaratan Sistem

Sebelum menjalankan project, pastikan perangkat telah memiliki:

- Node.js versi 20 atau lebih baru (disarankan Node.js 22).
- npm, yang disertakan bersama instalasi Node.js.
- Koneksi internet untuk memasang dependency pada pertama kali menjalankan project.

Periksa instalasi melalui terminal:

```bash
node -v
npm -v
```

## Cara Menjalankan Project

### 1. Clone repository

Ganti `USERNAME` dengan username GitHub pemilik repository.

```bash
git clone https://github.com/USERNAME/sajitrace-web.git
```

### 2. Masuk ke direktori project

```bash
cd sajitrace-web
```

### 3. Pasang dependency

```bash
npm install
```

### 4. Jalankan aplikasi dalam mode pengembangan

```bash
npm run dev
```

Perintah tersebut menjalankan frontend dan backend secara bersamaan.

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

Buka alamat frontend di browser untuk menggunakan aplikasi.

### Menjalankan Versi Produksi Lokal

Untuk membangun frontend dan menjalankan aplikasi melalui backend:

```bash
npm run build
npm start
```

Setelah proses build selesai, buka:

http://localhost:4000

### Memeriksa Sintaks Backend

Project menyediakan perintah untuk memeriksa sintaks kode backend:

```bash
npm run check:server
```

## Data Demo

Project menyediakan data ilustrasi untuk mencoba alur penelusuran:

- **LOT-001 — Ayam fillet:** Terhubung dengan batch produksi B-101 dan B-102 untuk menunjukkan penelusuran ke beberapa tujuan distribusi.
- **LOT-002 — Beras medium:** Contoh bahan yang digunakan dalam beberapa batch produksi.
- **LOT-003 — Wortel:** Contoh bahan yang terhubung dengan catatan risiko.

Nama pemasok, lokasi penerima, jumlah, dan seluruh catatan demo merupakan data simulasi, bukan data operasional SPPG yang sebenarnya.

## Alur Demonstrasi

1. Buka dashboard dan pilih fitur penelusuran batch.
2. Cari kode `LOT-001`.
3. Tunjukkan hubungan bahan dengan batch produksi B-101 dan B-102 serta tujuan distribusinya.
4. Tambahkan bahan melalui halaman manajemen bahan pangan.
5. Buat catatan produksi dan hubungkan dengan bahan yang telah terdaftar.
6. Catat distribusi berdasarkan batch produksi dan lokasi penerima.
7. Buka pusat risiko untuk mencatat temuan serta tindak lanjut.
8. Coba QR Code untuk membuka ringkasan verifikasi batch.

## Struktur Direktori

```text
sajitrace-web/
├── index.html
├── package.json
├── vite.config.js
├── start.bat
├── start.sh
├── README.md
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── styles.css
└── server/
    ├── db.js
    └── index.js
```

## Batasan Proyek

- Data disimpan dalam file JSON lokal dan belum menggunakan database produksi.
- Belum tersedia autentikasi pengguna dan pembatasan akses berdasarkan peran.
- Belum ada integrasi dengan SIPGN/BGN, pemasok, GPS, atau sistem sekolah.
- Pengurangan stok bahan belum dilakukan secara otomatis ketika bahan dicatat dalam batch produksi.
- QR Code menggunakan alamat aplikasi yang harus dapat dijangkau oleh perangkat pemindai.
- Akurasi penelusuran bergantung pada kelengkapan dan kebenaran data yang dimasukkan pengguna.
- Catatan dan peringatan dalam aplikasi tidak secara otomatis menentukan apakah makanan aman atau tidak aman.

## Pengembangan Selanjutnya

Pengembangan berikutnya dapat mencakup penggunaan database relasional, autentikasi dan otorisasi berbasis peran, pencadangan data, integrasi sistem yang memiliki izin akses resmi, serta pengujian bersama pengguna operasional.

## Kontributor

Dikembangkan sebagai proyek kompetisi Web Development Soedirman Technoporia (S-Tech) 2026.

## Lisensi

Project ini merupakan prototipe untuk keperluan demonstrasi dan kompetisi.
