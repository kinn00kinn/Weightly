import test from 'node:test';
import assert from 'node:assert/strict';
import { ewma, summarize } from '../src/trend.js';

test('ewma preserves a constant series', () => {
  assert.deepEqual(ewma([70, 70, 70]), [70, 70, 70]);
});

test('summarize returns null for no entries', () => {
  assert.equal(summarize([]), null);
});

test('summarize calculates a downward weekly trend', () => {
  const entries = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    weightKg: 72 - i * 0.2,
    measuredAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
  }));
  const result = summarize(entries);
  assert.ok(result.weeklyKg < 0);
  assert.ok(result.weeklyPct < 0);
  assert.equal(result.latestKg, 70.6);
  assert.ok(Math.abs(result.change7d + 1.4) < 1e-9);
});
