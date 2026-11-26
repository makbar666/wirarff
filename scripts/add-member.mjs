import { neon } from '@neondatabase/serverless';
import { createAuthServer, resolveNeonAuthLogging } from '@neon/auth/server';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const [email, name] = process.argv.slice(2);
if (!email?.includes('@') || !name || name.length > 200) { console.error('Penggunaan: node scripts/add-member.mjs email@contoh.id "Nama anggota"'); process.exit(1); }
try {
  if (!process.env.DATABASE_URL || !process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) throw Error();
  const sql = neon(process.env.DATABASE_URL);
  let [existing] = await sql.query('SELECT id FROM neon_auth."user" WHERE lower(email) = lower($1)', [email]);
  if (!existing) {
    const password = process.env.MEMBER_PASSWORD;
    if (!password || password.length < 12 || password.length > 128) { console.error('Isi MEMBER_PASSWORD (12–128 karakter) pada .env lokal.'); process.exit(1); }
    const cookies = new Map();
    const auth = createAuthServer({ baseUrl: process.env.NEON_AUTH_BASE_URL, cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET, log: resolveNeonAuthLogging({ logLevel: 'silent' }), context: () => ({ getCookies: () => [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), setCookie: (k,v) => cookies.set(k,v), getHeader: () => null, getOrigin: () => process.env.APP_ORIGIN || 'http://localhost:8083', getFramework: () => 'netlify' }) });
    const result = await auth.signUp.email({ email, name, password });
    if (result.error || !result.data?.user?.id) throw Error();
    existing = { id: result.data.user.id };
  }
  await sql.query("INSERT INTO management_members(user_id, display_name, enabled, role_id) VALUES ($1,$2,true,'member') ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name, enabled=true", [existing.id, name]);
  console.log('Anggota diberi akses. Selesaikan verifikasi email jika diwajibkan oleh Neon Auth.');
} catch { console.error('Gagal menambahkan anggota. Periksa env, Neon Auth, trusted domain, dan schema.sql. Credential tidak dicetak.'); process.exitCode = 1; }
