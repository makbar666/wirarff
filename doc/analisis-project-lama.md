# Analisis proyek lama PKP-PK Digital Portal

Tanggal analisis: 24 November 2026
Sumber: `old/`
Metode: pembacaan statis kode sumber dan MCP REA `analyze_javascript_application` pada `old/src`. Dokumen ini menggambarkan implementasi yang terlihat, bukan hasil pengujian operasional atau verifikasi akses ke dokumen eksternal.

## Ringkasan

Proyek lama adalah portal satu halaman untuk akses administrasi dan operasional PKP-PK Bandar Udara Weda Bay. Aplikasi menampilkan delapan kartu menu, membuka dokumen Google di tab baru, dan menyediakan dialog pilihan lima kendaraan untuk dokumen maintenance. Kalkulator kebutuhan PKP-PK baru berupa tampilan dengan tombol nonaktif. Tidak ditemukan implementasi backend, autentikasi, database, atau pemanggilan API dalam kode aplikasi yang diperiksa; pengelolaan dan hak akses data berada pada layanan dokumen eksternal.

## Teknologi dan struktur

- React 18 dan React DOM, JavaScript/JSX, Vite 4, CSS biasa, ESLint.
- `index.html` menyediakan elemen root; `src/main.jsx` memasang `App` di React StrictMode.
- `src/App.jsx` menyatukan layout, interaksi menu, dialog kendaraan, dan preview kalkulator.
- `src/data/links.js` menyimpan delapan entri menu; `src/data/maintenanceLinks.js` menyimpan lima entri kendaraan.
- `src/App.css` mengatur layout utama dan responsivitas; `src/index.css` berisi gaya global dan dialog. Beberapa aturan layout didefinisikan ulang di bagian bawah `App.css`; urutan cascade menentukan hasil akhir.
- `public/vite.svg` dan `src/assets/react.svg` merupakan aset bawaan template. README masih berupa dokumentasi template Vite.

Alur: `index.html` → `main.jsx` → `App.jsx` → data menu/kendaraan → tautan Google Docs atau Google Sheets. `showMaintenance` adalah satu-satunya state React yang terlihat dan mengatur dialog.

## Inventaris fungsi

| Menu | Perilaku pada kode |
| --- | --- |
| Laporan Operasional / Shift | Membuka Google Docs. |
| Inspeksi APAR | Membuka Google Sheets. |
| Checklist Kendaraan | Membuka Google Sheets. |
| Maintenance Kendaraan | Membuka dialog daftar kendaraan. |
| Uji Mutu Foam | URL kosong; klik menampilkan alert bahwa link Google Sheets belum dimasukkan. |
| Inventaris PKP-PK | Membuka Google Sheets. |
| Pelatihan dan Kendali Mutu | URL kosong; menampilkan alert yang sama. |
| Laporan Bulanan PKP-PK | URL kosong; menampilkan alert yang sama. |

Dialog maintenance menampilkan Foam Tender 1, Foam Tender 2, Commando Car, Ambulance, dan Water Tank; masing-masing memiliki URL Google Sheets dalam data sumber. Klik latar, tombol silang, atau tombol Tutup menutup dialog; klik isi dialog tidak menutupnya. URL kosong atau placeholder `MASUKKAN_URL_GOOGLE_SHEETS` ditampilkan sebagai “Belum tersedia”. Tautan eksternal memakai `target="_blank"` dan `rel="noopener noreferrer"`. Ketersediaan, isi, dan izin dokumen Google belum diverifikasi.

Kalkulator menampilkan penjelasan kebutuhan air dan bahan pemadam berdasarkan kategori PK bandara, tetapi tombol “Tahap Berikutnya” dinonaktifkan dan tidak ada rumus atau input. Sidebar, topbar, sambutan, statistik, dan judul menu ada dalam JSX, tetapi aturan CSS menyembunyikan sebagian besar elemen tersebut. Statistik yang tertulis “07 Menu Administrasi” tidak sesuai dengan delapan entri menu; status “Sistem Aktif” dan “Online” adalah teks statis, bukan hasil pemeriksaan layanan, dan saat ini disembunyikan.

## Antarmuka dan perilaku

Layout akhir berupa panel terpusat, header gelap, grid dua kolom, preview kalkulator, dan footer. Pada lebar maksimal 340 px grid menjadi satu kolom; ada penyesuaian pada 480 dan 768 px. Dialog berukuran maksimal 600 px, dapat digulir secara vertikal, dengan penyesuaian pada 600 px. Tampilan akhir dipengaruhi aturan global di `index.css` dan aturan yang berulang di `App.css`.

Navigasi pada markup menggunakan anchor ke `#dashboard`, `#menu`, dan `#calculator`, tetapi navigasi tersebut disembunyikan CSS. Identifikasi aksi maintenance bergantung pada teks judul persis `Maintenance Kendaraan`; perubahan judul dapat mengubah perilaku. Kartu tanpa URL masih menampilkan “Buka Menu →”. Dialog belum memiliki semantik dialog, pengelolaan fokus, atau penanganan Escape yang terlihat di kode; kartu aksi maintenance menggunakan anchor tanpa `href`, sehingga akses keyboard perlu ditinjau.

## Temuan dan prioritas pengembangan

1. Tentukan apakah sistem baru tetap menjadi direktori tautan atau harus menyimpan dan mengelola data sendiri. Inventaris dokumen, pemilik, izin, serta kebutuhan migrasi isi perlu dikonfirmasi dengan pengguna; URL yang ada di file data adalah sumber referensi, bukan bukti hak akses.
2. Pertahankan delapan fungsi dan lima kendaraan sebagai daftar kebutuhan awal, sambil memberi status jelas untuk tiga menu tanpa URL. Gunakan tipe aksi atau ID stabil untuk membedakan tautan, dialog, dan fungsi yang belum tersedia.
3. Tentukan spesifikasi kalkulator, sumber standar perhitungan, satuan, validasi input, dan contoh hasil yang disetujui sebelum implementasi. Jangan menganggap deskripsi saat ini sebagai rumus.
4. Rapikan CSS dan hapus atau hidupkan elemen tersembunyi berdasarkan desain yang disepakati. Turunkan jumlah menu dari data; tampilkan status layanan hanya bila memang diukur.
5. Perbaiki aksesibilitas dialog: label, fokus awal dan pengembalian fokus, pengurungan fokus, Escape, dan elemen tombol yang dapat digunakan keyboard. Uji responsivitas dan aksesibilitas melalui browser.
6. Jika data operasional dipindahkan dari Google, rancang autentikasi, otorisasi, audit perubahan, backup, dan migrasi berdasarkan kebutuhan yang disetujui. Implementasi tersebut belum ada di proyek lama.

## Menjalankan proyek lama

Di direktori `old`, jalankan `npm install`, lalu `npm run dev`. Perintah lain pada `package.json`: `npm run build`, `npm run preview`, dan `npm run lint`. Kebutuhan versi Node dan konfigurasi deployment tidak ditetapkan secara eksplisit dalam proyek. Analisis ini tidak menjalankan build, lint, aplikasi, atau pemeriksaan jaringan.

## Bukti REA dan batasan

REA menganalisis direktori `old/src` secara statis tanpa menjalankan aplikasi. Ringkasannya mencatat empat file JavaScript yang relevan, empat berhasil diparse, dan tidak ada kegagalan parsing. Cakupan graph aplikasi dinyatakan parsial; graph semantik berstatus unknown dengan 101 unknown, sehingga tidak dapat dijadikan bukti bahwa hubungan atau perilaku yang tidak ditemukan benar-benar tidak ada. JSX, CSS, data dan konfigurasi juga ditinjau langsung untuk menyusun dokumen ini. Tidak ada pengujian runtime maupun akses ke layanan Google.

- Parent evidence: `ev_d0f6cfe5804d07efbe1b090a80ff8b3023690410226d4f35e6c86302db2103c8`.
- Summary evidence: `ev_352cc4bf3dea1b9e08842505f268a0f3de88b7fc325d2fe32ca78a18a66fa2f4`.
- SHA-256 direktori hasil REA: `1d99a93902e4a32ef0c281eb3aeb58660b0a3c7f07495138348ae2d069abb87e`.
