import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../worker/api.js';
import { createD1Store } from '../worker/store.js';

const user = { id: 'user-a' };

test('POST validates weight and records authenticated user', async () => {
  let call;
  const store = { create: async (...args) => { call = args; return { id: 1, weightKg: args[1], measuredAt: new Date(args[2]).toISOString() }; } };
  const bad = await handleApi(new Request('https://api.test/api/weights', { method: 'POST', body: JSON.stringify({ weightKg: 2 }) }), user, store);
  assert.equal(bad.status, 400);
  const before = Date.now();
  const good = await handleApi(new Request('https://api.test/api/weights', { method: 'POST', body: JSON.stringify({ weightKg: 70.2 }) }), user, store);
  assert.equal(good.status, 201);
  assert.equal(call[0], 'user-a');
  assert.equal(call[1], 70.2);
  assert.ok(call[2] >= before && call[2] <= Date.now());
});

test('PATCH scopes the D1 update by user id', async () => {
  let sql, bindings;
  const db = { prepare(query) { sql = query; return { bind(...args) { bindings = args; return { run: async () => ({ meta: { changes: 1 } }) }; } }; } };
  const store = createD1Store(db);
  const ok = await store.update('user-a', 42, 69.8, 123456);
  assert.equal(ok, true);
  assert.match(sql, /WHERE id = \? AND user_id = \?/);
  assert.deepEqual(bindings, [69.8, 123456, 42, 'user-a']);
});

test('DELETE returns 404 when the scoped record is absent', async () => {
  const store = { remove: async (userId, id) => userId === 'other' && id === 1 };
  const response = await handleApi(new Request('https://api.test/api/weights/1', { method: 'DELETE' }), user, store);
  assert.equal(response.status, 404);
});
