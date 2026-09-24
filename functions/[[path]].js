import worker from '../worker/index.js';

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (!path.startsWith('/api/')) return context.next();
  return worker.fetch(context.request, context.env);
}
