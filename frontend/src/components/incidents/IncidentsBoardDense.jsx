import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { listIncidents } from "../../api";
import { AUTO_RESOLVE_MINUTES } from "../../config";
import { formatIsoSecond } from "../../state/formatting";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

function minutesSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / 60000;
}

function statusFor(incident) {
  if (incident.status === "failed") return { kind: "failed", label: "FAILED" };
  const flags = incident.data_quality_flags || incident.key_fields?.data_quality_flags;
  if (Array.isArray(flags) && flags.length) return { kind: "ambiguous", label: "AMBIGUOUS" };
  const age = minutesSince(incident.last_call_at || incident.updated_at);
  if (age !== null && age >= AUTO_RESOLVE_MINUTES) return { kind: "resolved", label: "RESOLVED" };
  return { kind: "active", label: "ACTIVE" };
}

function locationSummary(incident) {
  const parts = [incident.address, incident.town].filter(Boolean);
  if (parts.length === 0 && incident.cross_street) return incident.cross_street;
  if (parts.length === 0) return "—";
  return parts.join(", ");
}

const IncidentRow = memo(function IncidentRow({ incident, isSelected, onSelect, rowRef }) {
  const status = statusFor(incident);
  return (
    <tr
      ref={rowRef}
      key={incident.incident_id}
      className={isSelected ? "is-selected" : ""}
      onClick={() => onSelect(incident.incident_id)}
    >
      <td className="mono">{formatIsoSecond(incident.last_call_at || incident.updated_at)}</td>
      <td className="mono">{String(incident.incident_id).slice(0, 8)}</td>
      <td>{incident.incident_type || incident.top_call_type || "—"}</td>
      <td>{locationSummary(incident)}</td>
      <td className="mono" style={{ textAlign: "right" }}>{incident.member_count ?? 0}</td>
      <td>
        <span className={`status-pill status-pill--${status.kind}`} aria-label={status.label.toLowerCase()}>
          {status.kind === "ambiguous" ? "⚠ " : ""}
          {status.label}
        </span>
      </td>
    </tr>
  );
});

function IncidentRowsSkeleton() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i} className="skeleton-row" aria-hidden="true">
      <td colSpan={6}><div className="skeleton-bar" /></td>
    </tr>
  ));
}

export function IncidentsBoardDense({ filters, refreshToken, onSelect, onActiveCountChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listIncidents({ filters, limit: 200 })
      .then((data) => { if (!cancelled) setItems(data?.items || []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, refreshToken]);

  useEffect(() => { setSelectedIndex(0); }, [items]);

  const activeCount = useMemo(
    () => items.filter((row) => statusFor(row).kind === "active").length,
    [items]
  );

  useEffect(() => {
    if (typeof onActiveCountChange === "function") onActiveCountChange(activeCount);
  }, [activeCount, onActiveCountChange]);

  useKeyboardShortcuts({
    onNext: () => setSelectedIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0))),
    onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
    onSelect: () => {
      const incident = items[selectedIndex];
      if (incident) onSelect?.(incident.incident_id);
    }
  });

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

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
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 ? (
            <IncidentRowsSkeleton />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-state empty-state--cell">
                NO INCIDENTS IN THE LAST 24 HOURS
              </td>
            </tr>
          ) : (
            items.map((incident, i) => (
              <IncidentRow
                key={incident.incident_id}
                incident={incident}
                isSelected={i === selectedIndex}
                onSelect={onSelect}
                rowRef={i === selectedIndex ? selectedRef : null}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
