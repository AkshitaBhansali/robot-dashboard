const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

export const fetchMetrics = () => get("/api/metrics");
export const fetchQuality = () => get("/api/quality");
