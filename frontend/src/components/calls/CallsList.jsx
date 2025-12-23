import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listCalls } from "../../api";

function formatTimestamp(value) {
  if (!value) return { text: "Unknown time", title: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { text: value, title: "" };
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  let text = "Just now";
  if (diffSeconds >= 60) {
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      text = `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        text = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        text = `${diffDays}d ago`;
      }
    }
  }
  return { text, title: date.toLocaleString() };
}

export function CallsList({ filters, onSelect, onPlay, refreshToken }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const prevFiltersRef = useRef("");

  const limit = 50;

  const loadPage = useCallback(
    async ({ replace = false, nextOffset = 0 } = {}) => {
      setLoading(true);
      setError("");
      try {
        const result = await listCalls({ filters, limit, offset: nextOffset });
        setTotal(result.total ?? 0);
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setOffset(nextOffset + result.items.length);
      } catch (err) {
        setError(`Failed to load calls: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    const snapshot = JSON.stringify(filters || {});
    const filtersChanged = prevFiltersRef.current !== snapshot;
    prevFiltersRef.current = snapshot;
    if (filtersChanged) {
      setItems([]);
      setTotal(0);
      setOffset(0);
    }
    loadPage({ replace: true, nextOffset: 0 });
  }, [filters, refreshToken, loadPage]);

  const showEmpty = useMemo(() => !loading && !error && total === 0 && offset === 0, [loading, error, total, offset]);
  const canLoadMore = offset < total;

  return (
    <div className="calls-view">
      <ul className="call-list">
        {items.map((call) => {
          const statusValue = call.status === "processing" || call.status === "pending"
            ? "active"
            : call.status || "unknown";
          const agency = call.agency || "Unknown";
          const serviceType = call.service_type ? ` \u00b7 ${call.service_type}` : "";
          const location = call.address || call.town || "Location unknown";
          const metaLine = [agency, call.incident_type].filter(Boolean).join(" \u00b7 ");
          const incidentLabel = call.incident_linked ? "Linked to incident" : "Unlinked";
          const timestamp = formatTimestamp(call.first_seen_at || call.created_at);
          const serviceClass = call.service_type ? call.service_type.toLowerCase() : "unknown";
          const typeBadge = call.service_type
            ? (
              <span className={`type-pill type-${serviceClass}`}>{call.service_type}</span>
            )
            : null;
          const callId = call.call_id || call.callId;

          return (
            <li
              key={callId}
              className="cad-card"
              data-service={serviceClass}
              onClick={() => onSelect(callId)}
            >
              <div className="cad-card-main">
                <div className="cad-card-title">{location}</div>
                <div className="cad-card-meta">
                  {metaLine || "Unspecified"} {typeBadge}
                </div>
                <div className="cad-card-meta">{agency}{serviceType}</div>
                <div className="cad-card-meta">{incidentLabel}</div>
                <div className="incident-updated" title={timestamp.title}>
                  {timestamp.text}
                </div>
              </div>
              <div className="cad-card-status">
                <span className={`status-badge status-${statusValue}`}>{statusValue}</span>
                <button
                  className="button small call-play"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onPlay) {
                      onPlay(callId);
                    }
                  }}
                  disabled={!onPlay}
                >
                  Play
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {showEmpty ? (
        <div className="empty-state">No calls match the current filters.</div>
      ) : null}
      {error ? <div className="empty-state">{error}</div> : null}

      {canLoadMore ? (
        <button
          className="button small"
          type="button"
          onClick={() => loadPage({ nextOffset: offset })}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
