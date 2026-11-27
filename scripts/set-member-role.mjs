import { neon } from '@neondatabase/serverless';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const [email, roleId] = process.argv.slice(2);
if (!email?.includes('@') || !['admin', 'member'].includes(roleId)) {
  console.error('Penggunaan: node scripts/set-member-role.mjs anggota@organisasi.id admin|member');
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur.');
const sql = neon(process.env.DATABASE_URL);
const [user] = await sql.query('SELECT id FROM neon_auth."user" WHERE lower(email)=lower($1)', [email.trim()]);
if (!user) throw new Error('Akun tidak ditemukan di Neon Auth.');
const [role] = await sql.query('SELECT id FROM management_roles WHERE id=$1', [roleId]);
if (!role) throw new Error('Role tidak ditemukan; jalankan setup-database terlebih dahulu.');
const [member] = await sql.query('UPDATE management_members SET role_id=$1 WHERE user_id=$2 AND enabled=true RETURNING user_id', [roleId, user.id]);
if (!member) throw new Error('Anggota aktif tidak ditemukan di management_members.');
console.log(`Role ${roleId} diberikan kepada ${email.trim()}.`);
