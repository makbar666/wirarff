import { neon } from '@neondatabase/serverless';
import { createAuthServer, resolveNeonAuthLogging } from '@neon/auth/server';
import { createAuth } from './auth.mjs';

const fail = (status, message) => Object.assign(new Error(message), { status });

function httpsUrl(value, field) {
  if (value === '') return '';
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname) return url.toString();
  } catch { /* report validation below */ }
  throw fail(400, `${field} harus berupa URL HTTPS.`);
}

function createProvisioningAuth(request, origin, env) {
  return createAuthServer({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
    sameSite: 'strict',
    log: resolveNeonAuthLogging({ logLevel: 'silent' }),
    context: () => ({
      getCookies: () => '',
      setCookie: () => {},
      getHeader: name => request.headers.get(name),
      getOrigin: () => origin,
      getFramework: () => process.env.VERCEL ? 'vercel' : process.env.NETLIFY ? 'netlify' : 'node'
    })
  });
}

export function createHandler({ env = process.env } = {}) {
  return async request => {
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    try {
      const url = new URL(request.url);
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) throw fail(405, 'Metode tidak didukung.');
      if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) throw fail(403, 'Asal permintaan tidak diizinkan.');
      const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
      const auth = createAuth(request, headers, env);
      const sql = neon(env.DATABASE_URL);

      if (path === 'login' && request.method === 'POST') {
        const input = await request.json();
        if (typeof input?.email !== 'string' || input.email.length > 254 || typeof input.password !== 'string' || !input.password || input.password.length > 128) throw fail(400, 'Email dan kata sandi wajib diisi.');
        const result = await auth.signIn.email({ email: input.email.trim(), password: input.password });
        const id = result.data?.user?.id;
        if (result.error || !id) throw fail(401, 'Login gagal. Periksa email dan kata sandi.');
        const email = result.data.user.email || input.email.trim();
        if (env.PORTAL_ADMIN_EMAIL && email.toLowerCase() === env.PORTAL_ADMIN_EMAIL.trim().toLowerCase()) {
          await sql.query("UPDATE management_members SET role_id='admin' WHERE user_id=$1 AND enabled=true", [id]);
        }
        const [member] = await sql.query(`SELECT m.display_name, m.role_id AS "roleId", r.can_manage_menus AS "canManageMenus", r.can_manage_users AS "canManageUsers"
          FROM management_members m JOIN management_roles r ON r.id=m.role_id WHERE m.user_id=$1 AND m.enabled=true`, [id]);
        if (!member) { await auth.signOut(); throw fail(403, 'Akun belum diberi akses oleh pengelola.'); }
        return reply({ user: { name: member.display_name, ...member } });
      }

      if (path === 'logout' && request.method === 'POST') {
        await auth.signOut();
        return reply({ ok: true });
      }

      const session = await auth.getSession({ query: { disableCookieCache: 'true' } });
      const userId = session.data?.user?.id;
      if (!userId) throw fail(401, 'Sesi berakhir. Silakan masuk kembali.');
      const email = session.data?.user?.email || '';
      if (env.PORTAL_ADMIN_EMAIL && email.toLowerCase() === env.PORTAL_ADMIN_EMAIL.trim().toLowerCase()) {
        await sql.query("UPDATE management_members SET role_id='admin' WHERE user_id=$1 AND enabled=true", [userId]);
      }
      const [member] = await sql.query(`SELECT m.display_name, m.role_id AS "roleId", r.can_manage_menus AS "canManageMenus", r.can_manage_users AS "canManageUsers"
        FROM management_members m JOIN management_roles r ON r.id=m.role_id WHERE m.user_id=$1 AND m.enabled=true`, [userId]);
      if (!member) { await auth.signOut(); throw fail(403, 'Akun tidak memiliki akses.'); }

      const requireMenuManager = () => { if (!member.canManageMenus) throw fail(403, 'Akun tidak memiliki izin mengelola menu.'); };
      const requireUserManager = () => { if (!member.canManageUsers) throw fail(403, 'Akun tidak memiliki izin mengelola role dan pengguna.'); };
      if (path === 'session' && request.method === 'GET') return reply({ user: { name: member.display_name, roleId: member.roleId, canManageMenus: member.canManageMenus, canManageUsers: member.canManageUsers } });
      if (path === 'master-data' && request.method === 'GET') {
        const [documents, vehicles] = await Promise.all([
          sql.query(`SELECT id, number, title, description, category, url, action_type AS "actionType", icon
            FROM management_documents WHERE enabled = true ORDER BY number`),
          sql.query(`SELECT id, sort_order AS number, name, url
            FROM management_vehicles WHERE enabled = true ORDER BY sort_order`)
        ]);
        return reply({ documents, vehicles });
      }

      if (path === 'roles' && request.method === 'GET') {
        requireUserManager();
        const roles = await sql.query(`SELECT id, name, can_manage_menus AS "canManageMenus", can_manage_users AS "canManageUsers", is_system AS "isSystem"
          FROM management_roles WHERE id IN ('admin','member') ORDER BY CASE id WHEN 'admin' THEN 0 ELSE 1 END`);
        return reply({ roles });
      }
      if (path === 'members' && request.method === 'GET') {
        requireUserManager();
        const [members, roles] = await Promise.all([
          sql.query(`SELECT m.user_id AS "userId", m.display_name AS name, m.enabled, m.role_id AS "roleId", u.email
            FROM management_members m LEFT JOIN neon_auth."user" u ON u.id::text=m.user_id WHERE m.enabled=true ORDER BY lower(m.display_name)`),
          sql.query(`SELECT id, name, can_manage_menus AS "canManageMenus", can_manage_users AS "canManageUsers"
            FROM management_roles WHERE id IN ('admin','member') ORDER BY CASE id WHEN 'admin' THEN 0 ELSE 1 END`)
        ]);
        return reply({ members, roles });
      }
      if (path === 'members' && request.method === 'POST') {
        requireUserManager();
        const input = await request.json();
        const name = typeof input?.name === 'string' ? input.name.trim() : '';
        const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
        const password = typeof input?.password === 'string' ? input.password : '';
        const roleId = input?.roleId;
        if (!name || name.length > 200 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'Nama atau email tidak valid.');
        if (password.length < 12 || password.length > 128) throw fail(400, 'Kata sandi harus terdiri dari 12–128 karakter.');
        if (!['admin', 'member'].includes(roleId)) throw fail(400, 'Role harus Admin atau Anggota.');
        const [existing] = await sql.query('SELECT id FROM neon_auth."user" WHERE lower(email)=lower($1)', [email]);
        if (existing) throw fail(409, 'Email sudah terdaftar di Neon Auth.');
        const provisioningAuth = createProvisioningAuth(request, url.origin, env);
        const result = await provisioningAuth.signUp.email({ email, name, password });
        const createdUser = result.data?.user;
        if (result.error || !createdUser?.id) throw fail(400, 'Neon Auth menolak pembuatan akun. Pastikan pendaftaran email aktif dan email belum digunakan.');
        await sql.query(`INSERT INTO management_members (user_id, display_name, enabled, role_id)
          VALUES ($1, $2, true, $3)`, [createdUser.id, name, roleId]);
        return reply({ ok: true }, 201);
      }
      if (path === 'members' && request.method === 'PUT') {
        requireUserManager();
        const input = await request.json();
        const userId = typeof input?.userId === 'string' ? input.userId : '';
        const roleId = typeof input?.roleId === 'string' ? input.roleId : '';
        if (!userId || userId.length > 120 || !['admin', 'member'].includes(roleId)) throw fail(400, 'Role harus Admin atau Anggota.');
        const [target] = await sql.query('SELECT can_manage_users AS "canManageUsers" FROM management_roles WHERE id=$1', [roleId]);
        if (!target) throw fail(404, 'Role tidak ditemukan.');
        if (userId === session.data.user.id && !target.canManageUsers) {
          const [others] = await sql.query(`SELECT count(*)::int AS count FROM management_members m JOIN management_roles r ON r.id=m.role_id
            WHERE m.enabled=true AND r.can_manage_users=true AND m.user_id<>$1`, [userId]);
          if (others.count === 0) throw fail(409, 'Role Anda tidak bisa diturunkan sebelum pengguna lain diberi izin mengelola role.');
        }
        const [updated] = await sql.query('UPDATE management_members SET role_id=$1 WHERE user_id=$2 AND enabled=true RETURNING user_id', [roleId, userId]);
        if (!updated) throw fail(404, 'Pengguna aktif tidak ditemukan.');
        return reply({ ok: true });
      }

      if (path === 'documents' && request.method === 'POST') {
        requireMenuManager();
        const input = await request.json();
        const title = typeof input?.title === 'string' ? input.title.trim() : '';
        const description = typeof input?.description === 'string' ? input.description.trim() : '';
        const category = typeof input?.category === 'string' ? input.category.trim().toUpperCase() : '';
        const actionType = input?.actionType;
        if (!title || title.length > 160 || description.length > 500 || category.length > 60) throw fail(400, 'Nama atau deskripsi dokumen tidak valid.');
        if (!['link', 'vehicle_picker'].includes(actionType)) throw fail(400, 'Aksi dokumen tidak valid.');
        const documentUrl = httpsUrl(typeof input.url === 'string' ? input.url.trim() : '', 'URL dokumen');
        const [document] = await sql.query(`INSERT INTO management_documents (id, title, description, category, url, action_type, icon)
          VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, '▤')
          RETURNING id, number, title, description, category, url, action_type AS "actionType", icon`,
        [title, description, category, documentUrl, actionType]);
        return reply({ document }, 201);
      }

      if (path === 'documents' && request.method === 'PUT') {
        requireMenuManager();
        const input = await request.json();
        const id = typeof input?.id === 'string' ? input.id : '';
        const title = typeof input?.title === 'string' ? input.title.trim() : '';
        const description = typeof input?.description === 'string' ? input.description.trim() : '';
        const category = typeof input?.category === 'string' ? input.category.trim().toUpperCase() : '';
        const actionType = input?.actionType;
        if (!id || id.length > 80 || !title || title.length > 160 || description.length > 500 || category.length > 60) throw fail(400, 'Data dokumen tidak valid.');
        if (!['link', 'vehicle_picker'].includes(actionType)) throw fail(400, 'Aksi dokumen tidak valid.');
        const documentUrl = httpsUrl(typeof input.url === 'string' ? input.url.trim() : '', 'URL dokumen');
        const [document] = await sql.query(`UPDATE management_documents SET title=$1, description=$2, category=$3, url=$4, action_type=$5
          WHERE id=$6 AND enabled=true
          RETURNING id, number, title, description, category, url, action_type AS "actionType", icon`,
        [title, description, category, documentUrl, actionType, id]);
        if (!document) throw fail(404, 'Dokumen tidak ditemukan.');
        return reply({ document });
      }

      if (path === 'documents' && request.method === 'DELETE') {
        requireMenuManager();
        const input = await request.json();
        if (typeof input?.id !== 'string' || !input.id || input.id.length > 80) throw fail(400, 'Dokumen tidak valid.');
        const deleted = await sql.query('DELETE FROM management_documents WHERE id = $1 RETURNING id', [input.id]);
        if (!deleted.length) throw fail(404, 'Dokumen tidak ditemukan.');
        return reply({ ok: true });
      }

      if (path === 'vehicles' && request.method === 'POST') {
        requireMenuManager();
        const input = await request.json();
        const name = typeof input?.name === 'string' ? input.name.trim() : '';
        if (!name || name.length > 120) throw fail(400, 'Nama kendaraan wajib diisi (maksimal 120 karakter).');
        const vehicleUrl = httpsUrl(typeof input.url === 'string' ? input.url.trim() : '', 'URL kendaraan');
        const [vehicle] = await sql.query(`INSERT INTO management_vehicles (id, name, url)
          VALUES (gen_random_uuid()::text, $1, $2)
          RETURNING id, sort_order AS number, name, url`, [name, vehicleUrl]);
        return reply({ vehicle }, 201);
      }

      if (path === 'vehicles' && request.method === 'PUT') {
        requireMenuManager();
        const input = await request.json();
        const id = typeof input?.id === 'string' ? input.id : '';
        const name = typeof input?.name === 'string' ? input.name.trim() : '';
        if (!id || id.length > 80 || !name || name.length > 120) throw fail(400, 'Data kendaraan tidak valid.');
        const vehicleUrl = httpsUrl(typeof input.url === 'string' ? input.url.trim() : '', 'URL kendaraan');
        const [vehicle] = await sql.query(`UPDATE management_vehicles SET name=$1, url=$2
          WHERE id=$3 AND enabled=true
          RETURNING id, sort_order AS number, name, url`, [name, vehicleUrl, id]);
        if (!vehicle) throw fail(404, 'Kendaraan tidak ditemukan.');
        return reply({ vehicle });
      }

      if (path === 'vehicles' && request.method === 'DELETE') {
        requireMenuManager();
        const input = await request.json();
        if (typeof input?.id !== 'string' || !input.id || input.id.length > 80) throw fail(400, 'Kendaraan tidak valid.');
        const deleted = await sql.query('DELETE FROM management_vehicles WHERE id = $1 RETURNING id', [input.id]);
        if (!deleted.length) throw fail(404, 'Kendaraan tidak ditemukan.');
        return reply({ ok: true });
      }

      throw fail(404, 'Endpoint tidak ditemukan.');
    } catch (error) {
      if (error.status) return reply({ error: error.message }, error.status);
      if (error?.code === '23505') {
        if (error.constraint?.includes('management_members')) return reply({ error: 'Email sudah memiliki akses ke portal.' }, 409);
        if (error.constraint?.includes('management_roles')) return reply({ error: 'Nama role sudah terdaftar.' }, 409);
        return reply({ error: 'Nama kendaraan sudah terdaftar.' }, 409);
      }
      return reply({ error: 'Layanan data sedang tidak tersedia. Coba lagi nanti.' }, 503);
    }
  };
}
