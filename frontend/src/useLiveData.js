import { useEffect, useState } from "react";

// Polls fetchFn every `ms`. Keeps the last good data if a refresh fails.
export function useLiveData(fetchFn, ms = 5000) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchFn();
        if (alive) setState({ data, error: null, loading: false });
      } catch (e) {
        if (alive) setState((s) => ({ ...s, error: e.message, loading: false }));
      }
    };
    load();
    const id = setInterval(load, ms);
    return () => { alive = false; clearInterval(id); };
  }, [fetchFn, ms]);

  return state;
}
