import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur.');
const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
for (const statement of schema.split(';').map(part => part.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) {
  await sql.query(statement);
}
const [source] = await sql.query("SELECT to_regclass('public.incident_members') AS table_name");
if (!source?.table_name) throw new Error('Daftar anggota sumber tidak ditemukan; tabel target sudah dibuat tanpa menyalin anggota.');
await sql.query(`INSERT INTO management_members (user_id, display_name, enabled)
  SELECT user_id, display_name, enabled FROM incident_members
  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, enabled = EXCLUDED.enabled`);
const [count] = await sql.query('SELECT count(*)::int AS count FROM management_members WHERE enabled = true');
console.log(`Skema siap; ${count.count} anggota aktif disalin/diperbarui.`);
