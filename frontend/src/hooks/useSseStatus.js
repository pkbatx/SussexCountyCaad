import { useEffect, useRef, useState } from "react";
import { POLL_INTERVAL_MS } from "../config";

export function useSseStatus({ onRefresh, enabled = true } = {}) {
  const [status, setStatus] = useState("connecting");
  const [lastEventAt, setLastEventAt] = useState(null);
  const refreshRef = useRef(onRefresh);
  const pollRef = useRef(null);
  const sseRef = useRef(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return undefined;
    }

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        const handler = refreshRef.current;
        if (!document.hidden && typeof handler === "function") {
          handler();
        }
      }, POLL_INTERVAL_MS);
    }

    function connect() {
      stopPolling();
      if (!("EventSource" in window)) {
        setStatus("disconnected");
        startPolling();
        return;
      }
      if (sseRef.current) {
        sseRef.current.close();
      }
      const sse = new EventSource("/api/events");
      sseRef.current = sse;
      setStatus("connecting");

      sse.addEventListener("refresh", () => {
        setLastEventAt(new Date().toISOString());
        const handler = refreshRef.current;
        if (!document.hidden && typeof handler === "function") {
          handler();
        }
      });

      sse.addEventListener("open", () => {
        setStatus("connected");
      });

      sse.addEventListener("error", () => {
        setStatus("disconnected");
        startPolling();
      });
    }

    connect();

    return () => {
      stopPolling();
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [enabled]);

  return { status, lastEventAt };
}
