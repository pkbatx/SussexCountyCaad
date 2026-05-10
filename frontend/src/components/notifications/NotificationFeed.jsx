import React, { useEffect, useState } from "react";
import { listNotificationLog } from "../../api";

function formatTs(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function previewOf(payload) {
  if (!payload) return "—";
  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload);
    } catch (_err) {
      return payload.slice(0, 120);
    }
  }
  return parsed.text || parsed.content || JSON.stringify(parsed).slice(0, 120);
}

function statusKind(row) {
  if (row.error) return "failed";
  if (Number.isFinite(row.status) && row.status >= 200 && row.status < 300) return "active";
  return "ambiguous";
}

export function NotificationFeed({ refreshToken }) {
  const [entries, setEntries] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listNotificationLog({ limit, offset: 0 })
      .then((data) => {
        if (cancelled) return;
        setEntries(data?.entries || []);
        setOffset(0);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const data = await listNotificationLog({ limit, offset: offset + limit });
      setEntries((prev) => [...prev, ...(data?.entries || [])]);
      setOffset((prev) => prev + limit);
    } catch (_err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div className="section-title">NOTIFICATION LOG</div>
      {entries.length === 0 ? (
        <div style={{ padding: 16, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>
          {loading ? "Loading…" : "No notifications recorded."}
        </div>
      ) : (
        <div>
          {entries.map((row) => (
            <div key={row.id} className="notif-row">
              <span className="ts">{formatTs(row.created_at)}</span>
              <span className="ch">
                <span className={`status-pill status-pill--${statusKind(row)}`} style={{ marginRight: 6 }}>
                  {row.channel}
                </span>
              </span>
              <span className="msg" title={previewOf(row.payload)}>
                {previewOf(row.payload)}
                {row.error ? <span style={{ color: "var(--accent-red)", marginLeft: 8 }}>[{row.error}]</span> : null}
              </span>
            </div>
          ))}
          <div style={{ padding: 12, textAlign: "center" }}>
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                padding: "4px 12px",
                cursor: "pointer"
              }}
            >
              {loading ? "LOADING…" : "LOAD MORE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
