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
2. Tambahkan `DATABASE_URL`, `NEON_AUTH_BASE_URL`, dan `NEON_AUTH_COOKIE_SECRET` pada Project Settings → Environment Variables untuk Production dan Preview yang digunakan. `PORTAL_ADMIN_EMAIL` opsional untuk menetapkan administrator awal melalui email.
3. Deploy. API login, logout, dan session tersedia sebagai Vercel Functions di `/api/login`, `/api/logout`, dan `/api/session`.
4. Tambahkan origin domain Vercel yang dipakai ke trusted domains Neon Auth. Preview memakai origin berbeda; gunakan Production domain untuk login production yang konsisten.

Jangan aktifkan rewrite fallback SPA untuk `/api/*`; endpoint harus ditangani Vercel Functions. Credential yang sama dengan branch Neon harus disimpan sebagai environment variables Vercel, tidak di commit.

## Akun anggota

Akun Neon Auth hanya bisa masuk jika memiliki baris aktif di `management_members`. Pendaftaran publik tetap tidak tersedia. Role akses disimpan di `management_roles` dan dapat ditetapkan per anggota oleh administrator.

Untuk membuat anggota pertama, salin `.env.example` ke `.env`, isi tiga variabel backend dan `MEMBER_PASSWORD` (12–128 karakter), lalu jalankan:

```powershell
node scripts/add-member.mjs anggota@organisasi.id "Nama Anggota"
```

Hapus `MEMBER_PASSWORD` dari `.env` setelah digunakan. Jika email sudah terdaftar di Neon Auth, script hanya memberi atau memperbarui akses; kata sandi yang ada tetap berlaku. Untuk menonaktifkan anggota:

```sql
UPDATE management_members SET enabled = false WHERE user_id = 'ID_PENGGUNA';
```

Setelah deploy perubahan role, jalankan migrasi ringan pada database yang sama dengan aplikasi:

```powershell
node scripts/migrate-role-access.mjs
node scripts/set-member-role.mjs admin@organisasi.id admin
```

Perintah kedua menetapkan administrator awal dan hanya perlu dilakukan sekali. Alternatifnya, atur `PORTAL_ADMIN_EMAIL` pada environment Vercel/local; alamat tersebut otomatis mendapat role Admin saat login. Role hanya terdiri dari **Admin** dan **Anggota**. Admin dapat membuka **Pengguna & Role**, membuat user Neon Auth dari halaman tersebut, dan menetapkan role untuk setiap anggota aktif. Akun lama yang bukan Admin dipetakan menjadi Anggota saat migrasi.

Aksi **Hapus** mencabut akses portal dengan menonaktifkan baris di `management_members`; akun Neon Auth tetap tersimpan. Jika email yang sama ditambahkan kembali, akses dipulihkan dan kata sandi Neon Auth yang lama tetap berlaku.

Jangan commit `.env` atau menyimpan connection string di `public/`. Konfigurasi `.env.example` hanya contoh placeholder.

## Isi portal

Template portal, halaman master menu, dan halaman pengguna dirender ke `public/index.html`, `public/master-menu.html`, dan `public/master-users.html` saat build. Role Admin/Anggota diperiksa pada API; hanya Admin yang dapat mengelola menu, membuat user, atau menetapkan role. Data role disimpan di Neon `management_roles` dan penugasan pada `management_members`.

Kalkulator ARFF tersedia di `public/kalkulator.html` dan dapat dibuka dari dashboard. Halamannya mencakup perhitungan pesawat, personel/TRA, tabel minimum, dan database dimensi pesawat. Nilai awal Weda Bay tidak mengisi kategori PKP-PK; kategori resmi harus dipilih sebelum hasil Q1/Q2 digunakan. Rumus, nilai tabel, dimensi, serta profil bandara masih harus diverifikasi terhadap dokumen resmi terbaru dan pemilik operasional; kalkulator adalah alat bantu awal, bukan penentu kepatuhan.
