import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchMetrics, fetchQuality } from "./api";
import { useLiveData } from "./useLiveData";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const tick = { fontSize: 12, fill: "var(--mute)" };
const tip = {
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--ink)",
  fontSize: 13,
};

// Contract: confidenceBuckets _id is the lower bound (0, 0.5, 0.7, 0.85).
const BUCKETS = [
  { id: 0, label: "Below 0.50" },
  { id: 0.5, label: "0.50 – 0.70" },
  { id: 0.7, label: "0.70 – 0.85" },
  { id: 0.85, label: "0.85 and above" },
];

const ICONS = {
  events: "M3 12h4l3-8 4 16 3-8h4",
  success: "M5 13l4 4L19 7",
  clock: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  users:
    "M16 11a3 3 0 100-6 3 3 0 000 6zM8 12a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5",
};

function Icon({ name }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function Kpi({ icon, label, value, unit, note, tone = "info" }) {
  return (
    <div className="card kpi" style={{ "--tone": `var(--${tone})` }}>
      <div className="kpi-icon">
        <Icon name={icon} />
      </div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">
          {value}
          <span className="kpi-unit">{unit}</span>
        </div>
        <div className="kpi-note">{note}</div>
      </div>
    </div>
  );
}

function Panel({ title, hint, empty, children }) {
  return (
    <section className="card panel">
      <h2>{title}</h2>
      <p className="hint">{hint}</p>
      {empty ? (
        <div className="empty">
          No data yet. Start the simulator to see this chart.
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Skeleton() {
  return (
    <>
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card skel" style={{ height: 96 }} />
        ))}
      </div>
      <div className="grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card skel" style={{ height: 340 }} />
        ))}
      </div>
    </>
  );
}

export default function App() {
  const m = useLiveData(fetchMetrics);
  const q = useLiveData(fetchQuality);
  const [updated, setUpdated] = useState(null);
  useEffect(() => {
    if (m.data) setUpdated(new Date());
  }, [m.data]);

  const error = m.error || q.error;
  const ready = m.data && q.data;

  return (
    <main className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <rect x="4" y="7" width="16" height="12" rx="3" />
              <path d="M12 7V4M9.5 12.5v1M14.5 12.5v1M9 16.5h6" />
            </svg>
          </div>
          <div>
            <h1>Robot interaction dashboard</h1>
            <p className="hint">
              Voice, gesture and wake-word events. Chart times are UTC.
            </p>
          </div>
        </div>
        <div className="status">
          <span className={`pill ${error ? "down" : "up"}`}>
            <i className="dot" />
            {error ? "Backend unreachable" : "Live"}
          </span>
          {updated && (
            <span className="stamp">
              Updated {updated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="banner">
          Could not load data ({error}). Check that the backend is running on
          port 3000.
          {ready && " Showing the last data received."}
        </div>
      )}

      {ready ? (
        <Content m={m.data} q={q.data} />
      ) : error ? (
        <div className="empty big">Waiting for the backend…</div>
      ) : (
        <Skeleton />
      )}
    </main>
  );
}

function Content({ m, q }) {
  const cats = q.qualityCategories;
  const donut = [
    {
      name: "Great",
      value: cats.great,
      color: "var(--good)",
      tip: "Confident and succeeded",
    },
    {
      name: "Lucky",
      value: cats.lucky,
      color: "var(--warn)",
      tip: "Unsure but succeeded",
    },
    {
      name: "Broken",
      value: cats.broken,
      color: "var(--info)",
      tip: "Confident but failed",
    },
    {
      name: "Bad",
      value: cats.bad,
      color: "var(--bad)",
      tip: "Unsure and failed",
    },
  ];
  const total = donut.reduce((s, d) => s + d.value, 0);

  const latency = m.latencyOverTime.map((d) => ({
    time: d._id,
    latency: d.avg_latency == null ? null : Math.round(d.avg_latency),
  }));
  const quality = q.qualityOverTime.map((d) => ({
    time: d._id,
    success: d.success_rate,
    confidence: Math.round(d.avg_confidence * 100),
  }));
  const buckets = BUCKETS.map((b) => ({
    range: b.label,
    count: q.confidenceBuckets.find((x) => x._id === b.id)?.count ?? 0,
    low: b.id === 0,
  }));

  const sr = num(m.successRate);
  const lat = num(m.avgProcessingLatency);

  return (
    <>
      <div className="kpis">
        <Kpi
          icon="events"
          label="Total events"
          value={num(m.totalEvents).toLocaleString()}
          note={`${m.totalSessions} sessions recorded`}
        />
        <Kpi
          icon="success"
          tone={sr >= 90 ? "good" : sr >= 75 ? "warn" : "bad"}
          label="Success rate"
          value={sr.toFixed(1)}
          unit="%"
          note={`Avg confidence ${q.avgConfidence}`}
        />
        <Kpi
          icon="clock"
          tone={lat <= 1000 ? "good" : "warn"}
          label="Processing latency"
          value={lat}
          unit=" ms"
          note={`Response ${num(m.avgResponseLatency)} ms`}
        />
        <Kpi
          icon="users"
          label="Active sessions"
          value={m.activeSessions}
          note="Open right now"
        />
      </div>

      <div className="grid">
        <Panel
          title="Processing latency over time"
          hint="Average per minute, last 60 minutes"
          empty={!latency.length}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={latency}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="range"
                tick={tick}
                tickLine={false}
                interval={0}
                axisLine={{ stroke: "var(--line)" }}
              />
              <YAxis
                unit=" ms"
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip contentStyle={tip} />
              <Area
                type="monotone"
                dataKey="latency"
                name="Latency (ms)"
                stroke="var(--info)"
                fill="var(--info)"
                fillOpacity={0.14}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Success rate and confidence over time"
          hint="Per minute, last 60 minutes"
          empty={!quality.length}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={quality}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={tick}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip contentStyle={tip} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
              <Line
                type="monotone"
                dataKey="success"
                name="Success rate (%)"
                stroke="var(--good)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="confidence"
                name="Avg confidence (×100)"
                stroke="var(--warn)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Interaction quality"
          hint="Confidence against outcome, all events"
          empty={!total}
        >
          <div className="donut">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{total}</strong>
                <span>events</span>
              </div>
            </div>
            <ul className="legend">
              {donut.map((d) => (
                <li key={d.name}>
                  <i style={{ background: d.color }} />
                  <span>
                    <b>{d.name}</b> {d.value}{" "}
                    <small>({Math.round((d.value / total) * 100)}%)</small>
                    <em>{d.tip}</em>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel
          title="Confidence distribution"
          hint="How sure the robot was, by score range"
          empty={!total}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={buckets}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="range"
                tick={tick}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
              />
              <YAxis
                allowDecimals={false}
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={tip}
                cursor={{ fill: "var(--line)", opacity: 0.4 }}
              />
              <Bar
                dataKey="count"
                name="Events"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              >
                {buckets.map((b) => (
                  <Cell
                    key={b.range}
                    fill={b.low ? "var(--bad)" : "var(--info)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}
