import React, { useEffect, useMemo, useState } from "react";
import { fetchSummaryMetrics, fetchInsights, fetchDigestSummaries } from "../../api";

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? "0"}</div>
    </div>
  );
}

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

function DigestBlock({ title, lines, emptyMessage }) {
  return (
    <div className="digest-panel digest-block">
      <div className="trend-title">{title}</div>
      <div className="digest-text-block">
        <ul className="digest-bullets">
          {lines?.length
            ? lines.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)
            : [<li key="empty">{emptyMessage}</li>]}
        </ul>
      </div>
    </div>
  );
}

export function SummaryPanel({ filters, refreshToken }) {
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
      (digests || []).map((digest) => [
        digest.window_label,
        (() => {
          if (digest.summary_json) {
            try {
              return JSON.parse(digest.summary_json)?.lines || [];
            } catch (_error) {
              return [];
            }
          }
          return digest.summary_text ? digest.summary_text.split("\n") : [];
        })()
      ])
    );
  }, [digests]);

  const metricsList = insights?.metrics || {};
  const activeAgencies = metricsList.agency_calls?.length ?? 0;

  return (
    <div className="summary-container">
      <div className="summary-strip-inner">
        <Metric label="Total calls" value={metrics?.total_calls} />
        <Metric label="Active incidents" value={metrics?.active_incidents} />
        <Metric label="Re-alerts" value={metrics?.re_alert_calls} />
        <Metric label="Active agencies" value={activeAgencies} />
      </div>

      <DigestBlock
        title="Incident digest (last 24h)"
        lines={digestLookup.get("24h")}
        emptyMessage={errorMessage || "No digest available for the last 24 hours."}
      />

      <div className="insight-grid">
        <InsightList
          title="Most active agencies"
          items={metricsList.agency_calls}
          emptyMessage={errorMessage || "No agency activity for current filters."}
        />
        <InsightList
          title="Re-alert agencies"
          items={metricsList.agency_re_alerts}
          emptyMessage="No re-alerts in this window."
        />
        <InsightList
          title="Active towns"
          items={metricsList.town_calls}
          emptyMessage={errorMessage || "No towns for current filters."}
        />
      </div>

      {errorMessage ? (
        <div className="error-state">{errorMessage}</div>
      ) : null}
    </div>
  );
}
