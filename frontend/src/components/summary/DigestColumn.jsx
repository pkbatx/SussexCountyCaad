import React, { useEffect, useMemo, useState } from "react";
import { listIncidents, listAgencies } from "../../api";
import { AUTO_RESOLVE_MINUTES, TAG_NEW_WINDOW_MINUTES } from "../../config";

const STATS_WINDOW_MINUTES = 15;
const RECENT_LIMIT = 5;
const AGENCY_LIMIT = 5;

function ageMinutes(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 60000;
}

function shortClock(iso) {
  if (!iso) return "--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function locationFor(incident) {
  return incident.address || incident.town || incident.cross_street || incident.poi || "—";
}

function onSelectIncident(id) {
  if (id) window.location.hash = `incident/${id}`;
}

export function DigestColumn({ filters, refreshToken }) {
  const [incidents, setIncidents] = useState([]);
  const [agencies, setAgencies] = useState([]);

  useEffect(() => {
    let active = true;
    listIncidents({ filters, limit: 200 })
      .then((data) => { if (active) setIncidents(data?.items || []); })
      .catch(() => { if (active) setIncidents([]); });
    listAgencies({ filters })
      .then((data) => { if (active) setAgencies(data || []); })
      .catch(() => { if (active) setAgencies([]); });
    return () => { active = false; };
  }, [filters, refreshToken]);

  const stats = useMemo(() => {
    let activeCount = 0;
    let newCount = 0;
    for (const incident of incidents) {
      const age = ageMinutes(incident.last_call_at || incident.updated_at);
      if (age == null) continue;
      if (age < AUTO_RESOLVE_MINUTES) activeCount += 1;
      if (age < STATS_WINDOW_MINUTES) newCount += 1;
    }
    return { activeCount, newCount };
  }, [incidents]);

  const recent = useMemo(
    () =>
      [...incidents]
        .sort((a, b) => {
          const at = new Date(a.last_call_at || a.updated_at || 0).getTime();
          const bt = new Date(b.last_call_at || b.updated_at || 0).getTime();
          return bt - at;
        })
        .slice(0, RECENT_LIMIT),
    [incidents]
  );

  const topAgencies = useMemo(
    () =>
      [...agencies]
        .filter((agency) => (agency.call_count ?? 0) > 0)
        .sort((a, b) => (b.call_count ?? 0) - (a.call_count ?? 0))
        .slice(0, AGENCY_LIMIT),
    [agencies]
  );

  const isEmpty = incidents.length === 0 && topAgencies.length === 0;
  const windowLabel = `LAST ${STATS_WINDOW_MINUTES} MIN`;

  if (isEmpty) {
    return (
      <section className="digest-col">
        <div className="digest-title">DIGEST</div>
        <div className="digest-empty">
          <div className="digest-empty-glyph">—</div>
          <div className="digest-empty-text">NO ACTIVITY</div>
          <div className="digest-empty-window">{windowLabel}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="digest-col">
      <div className="digest-title">DIGEST</div>

      <div className="digest-section">
        <div className="digest-section-title">{windowLabel}</div>
        <div className="digest-stats">
          <div className="digest-stat">
            <div
              className="digest-stat-num"
              style={stats.activeCount > 0 ? { color: "var(--accent-blue)" } : undefined}
            >
              {stats.activeCount}
            </div>
            <div className="digest-stat-label">ACTIVE</div>
          </div>
          <div className="digest-stat">
            <div
              className="digest-stat-num"
              style={stats.newCount > 0 ? { color: "var(--accent-cyan)" } : undefined}
            >
              {stats.newCount}
            </div>
            <div className="digest-stat-label">NEW</div>
          </div>
        </div>
      </div>

      <div className="digest-section">
        <div className="digest-section-title">RECENT</div>
        {recent.length === 0 ? (
          <div className="digest-empty-row">—</div>
        ) : (
          recent.map((incident) => (
            <button
              key={incident.incident_id}
              type="button"
              className="digest-recent-row"
              onClick={() => onSelectIncident(incident.incident_id)}
            >
              <div className="digest-recent-row-1">
                <span className="digest-recent-time">{shortClock(incident.last_call_at || incident.updated_at)}</span>
                <span className="digest-recent-type">
                  {(incident.incident_type || incident.top_call_type || "INCIDENT").toString().toUpperCase()}
                </span>
              </div>
              <div className="digest-recent-row-2">
                {incident.member_count ?? 1} call{(incident.member_count ?? 1) === 1 ? "" : "s"} · {locationFor(incident)}
              </div>
            </button>
          ))
        )}
      </div>

      {topAgencies.length > 0 ? (
        <div className="digest-section">
          <div className="digest-section-title">AGENCIES</div>
          {topAgencies.map((agency) => (
            <div key={agency.canonical_name} className="digest-agency-row">
              <span className="digest-agency-name">{agency.canonical_name}</span>
              <span className="digest-agency-count">{agency.call_count}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
