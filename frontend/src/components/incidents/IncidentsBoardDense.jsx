import React, { useEffect, useMemo, useState } from "react";
import { listIncidents } from "../../api";
import { AUTO_RESOLVE_MINUTES } from "../../config";

function minutesSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / 60000;
}

function shortHash(id) {
  if (!id) return "—";
  return String(id).slice(0, 8);
}

function formatTs(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function statusFor(incident) {
  if (incident.status === "failed") return { kind: "failed", label: "FAILED" };
  const flags = incident.data_quality_flags || incident.key_fields?.data_quality_flags;
  if (Array.isArray(flags) && flags.length) {
    return { kind: "ambiguous", label: "AMBIGUOUS" };
  }
  const age = minutesSince(incident.last_call_at || incident.updated_at);
  if (age !== null && age >= AUTO_RESOLVE_MINUTES) {
    return { kind: "resolved", label: "RESOLVED" };
  }
  return { kind: "active", label: "ACTIVE" };
}

function locationSummary(incident) {
  const parts = [incident.address, incident.town].filter(Boolean);
  if (parts.length === 0 && incident.cross_street) return incident.cross_street;
  if (parts.length === 0) return "—";
  return parts.join(", ");
}

export function IncidentsBoardDense({ filters, refreshToken, onSelect, onActiveCountChange, onSelectCall }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listIncidents({ filters, limit: 200 })
      .then((data) => {
        if (cancelled) return;
        setItems(data?.items || []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, refreshToken]);

  const activeCount = useMemo(
    () => items.filter((row) => statusFor(row).kind === "active").length,
    [items]
  );

  useEffect(() => {
    if (typeof onActiveCountChange === "function") onActiveCountChange(activeCount);
  }, [activeCount, onActiveCountChange]);

  const handleSelect = (incident) => {
    setSelectedId(incident.incident_id);
    if (onSelect) onSelect(incident.incident_id);
  };

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <table className="dense-table">
        <thead>
          <tr>
            <th style={{ width: 170 }}>TIMESTAMP</th>
            <th style={{ width: 100 }}>INCIDENT</th>
            <th style={{ width: 140 }}>TYPE</th>
            <th>LOCATION</th>
            <th style={{ width: 60, textAlign: "right" }}>CALLS</th>
            <th style={{ width: 110 }}>STATUS</th>
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 ? (
            <tr><td colSpan={7} className="mono" style={{ color: "var(--text-muted)", padding: 16 }}>Loading…</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={7} className="mono" style={{ color: "var(--text-muted)", padding: 16 }}>No incidents match the current filters.</td></tr>
          ) : (
            items.map((incident) => {
              const status = statusFor(incident);
              const isSelected = incident.incident_id === selectedId;
              const firstCallId = incident.first_call_id || incident.calls?.[0]?.call_id;
              return (
                <tr
                  key={incident.incident_id}
                  className={isSelected ? "is-selected" : ""}
                  onClick={() => handleSelect(incident)}
                >
                  <td className="mono">{formatTs(incident.last_call_at || incident.updated_at)}</td>
                  <td className="mono">{shortHash(incident.incident_id)}</td>
                  <td>{incident.incident_type || incident.top_call_type || "—"}</td>
                  <td>{locationSummary(incident)}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{incident.member_count ?? 0}</td>
                  <td>
                    <span className={`status-pill status-pill--${status.kind}`}>
                      {status.kind === "ambiguous" ? "⚠ " : ""}
                      {status.label}
                    </span>
                  </td>
                  <td>
                    {firstCallId && onSelectCall ? (
                      <button
                        type="button"
                        title="Play first call"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectCall(firstCallId);
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                          fontFamily: "IBM Plex Mono, monospace",
                          fontSize: 11,
                          padding: "2px 6px",
                          cursor: "pointer"
                        }}
                      >
                        ▶
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
