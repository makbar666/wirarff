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
  ('admin', 'Admin', true, true, true),
  ('member', 'Anggota', false, false, true)
  ON CONFLICT (id) DO NOTHING`);
const [memberTable] = await sql.query("SELECT to_regclass('public.management_members') AS table_name");
if (!memberTable?.table_name) throw new Error('Tabel management_members belum ada; jalankan setup-database.mjs terlebih dahulu.');
await sql.query("ALTER TABLE management_members ADD COLUMN IF NOT EXISTS role_id text NOT NULL DEFAULT 'member' REFERENCES management_roles(id)");
await sql.query("UPDATE management_members SET role_id='member' WHERE role_id NOT IN ('admin','member')");
await sql.query("DELETE FROM management_roles WHERE id NOT IN ('admin','member')");
await sql.query("UPDATE management_roles SET name='Admin', can_manage_menus=true, can_manage_users=true, is_system=true WHERE id='admin'");
await sql.query("UPDATE management_roles SET name='Anggota', can_manage_menus=false, can_manage_users=false, is_system=true WHERE id='member'");
await sql.query("ALTER TABLE management_members ALTER COLUMN role_id SET DEFAULT 'member'");
await sql.query('REVOKE ALL ON management_roles FROM PUBLIC');
await sql.query('ALTER TABLE management_roles ENABLE ROW LEVEL SECURITY');
console.log('Dua role siap: Admin dan Anggota. Anggota lama yang bukan Admin dipetakan menjadi Anggota.');
