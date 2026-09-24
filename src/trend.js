export function ewma(values, alpha = 0.23) {
  if (!values.length) return [];
  const out = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

export function summarize(entries) {
  if (!entries.length) return null;
  const sorted = [...entries].sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt));
  const weights = sorted.map((entry) => entry.weightKg);
  const trend = ewma(weights);
  const firstAt = new Date(sorted[0].measuredAt).getTime();
  const lastAt = new Date(sorted.at(-1).measuredAt).getTime();
  const days = Math.max(1, (lastAt - firstAt) / 86_400_000);
  const weeklyKg = (trend.at(-1) - trend[0]) / days * 7;
  const cutoff = lastAt - 7 * 86_400_000;
  const recent = sorted.filter((entry) => new Date(entry.measuredAt).getTime() >= cutoff);
  const change7d = recent.length > 1 ? recent.at(-1).weightKg - recent[0].weightKg : 0;
  const change30d = weights.at(-1) - weights[0];
  return {
    sorted,
    trend,
    latestKg: weights.at(-1),
    trendKg: trend.at(-1),
    change7d,
    change30d,
    weeklyKg,
    weeklyPct: weeklyKg / trend.at(-1) * 100,
  };
}
