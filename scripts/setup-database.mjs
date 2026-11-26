import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur.');
const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
const masterData = JSON.parse(await readFile(new URL('../assets/master-data.json', import.meta.url), 'utf8'));
for (const statement of schema.split(';').map(part => part.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) {
  await sql.query(statement);
}
await sql.query(`DELETE FROM management_vehicles
  WHERE id IN ('foam-tender-1', 'foam-tender-2', 'commando-car', 'ambulance', 'water-tank')`);
for (const item of masterData.documents) {
  await sql.query(`INSERT INTO management_documents (id, number, title, description, category, url, action_type, icon)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
  [item.id, item.number, item.title, item.description, item.category, item.url, item.actionType, item.icon]);
}
for (const item of masterData.vehicles) {
  await sql.query(`INSERT INTO management_vehicles (id, name, url)
    VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [item.id, item.name, item.url]);
}
await sql.query(`SELECT setval(pg_get_serial_sequence('management_documents','number'),
  GREATEST(COALESCE((SELECT max(number) FROM management_documents), 1), 1), true)`);
const [source] = await sql.query("SELECT to_regclass('public.incident_members') AS table_name");
if (!source?.table_name) throw new Error('Daftar anggota sumber tidak ditemukan; tabel target sudah dibuat tanpa menyalin anggota.');
await sql.query(`INSERT INTO management_members (user_id, display_name, enabled)
  SELECT user_id, display_name, enabled FROM incident_members
  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, enabled = EXCLUDED.enabled`);
const [count] = await sql.query('SELECT count(*)::int AS count FROM management_members WHERE enabled = true');
console.log(`Skema siap; ${count.count} anggota aktif disalin/diperbarui.`);
