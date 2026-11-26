import { neon } from '@neondatabase/serverless';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur.');
const sql = neon(process.env.DATABASE_URL);
await sql.query(`CREATE TABLE IF NOT EXISTS management_roles (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE CHECK (length(trim(name)) BETWEEN 1 AND 80),
  can_manage_menus boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
)`);
await sql.query(`INSERT INTO management_roles (id, name, can_manage_menus, can_manage_users, is_system) VALUES
  ('admin', 'Administrator', true, true, true),
  ('editor', 'Pengelola menu', true, false, true),
  ('member', 'Anggota', false, false, true)
  ON CONFLICT (id) DO NOTHING`);
const [memberTable] = await sql.query("SELECT to_regclass('public.management_members') AS table_name");
if (!memberTable?.table_name) throw new Error('Tabel management_members belum ada; jalankan setup-database.mjs terlebih dahulu.');
await sql.query("ALTER TABLE management_members ADD COLUMN IF NOT EXISTS role_id text NOT NULL DEFAULT 'editor' REFERENCES management_roles(id)");
await sql.query('REVOKE ALL ON management_roles FROM PUBLIC');
await sql.query('ALTER TABLE management_roles ENABLE ROW LEVEL SECURITY');
console.log('Master role siap; anggota lama tetap memiliki izin pengelola menu. Tetapkan administrator awal dengan set-member-role.mjs.');
