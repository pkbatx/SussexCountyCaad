import React, { useEffect, useState } from "react";
import { listCalls } from "../../api";

function NavItem({ active, onClick, label, count }) {
  return (
    <a className={active ? "is-active" : ""} onClick={onClick}>
      <span>{label}</span>
      {Number.isFinite(count) ? <span className="count mono">{count}</span> : null}
    </a>
  );
}

function PipelineHealth({ refreshToken }) {
  const [stages, setStages] = useState({});

  useEffect(() => {
    let cancelled = false;
    listCalls({ limit: 25 })
      .then((data) => {
        if (cancelled) return;
        const tally = {};
        for (const item of data.items || []) {
          for (const stage of ["transcription", "grouping"]) {
            const key = `${stage}:${item[`${stage}_status`] || "unknown"}`;
            tally[key] = (tally[key] || 0) + 1;
          }
        }
        setStages(tally);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const entries = Object.entries(stages).sort(([a], [b]) => a.localeCompare(b));

  return (
    <details className="pipeline-health">
      <summary>PIPELINE HEALTH</summary>
      <div style={{ marginTop: 8 }}>
        {entries.length === 0 ? (
          <div className="stage-row"><span className="stage-name">no recent calls</span></div>
        ) : (
          entries.map(([key, count]) => {
            const [stage, status] = key.split(":");
            return (
              <div key={key} className="stage-row">
                <span className="stage-name">{stage}</span>
                <span className="stage-status">{status} · {count}</span>
              </div>
            );
          })
        )}
      </div>
    </details>
  );
}

export function LeftRail({ route, setRoute, activeIncidents, refreshToken }) {
  return (
    <aside className="tactical-rail" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div className="section-title">CONSOLE</div>
        <nav className="tactical-nav">
          <NavItem
            active={route === "incidents" || route.startsWith("incident/") || route.startsWith("call/")}
            onClick={() => setRoute("incidents")}
            label="Incidents"
            count={activeIncidents}
          />
          <NavItem
            active={route === "notifications"}
            onClick={() => setRoute("notifications")}
            label="Notifications"
          />
        </nav>
      </div>
      <PipelineHealth refreshToken={refreshToken} />
    </aside>
  );
}
