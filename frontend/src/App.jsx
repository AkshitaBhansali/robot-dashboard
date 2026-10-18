import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { fetchMetrics, fetchQuality } from "./api";
import { useLiveData } from "./useLiveData";

const C = { good: "#0F7B6C", warn: "#D98E04", bad: "#C23B3B", info: "#2F5FD0", mute: "#8A94A3" };
const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

// Contract: _id is the lower bound of each bucket (0, 0.5, 0.7, 0.85).
const bucketLabel = (id) =>
  ({ 0: "Below 0.50", 0.5: "0.50 – 0.70", 0.7: "0.70 – 0.85", 0.85: "0.85 and above" }[id] ?? "Other");

function Kpi({ label, value, unit, note }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}<span className="kpi-unit">{unit}</span></div>
      <div className="kpi-note">{note}</div>
    </div>
  );
}

function Panel({ title, hint, empty, children }) {
  return (
    <section className="card panel">
      <h2>{title}</h2>
      {hint && <p className="hint">{hint}</p>}
      {empty ? <div className="empty">No data yet. Start the simulator to see this chart.</div> : children}
    </section>
  );
}

export default function App() {
  const m = useLiveData(fetchMetrics);
  const q = useLiveData(fetchQuality);
  const error = m.error || q.error;
  const ready = m.data && q.data;

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Robot interaction dashboard</h1>
          <p className="hint">Refreshes every 5 seconds. Times on the charts are UTC.</p>
        </div>
        <span className={`pill ${error ? "down" : "up"}`}>{error ? "Backend unreachable" : "Live"}</span>
      </header>

      {error && (
        <div className="banner">
          Could not load data ({error}). Check that the backend is running on port 3000.
          {ready && " Showing the last data received."}
        </div>
      )}

      {!ready ? (
        <div className="empty big">{error ? "Waiting for the backend…" : "Loading…"}</div>
      ) : (
        <Content m={m.data} q={q.data} />
      )}
    </main>
  );
}

function Content({ m, q }) {
  const cats = q.qualityCategories;
  const donut = [
    { name: "Great", value: cats.great, color: C.good, tip: "Confident and succeeded" },
    { name: "Lucky", value: cats.lucky, color: C.warn, tip: "Unsure but succeeded" },
    { name: "Broken", value: cats.broken, color: C.info, tip: "Confident but failed" },
    { name: "Bad", value: cats.bad, color: C.bad, tip: "Unsure and failed" },
  ];
  const donutTotal = donut.reduce((s, d) => s + d.value, 0);

  const latency = m.latencyOverTime.map((d) => ({ time: d._id, latency: d.avg_latency == null ? null : Math.round(d.avg_latency) }));
  const quality = q.qualityOverTime.map((d) => ({ time: d._id, success: d.success_rate, confidence: Math.round(d.avg_confidence * 100) }));
  const buckets = q.confidenceBuckets.map((b) => ({ range: bucketLabel(b._id), count: b.count, bad: b._id === 0 }));

  return (
    <>
      <div className="kpis">
        <Kpi label="Total events" value={num(m.totalEvents).toLocaleString()} note={`${m.totalSessions} sessions recorded`} />
        <Kpi label="Success rate" value={num(m.successRate).toFixed(1)} unit="%" note={`Avg confidence ${q.avgConfidence}`} />
        <Kpi label="Processing latency" value={num(m.avgProcessingLatency)} unit=" ms" note={`Response ${num(m.avgResponseLatency)} ms`} />
        <Kpi label="Active sessions" value={m.activeSessions} note="Open right now" />
      </div>

      <div className="grid">
        <Panel title="Processing latency over time" hint="Average per minute, last 60 minutes" empty={!latency.length}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={latency}>
              <CartesianGrid stroke="#E6E9EE" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis unit=" ms" tick={{ fontSize: 12 }} width={64} />
              <Tooltip />
              <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke={C.info} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Success rate and confidence over time" hint="Per minute, last 60 minutes" empty={!quality.length}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={quality}>
              <CartesianGrid stroke="#E6E9EE" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} width={48} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="success" name="Success rate (%)" stroke={C.good} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="confidence" name="Avg confidence (×100)" stroke={C.warn} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Interaction quality" hint="Confidence against outcome, all events" empty={!donutTotal}>
          <div className="donut">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={2} isAnimationActive={false}>
                    {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center"><strong>{donutTotal}</strong><span>events</span></div>
            </div>
            <ul className="legend">
              {donut.map((d) => (
                <li key={d.name}>
                  <i style={{ background: d.color }} />
                  <span><b>{d.name}</b> {d.value} <em>{d.tip}</em></span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Confidence distribution" hint="How sure the robot was, by score range" empty={!buckets.length}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={buckets}>
              <CartesianGrid stroke="#E6E9EE" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
              <Tooltip />
              <Bar dataKey="count" name="Events" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {buckets.map((b) => <Cell key={b.range} fill={b.bad ? C.bad : C.info} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}
