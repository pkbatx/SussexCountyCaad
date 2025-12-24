import React, { useEffect, useMemo, useState } from "react";
import { fetchSummaryMetrics } from "../../api";

function formatWindowLabel(start, end) {
  if (!start || !end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }
  const diffMs = Math.max(endDate.getTime() - startDate.getTime(), 0);
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours >= 24 && diffHours % 24 === 0) {
    return `Last ${diffHours / 24}d`;
  }
  if (diffHours > 0) {
    return `Last ${diffHours}h`;
  }
  return "Current window";
}

export function MetricsPanel({ filters, refreshToken }) {
  const [metrics, setMetrics] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const nextMetrics = await fetchSummaryMetrics({ filters });
        if (!active) return;
        setMetrics(nextMetrics);
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error.message || "Metrics unavailable.");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [filters, refreshToken]);

  const windowLabel = useMemo(
    () => formatWindowLabel(metrics?.windowStart, metrics?.windowEnd),
    [metrics?.windowStart, metrics?.windowEnd]
  );

  const tiles = [
    {
      label: "Active incidents",
      value: metrics?.incident_active_count ?? 0
    },
    {
      label: "Active calls",
      value: metrics?.call_active_count ?? 0
    },
    {
      label: "Resolved incidents",
      value: metrics?.incident_resolved_count ?? 0
    },
    {
      label: "Resolved calls",
      value: metrics?.call_resolved_count ?? 0
    }
  ];

  return (
    <section className="metrics-panel">
      <div className="metrics-header">
        <div className="panel-title">Operational metrics</div>
        {windowLabel ? (
          <div className="metrics-window">{windowLabel}</div>
        ) : null}
      </div>
      <div className="metrics-grid">
        {tiles.map((tile) => (
          <div key={tile.label} className="metrics-tile">
            <div className="metrics-label">{tile.label}</div>
            <div className="metrics-value">{tile.value}</div>
          </div>
        ))}
      </div>
      {errorMessage ? <div className="error-state">{errorMessage}</div> : null}
    </section>
  );
}
