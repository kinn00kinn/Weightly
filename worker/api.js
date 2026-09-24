const json = (body, status = 200) => Response.json(body, { status });
const validWeight = (value) => Number.isFinite(value) && value >= 20 && value <= 400;

async function body(request) {
  try { return await request.json(); } catch { return null; }
}

export async function handleApi(request, user, store) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/weights(?:\/(\d+))?$/);
  if (!match) return json({ error: 'Not found' }, 404);

  if (request.method === 'GET' && !match[1]) {
    const days = Math.min(3650, Math.max(1, Number(url.searchParams.get('days')) || 30));
    return json({ entries: await store.list(user.id, Date.now() - days * 86_400_000) });
  }

  if (request.method === 'POST' && !match[1]) {
    const data = await body(request);
    const weightKg = Number(data?.weightKg);
    if (!validWeight(weightKg)) return json({ error: 'weightKg must be between 20 and 400' }, 400);
    return json(await store.create(user.id, weightKg, Date.now()), 201);
  }

  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: 'Invalid id' }, 400);

  if (request.method === 'PATCH') {
    const data = await body(request);
    const weightKg = Number(data?.weightKg);
    const measuredAt = Date.parse(data?.measuredAt);
    if (!validWeight(weightKg) || !Number.isFinite(measuredAt)) return json({ error: 'Invalid weightKg or measuredAt' }, 400);
    return await store.update(user.id, id, weightKg, measuredAt) ? json({ ok: true }) : json({ error: 'Not found' }, 404);
  }

  if (request.method === 'DELETE') {
    return await store.remove(user.id, id) ? new Response(null, { status: 204 }) : json({ error: 'Not found' }, 404);
  }

  return json({ error: 'Method not allowed' }, 405);
}
