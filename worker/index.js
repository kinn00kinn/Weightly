import { betterAuth } from 'better-auth';
import { handleApi } from './api.js';
import { createD1Store } from './store.js';

function createAuth(env) {
  if (!env.DB || !env.BETTER_AUTH_SECRET) throw new Error('DB and BETTER_AUTH_SECRET are required');
  const socialProviders = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {};
  return betterAuth({
    appName: 'Weightly',
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_ORIGIN].filter(Boolean),
    socialProviders,
    rateLimit: { enabled: true, storage: 'database' },
  });
}

function cors(response, request, env) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get('origin');
  if (origin && origin === env.WEB_ORIGIN) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-credentials', 'true');
    headers.set('vary', 'Origin');
  }
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), request, env);
    const auth = createAuth(env);
    const path = new URL(request.url).pathname;
    let response;
    if (path.startsWith('/api/auth/')) {
      response = await auth.handler(request);
    } else if (path.startsWith('/api/weights')) {
      const session = await auth.api.getSession({ headers: request.headers });
      response = session?.user
        ? await handleApi(request, session.user, createD1Store(env.DB))
        : Response.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      response = Response.json({ error: 'Not found' }, { status: 404 });
    }
    return cors(response, request, env);
  },
};
