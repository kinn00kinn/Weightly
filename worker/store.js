const map = (row) => ({
  id: row.id,
  weightKg: row.weight_kg,
  measuredAt: new Date(row.measured_at).toISOString(),
});

export function createD1Store(db) {
  return {
    async list(userId, since) {
      const result = await db.prepare(
        'SELECT id, weight_kg, measured_at FROM weights WHERE user_id = ? AND measured_at >= ? ORDER BY measured_at ASC',
      ).bind(userId, since).all();
      return result.results.map(map);
    },
    async create(userId, weightKg, measuredAt) {
      const result = await db.prepare(
        'INSERT INTO weights (user_id, weight_kg, measured_at, created_at) VALUES (?, ?, ?, ?)',
      ).bind(userId, weightKg, measuredAt, Date.now()).run();
      return { id: Number(result.meta.last_row_id), weightKg, measuredAt: new Date(measuredAt).toISOString() };
    },
    async update(userId, id, weightKg, measuredAt) {
      const result = await db.prepare(
        'UPDATE weights SET weight_kg = ?, measured_at = ? WHERE id = ? AND user_id = ?',
      ).bind(weightKg, measuredAt, id, userId).run();
      return result.meta.changes > 0;
    },
    async remove(userId, id) {
      const result = await db.prepare('DELETE FROM weights WHERE id = ? AND user_id = ?').bind(id, userId).run();
      return result.meta.changes > 0;
    },
  };
}
