import { useEffect, useState } from "react";
import { listSignals } from "../api";

export function useSignals(callId, refreshToken) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!callId) {
      setSignals([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSignals({ callId })
      .then((data) => {
        if (!cancelled) setSignals(data?.signals || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [callId, refreshToken]);

  return { signals, loading, error };
}
