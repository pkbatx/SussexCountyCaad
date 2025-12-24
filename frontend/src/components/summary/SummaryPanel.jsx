import React, { useEffect, useMemo, useState } from "react";
import { fetchSummaryMetrics, fetchInsights, fetchDigestSummaries } from "../../api";
import { formatRelativeTime } from "../../state/formatting";

function InsightList({ title, items, emptyMessage, limit = 6 }) {
  return (
    <div className="hotspot-panel">
      <div className="trend-title">{title}</div>
      <ul className="evidence-list">
        {items?.length ? (
          items.slice(0, limit).map((entry, index) => {
            const label = entry.group_key || entry.label || "Unknown";
            const count = entry.value ?? entry.count ?? 0;
            return (
              <li key={`${label}-${index}`} className="evidence-item">
                {label} {"\u2022"} {count}
              </li>
            );
          })
        ) : (
          <li className="evidence-item">{emptyMessage}</li>
        )}
      </ul>
    </div>
  );
}

function DigestBlock({ title, entries, emptyMessage }) {
  return (
    <div className="digest-panel digest-block">
      <div className="trend-title">{title}</div>
      <ul className="digest-list">
        {entries?.length
          ? entries.map((entry, index) => {
              const timestamp = formatRelativeTime(entry.updated_at);
              const location =
                entry.address || entry.town || entry.cross_street || entry.poi || null;
              const metaParts = [entry.agency, entry.incident_type, location].filter(Boolean);
              return (
                <li key={`${entry.incident_id || index}`} className="digest-item">
                  <div className="digest-summary">{entry.summary || "Incident update pending."}</div>
                  {metaParts.length ? (
                    <div className="digest-meta">{metaParts.join(" \u00b7 ")}</div>
                  ) : null}
                  <div className="digest-time" title={timestamp.title}>
                    {timestamp.text}
                  </div>
                </li>
              );
            })
          : [<li key="empty">{emptyMessage}</li>]}
      </ul>
    </div>
  );
}

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
    const days = diffHours / 24;
    return `Last ${days}d`;
  }
  if (diffHours > 0) {
    return `Last ${diffHours}h`;
  }
  return "Current window";
}

export function SummaryPanel({ filters, refreshToken, variant = "full" }) {
  const [metrics, setMetrics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [digests, setDigests] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const nextMetrics = await fetchSummaryMetrics({ filters });
        const nextInsights = await fetchInsights({ filters, limit: 8 });
        const digestResponse = await fetchDigestSummaries({ filters });
        if (!active) return;
        setMetrics(nextMetrics);
        setInsights(nextInsights);
        setDigests(digestResponse?.digests || []);
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error.message || "Summary unavailable.");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [filters, refreshToken]);

  const digestLookup = useMemo(() => {
    return new Map(
      (digests || []).map((digest) => [digest.window_label, digest.entries || []])
    );
  }, [digests]);

  const metricsList = insights?.metrics || {};
  const windowLabel = formatWindowLabel(metrics?.windowStart, metrics?.windowEnd);
  const metricSuffix = windowLabel ? ` (${windowLabel})` : "";
  const insightSuffix = windowLabel ? ` (calls, ${windowLabel})` : " (calls)";
  const showInsights = variant !== "focus";

  return (
    <div className="summary-container">
      <div className="summary-strip-inner summary-strip-inner--focus">
        <div className="metric metric-block">
          <div className="metric-label">Incidents{metricSuffix}</div>
          <div className="metric-split">
            <div className="metric-split-item">
              <div className="metric-sub">Active</div>
              <div className="metric-value">{metrics?.incident_active_count ?? 0}</div>
            </div>
            <div className="metric-split-item">
              <div className="metric-sub">Resolved</div>
              <div className="metric-value">{metrics?.incident_resolved_count ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="metric metric-block">
          <div className="metric-label">Calls{metricSuffix}</div>
          <div className="metric-split">
            <div className="metric-split-item">
              <div className="metric-sub">Active</div>
              <div className="metric-value">{metrics?.call_active_count ?? 0}</div>
            </div>
            <div className="metric-split-item">
              <div className="metric-sub">Resolved</div>
              <div className="metric-value">{metrics?.call_resolved_count ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      <DigestBlock
        title="Incident digest (last 24h)"
        entries={digestLookup.get("24h")}
        emptyMessage={errorMessage || "No digest available for the last 24 hours."}
      />

      {showInsights ? (
        <div className="insight-grid">
          <InsightList
            title={`Most active agencies${insightSuffix}`}
            items={metricsList.agency_calls}
            emptyMessage={errorMessage || "No agency activity for current filters."}
          />
          <InsightList
            title={`Re-alert agencies${insightSuffix}`}
            items={metricsList.agency_re_alerts}
            emptyMessage="No re-alerts in this window."
          />
          <InsightList
            title={`Active towns${insightSuffix}`}
            items={metricsList.town_calls}
            emptyMessage={errorMessage || "No towns for current filters."}
          />
        </div>
      ) : null}

      {errorMessage ? (
        <div className="error-state">{errorMessage}</div>
      ) : null}
    </div>
  );
}
