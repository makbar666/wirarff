# PKP-PK Management Center

Portal direktori operasional dengan halaman statis, Netlify Functions (Node.js 22), Neon Postgres, dan Managed Neon Auth. PHP dipakai saat build untuk merender template; hosting PHP biasa tidak menjalankan API online.

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

Daftar dokumen dan tautan kendaraan ada di `config.php`; isi template dirender ke `public/index.html` saat build. Perubahan template atau aset perlu dibangun ulang. Tautan Google Drive tetap mengikuti izin berbagi yang diatur pada dokumen masing-masing.
