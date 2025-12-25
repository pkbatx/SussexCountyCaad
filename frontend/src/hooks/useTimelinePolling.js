import { useEffect, useRef, useState } from "react";
import { fetchIncidentTimeline } from "../api";

function mergeTimeline(prev, next) {
  if (!prev) return next;
  const prevEvents = new Map((prev.events || []).map((event) => [event.event_id, event]));
  const mergedEvents = (next.events || []).map((event) => ({
    ...prevEvents.get(event.event_id),
    ...event
  }));
  return {
    ...prev,
    ...next,
    events: mergedEvents
  };
}

export function useTimelinePolling({
  incidentId,
  refreshToken,
  intervalMs = 5000
} = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(incidentId));
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    if (!incidentId) {
      setData(null);
      setLoading(false);
      setError("");
      return undefined;
    }

    let active = true;
    const load = async () => {
      try {
        const next = await fetchIncidentTimeline(incidentId);
        if (!active) return;
        setData((prev) => mergeTimeline(prev, next));
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load timeline");
      } finally {
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    load();
    return () => {
      active = false;
    };
  }, [incidentId, refreshToken]);

  useEffect(() => {
    if (!incidentId || intervalMs <= 0) {
      return undefined;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    pollRef.current = setInterval(() => {
      fetchIncidentTimeline(incidentId)
        .then((next) => {
          setData((prev) => mergeTimeline(prev, next));
          setError("");
        })
        .catch((err) => {
          setError(err.message || "Failed to refresh timeline");
        });
    }, intervalMs);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [incidentId, intervalMs]);

  return { data, loading, error };
}
