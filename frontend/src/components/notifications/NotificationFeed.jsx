import React, { useEffect, useState } from "react";
import { listNotificationLog } from "../../api";
import { formatIsoSecond } from "../../state/formatting";

function previewOf(payload) {
  if (!payload) return "—";
  let parsed = payload;
  if (typeof payload === "string") {
    try { parsed = JSON.parse(payload); } catch (_err) { return payload.slice(0, 120); }
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
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshToken]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const data = await listNotificationLog({ limit, offset: offset + limit });
      setEntries((prev) => [...prev, ...(data?.entries || [])]);
      setOffset((prev) => prev + limit);
    } catch (_err) {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div style={{ height: "100%", overflow: "auto" }}>
        <div className="section-title">NOTIFICATION LOG</div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="notif-row skeleton-row" aria-hidden="true">
            <div className="skeleton-bar" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ height: "100%", overflow: "auto" }}>
        <div className="section-title">NOTIFICATION LOG</div>
        <div className="empty-state">NO NOTIFICATIONS LOGGED</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div className="section-title">NOTIFICATION LOG</div>
      {entries.map((row) => {
        const preview = previewOf(row.payload);
        return (
          <div key={row.id} className="notif-row">
            <span className="ts">{formatIsoSecond(row.created_at)}</span>
            <span className="ch">
              <span className={`status-pill status-pill--${statusKind(row)}`} style={{ marginRight: 6 }}>
                {row.channel}
              </span>
            </span>
            <span className="msg" title={preview}>
              {preview}
              {row.error ? <span style={{ color: "var(--accent-red)", marginLeft: 8 }}>[{row.error}]</span> : null}
            </span>
          </div>
        );
      })}
      <div className="load-more-row">
        <button type="button" className="load-more-btn" onClick={loadMore} disabled={loading}>
          {loading ? "LOADING…" : "LOAD MORE"}
        </button>
      </div>
    </div>
  );
}
