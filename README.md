# PKP-PK Management Center

Portal direktori operasional dengan halaman statis, serverless functions (Node.js 22), Neon Postgres, dan Managed Neon Auth. PHP dipakai saat build lokal untuk merender template; hosting PHP biasa tidak menjalankan API online.

## Menjalankan lokal

1. Jalankan `npm.cmd install`.
2. Pastikan `.env` berisi `DATABASE_URL`, `NEON_AUTH_BASE_URL`, dan `NEON_AUTH_COOKIE_SECRET` dari branch Neon yang sama. Secret cookie harus acak dan minimal 32 karakter.
3. Jalankan `node scripts/setup-database.mjs` untuk membuat skema dan memberi akses ke anggota aktif dari tabel `incident_members` project pelaporan.
4. Jalankan `php build-static.php`, kemudian `npm.cmd run build`, lalu `npm.cmd run dev`.
5. Buka `http://localhost:8083` dan masuk dengan email/kata sandi akun Neon yang sudah diberi akses.

`php -S` saja tidak menyediakan endpoint login. Credential Neon hanya dibaca backend, tidak dimasukkan ke halaman atau aset publik.

## Deploy Netlify

1. Hubungkan repository ke Netlify. Pengaturan build sudah ada pada `netlify.toml`: command `npm run build`, publish directory `public`, functions directory `netlify/functions`. File `public/index.html` sudah dibuat dan ikut disimpan di repository.
2. Tambahkan environment variables pada scope Functions: `DATABASE_URL` (connection string pooled Neon), `NEON_AUTH_BASE_URL` (Auth URL lengkap), dan `NEON_AUTH_COOKIE_SECRET` (acak, minimal 32 karakter). Gunakan database dan Auth URL dari branch yang sama.
3. Tambahkan origin Netlify dan origin lokal ke trusted domains di Neon Auth. Deploy ulang setelah mengatur environment.
4. Buat akun anggota menggunakan instruksi di bawah.

## Deploy Vercel

1. Import repository ke Vercel. `vercel.json` sudah menetapkan build command `npm run build` dan output directory `public`; Node.js dipatok ke 22.x melalui `package.json`.
2. Tambahkan `DATABASE_URL`, `NEON_AUTH_BASE_URL`, dan `NEON_AUTH_COOKIE_SECRET` pada Project Settings → Environment Variables untuk Production dan Preview yang digunakan.
3. Deploy. API login, logout, dan session tersedia sebagai Vercel Functions di `/api/login`, `/api/logout`, dan `/api/session`.
4. Tambahkan origin domain Vercel yang dipakai ke trusted domains Neon Auth. Preview memakai origin berbeda; gunakan Production domain untuk login production yang konsisten.

Jangan aktifkan rewrite fallback SPA untuk `/api/*`; endpoint harus ditangani Vercel Functions. Credential yang sama dengan branch Neon harus disimpan sebagai environment variables Vercel, tidak di commit.

## Akun anggota

Akun Neon Auth hanya bisa masuk jika memiliki baris aktif di `management_members`. Tidak ada pendaftaran publik maupun halaman pengelolaan anggota.

Untuk membuat anggota pertama, salin `.env.example` ke `.env`, isi tiga variabel backend dan `MEMBER_PASSWORD` (12–128 karakter), lalu jalankan:

```powershell
node scripts/add-member.mjs anggota@organisasi.id "Nama Anggota"
```

Hapus `MEMBER_PASSWORD` dari `.env` setelah digunakan. Jika email sudah terdaftar di Neon Auth, script hanya memberi atau memperbarui akses; kata sandi yang ada tetap berlaku. Untuk menonaktifkan anggota:

```sql
UPDATE management_members SET enabled = false WHERE user_id = 'ID_PENGGUNA';
```

Jangan commit `.env` atau menyimpan connection string di `public/`. Konfigurasi `.env.example` hanya contoh placeholder.

## Isi portal

Template portal dan halaman pengelolaan dirender ke `public/index.html` dan `public/master-menu.html` saat build. Tombol **Master Menu** di header membuka tabel pengelolaan dokumen dan kendaraan; anggota yang login dapat menambah, mengedit, atau menghapus item dan perubahan langsung terlihat untuk semua anggota. Datanya disimpan di tabel Neon `management_documents` dan `management_vehicles`. Data awal ada di `assets/master-data.json` dan dimasukkan oleh `node scripts/setup-database.mjs` tanpa menimpa item seed yang sudah ada. Tautan Google Drive tetap mengikuti izin berbagi pada dokumen masing-masing.

Kalkulator ARFF tersedia di `public/kalkulator.html` dan dapat dibuka dari dashboard. Halamannya mencakup perhitungan pesawat, personel/TRA, tabel minimum, dan database dimensi pesawat. Nilai awal Dhoho tidak mengisi kategori PKP-PK; kategori resmi harus dipilih sebelum hasil Q1/Q2 digunakan. Rumus, nilai tabel, dimensi, serta profil bandara masih harus diverifikasi terhadap dokumen resmi terbaru dan pemilik operasional; kalkulator adalah alat bantu awal, bukan penentu kepatuhan.
