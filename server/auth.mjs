import { createAuthServer, serializeSetCookie, resolveNeonAuthLogging } from '@neon/auth/server';

export function createAuth(request, headers, env) {
  if (!env.NEON_AUTH_BASE_URL || !env.NEON_AUTH_COOKIE_SECRET || env.NEON_AUTH_COOKIE_SECRET.length < 32 || !env.DATABASE_URL) throw new Error('CONFIG');
  const auth = createAuthServer({
    baseUrl: env.NEON_AUTH_BASE_URL, cookieSecret: env.NEON_AUTH_COOKIE_SECRET, sameSite: 'strict',
    log: resolveNeonAuthLogging({ logLevel: 'silent' }),
    context: () => ({
      getCookies: () => request.headers.get('cookie') || '',
      setCookie: (name, value, options) => headers.append('set-cookie', serializeSetCookie({ name, value, ...options })),
      getHeader: name => request.headers.get(name), getOrigin: () => new URL(request.url).origin, getFramework: () => 'netlify'
    })
  });
  return auth;
}
