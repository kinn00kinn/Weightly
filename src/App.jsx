import { useEffect, useMemo, useState } from 'react';
import { api, authClient } from './api.js';
import { summarize } from './trend.js';

const fmt = new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const signed = (value, digits = 1, suffix = '') => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value).toFixed(digits)}${suffix}`;
const dateInput = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
};

function TrendChart({ summary }) {
  if (!summary || summary.sorted.length < 2) return <p className="empty">2件以上の記録でグラフを表示します。</p>;
  const raw = summary.sorted.map((entry) => entry.weightKg);
  const values = [...raw, ...summary.trend];
  const min = Math.min(...values) - 0.3;
  const max = Math.max(...values) + 0.3;
  const x = (i) => 28 + 564 * i / (raw.length - 1);
  const y = (v) => 22 + (max - v) / (max - min) * 196;
  const points = (series) => series.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg className="chart" viewBox="0 0 620 240" role="img" aria-label="体重の30日トレンド">
      {[0, 1, 2, 3].map((i) => <line key={i} x1="28" x2="592" y1={28 + i * 62} y2={28 + i * 62} className="grid-line" />)}
      <polyline points={points(raw)} className="raw-line" />
      <polyline points={points(summary.trend)} className="trend-line" />
      {raw.map((v, i) => <circle key={summary.sorted[i].id} cx={x(i)} cy={y(v)} r="3.5" className="dot" />)}
    </svg>
  );
}

function Login() {
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true);
    await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin });
    setBusy(false);
  };
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">WEIGHTLY</p>
        <h1>体重の数字ではなく、流れを見る。</h1>
        <p>Googleでログインして記録とトレンドを同期します。</p>
        <button className="primary full" onClick={signIn} disabled={busy}>{busy ? '接続中…' : 'Googleでログイン'}</button>
      </section>
    </main>
  );
}

export default function App() {
  const { data: session, isPending } = authClient.useSession();
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState('input');
  const [weight, setWeight] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const summary = useMemo(() => summarize(entries), [entries]);

  const load = async () => {
    try {
      const data = await api('/api/weights?days=30');
      setEntries(data.entries);
      if (data.entries.length) setWeight(String(data.entries.at(-1).weightKg));
      setError('');
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { if (session?.user) void load(); }, [session?.user?.id]);
  if (isPending) return <p className="loading">Loading…</p>;
  if (!session?.user) return <Login />;

  const create = async (event) => {
    event.preventDefault();
    try {
      await api('/api/weights', { method: 'POST', body: JSON.stringify({ weightKg: Number(weight) }) });
      await load();
    } catch (e) { setError(e.message); }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const measuredAt = new Date(`${editing.date}T${editing.time}:00`).toISOString();
    try {
      await api(`/api/weights/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ weightKg: Number(editing.weightKg), measuredAt }) });
      setEditing(null);
      await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async () => {
    if (!editing || !window.confirm('この記録を削除しますか？')) return;
    try {
      await api(`/api/weights/${editing.id}`, { method: 'DELETE' });
      setEditing(null);
      await load();
    } catch (e) { setError(e.message); }
  };

  const edit = (entry) => setEditing({ id: entry.id, weightKg: entry.weightKg, ...dateInput(entry.measuredAt) });

  return (
    <div className="shell">
      <header className="topbar">
        <div><strong>Weightly</strong><small>{session.user.email}</small></div>
        <button className="ghost" onClick={() => authClient.signOut()}>ログアウト</button>
      </header>
      {error && <p className="error" role="alert">{error}</p>}

      <main>
        {view === 'input' && <>
          <section className="hero-card">
            <p className="eyebrow">CURRENT WEIGHT</p>
            <div className="weight-value">{summary ? summary.latestKg.toFixed(1) : '—'} <span>kg</span></div>
            {summary && <p>Trend <b>{summary.trendKg.toFixed(1)} kg</b> · {signed(summary.weeklyKg, 2, ' kg/week')}</p>}
          </section>
          <section className="card">
            <p className="eyebrow">QUICK ENTRY</p>
            <form className="entry-form" onSubmit={create}>
              <label>体重<input type="number" min="20" max="400" step="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} required /></label>
              <button className="primary">記録</button>
            </form>
            <p className="hint">日時は記録時に自動保存します。あとから修正できます。</p>
          </section>
          <section className="card">
            <div className="section-head"><div><p className="eyebrow">LATEST</p><h2>直近の記録</h2></div><button className="ghost" onClick={() => setView('edit')}>修正を見る</button></div>
            {[...entries].reverse().slice(0, 4).map((entry) => <EntryRow key={entry.id} entry={entry} onEdit={edit} />)}
          </section>
        </>}

        {view === 'edit' && <section className="card strong">
          <p className="eyebrow">EDIT RECORDS</p><h1>記録を修正</h1><p className="hint">体重・日付・時刻を変更できます。</p>
          <div className="records">{[...entries].reverse().map((entry) => <EntryRow key={entry.id} entry={entry} onEdit={edit} />)}</div>
        </section>}

        {view === 'visualize' && <>
          <section className="card strong">
            <div className="section-head"><div><p className="eyebrow">WEIGHT TREND</p><h1>30日間の推移</h1></div><b className="badge">30 DAYS</b></div>
            <TrendChart summary={summary} />
            <div className="legend"><span>━ Trend</span><span>─ 実測</span></div>
          </section>
          {summary && <section className="metrics">
            <Metric label="7 DAYS" value={signed(summary.change7d, 1, ' kg')} />
            <Metric label="30 DAYS" value={signed(summary.change30d, 1, ' kg')} />
            <Metric label="PACE" value={signed(summary.weeklyPct, 2, ' %/w')} />
            <Metric label="TREND" value={`${summary.trendKg.toFixed(1)} kg`} />
          </section>}
        </>}
      </main>

      <nav className="bottom-nav" aria-label="画面切替">
        {[['input','＋','入力'],['edit','✎','修正'],['visualize','⌁','可視化']].map(([key, icon, label]) =>
          <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><span>{icon}</span><small>{label}</small></button>)}
      </nav>

      {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}>
        <section className="modal" role="dialog" aria-modal="true" aria-label="記録を修正">
          <p className="eyebrow">EDIT</p><h2>記録を修正</h2>
          <form onSubmit={saveEdit} className="edit-form">
            <label>体重 (kg)<input type="number" min="20" max="400" step="0.1" value={editing.weightKg} onChange={(e) => setEditing({ ...editing, weightKg: e.target.value })} required /></label>
            <div className="two-cols">
              <label>日付<input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} required /></label>
              <label>時刻<input type="time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} required /></label>
            </div>
            <div className="modal-actions"><button type="button" className="danger" onClick={remove}>削除</button><span /><button type="button" className="ghost" onClick={() => setEditing(null)}>キャンセル</button><button className="primary">保存</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}

function EntryRow({ entry, onEdit }) {
  return <div className="record"><div><b>{entry.weightKg.toFixed(1)} kg</b><small>{fmt.format(new Date(entry.measuredAt))}</small></div><button className="ghost" onClick={() => onEdit(entry)}>修正</button></div>;
}

function Metric({ label, value }) {
  return <div className="metric"><p className="eyebrow">{label}</p><b>{value}</b></div>;
}
