import { neon } from '@neondatabase/serverless';
import { createAuth } from './auth.mjs';

export function createHandler({ env = process.env } = {}) {
  return async request => {
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    try {
      const url = new URL(request.url);
      if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Metode tidak didukung.' }, 405);
      if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) return reply({ error: 'Asal permintaan tidak diizinkan.' }, 403);
      const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
      const auth = createAuth(request, headers, env);
      if (path === 'login' && request.method === 'POST') {
        const input = await request.json();
        if (typeof input?.email !== 'string' || input.email.length > 254 || typeof input.password !== 'string' || !input.password || input.password.length > 128) return reply({ error: 'Email dan kata sandi wajib diisi.' }, 400);
        const result = await auth.signIn.email({ email: input.email.trim(), password: input.password });
        const id = result.data?.user?.id;
        if (result.error || !id) return reply({ error: 'Login gagal. Periksa email dan kata sandi.' }, 401);
        try {
          const [member] = await neon(env.DATABASE_URL).query('SELECT display_name FROM management_members WHERE user_id = $1 AND enabled = true', [id]);
          if (!member) { await auth.signOut(); return reply({ error: 'Akun belum diberi akses oleh pengelola.' }, 403); }
          return reply({ user: { name: member.display_name } });
        } catch { await auth.signOut(); throw new Error('DB'); }
      }
      if (path === 'logout' && request.method === 'POST') { await auth.signOut(); return reply({ ok: true }); }
      if (path === 'session' && request.method === 'GET') {
        const session = await auth.getSession({ query: { disableCookieCache: 'true' } });
        const id = session.data?.user?.id;
        if (!id) return reply({ error: 'Sesi berakhir.' }, 401);
        const [member] = await neon(env.DATABASE_URL).query('SELECT display_name FROM management_members WHERE user_id = $1 AND enabled = true', [id]);
        if (!member) { await auth.signOut(); return reply({ error: 'Akun tidak memiliki akses.' }, 403); }
        return reply({ user: { name: member.display_name } });
      }
      return reply({ error: 'Endpoint tidak ditemukan.' }, 404);
    } catch (error) {
      if (error.message === 'CONFIG') return reply({ error: 'Layanan online belum dikonfigurasi.' }, 503);
      return reply({ error: 'Layanan data sedang tidak tersedia. Coba lagi nanti.' }, 503);
    }
  };
}
