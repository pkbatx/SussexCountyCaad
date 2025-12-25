import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listCalls, listIncidents } from "../../api";
import {
  AUTO_RESOLVE_MINUTES,
  MONITOR_WINDOW_MINUTES,
  TAG_NEW_WINDOW_MINUTES,
  TAG_UPDATED_WINDOW_MINUTES
} from "../../config";
import { formatConfidenceSignal, formatRelativeTime } from "../../state/formatting";

function minutesSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (1000 * 60);
}

function deriveBucket(incident) {
  const updatedAt = incident.last_call_at || incident.updated_at;
  const ageMinutes = minutesSince(updatedAt);
  if (ageMinutes === null) {
    return { bucket: "active", label: "Active", ageMinutes: null };
  }
  if (ageMinutes >= AUTO_RESOLVE_MINUTES) {
    return { bucket: "resolved", label: "Resolved", ageMinutes };
  }
  if (ageMinutes >= MONITOR_WINDOW_MINUTES) {
    return { bucket: "monitoring", label: "Monitoring", ageMinutes };
  }
  return { bucket: "active", label: "Active", ageMinutes };
}

function buildTags(incident) {
  const tags = [];
  const memberCount = incident.member_count ?? 0;
  const reAlertCount = incident.re_alert_count ?? 0;
  const updatedAt = incident.last_call_at || incident.updated_at;
  const ageMinutes = minutesSince(updatedAt);

  if (ageMinutes !== null) {
    if (ageMinutes <= TAG_NEW_WINDOW_MINUTES && memberCount <= 1) {
      tags.push("New");
    } else if (ageMinutes <= TAG_UPDATED_WINDOW_MINUTES) {
      tags.push("Updated");
    }
  }

  if (memberCount >= 2) tags.push("Multi-Call");
  if (reAlertCount > 0) tags.push("Re-alert");
  if (incident.pending) tags.push("Rollup pending");
  if (!incident.address && !incident.town) tags.push("Unmapped");
  if (!incident.incident_type || incident.status === "failed") {
    tags.push("Needs Attention");
  }

  return tags;
}

function AgencyList({ agencies }) {
  const [expanded, setExpanded] = useState(false);
  if (!agencies.length) return null;
  if (agencies.length <= 2) {
    return agencies.map((agency) => (
      <span key={agency} className="agency-chip">
        {agency}
      </span>
    ));
  }
  const primary = agencies.slice(0, 2);
  const remainder = agencies.slice(2);
  return (
    <>
      {primary.map((agency) => (
        <span key={agency} className="agency-chip">
          {agency}
        </span>
      ))}
      <button
        className="agency-more"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((prev) => !prev);
        }}
      >
        {expanded ? `${"\u25be"} hide` : `${"\u25b8"} ${remainder.length}`}
      </button>
      {expanded ? (
        <span className="agency-extra">
          {remainder.map((agency) => (
            <span key={agency} className="agency-chip">
              {agency}
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
}

function resolveProgressLabel(progressState) {
  const value = String(progressState || "");
  if (value === "transcribing") return "Transcribing";
  if (value === "analyzing") return "Analyzing";
  if (value === "pending_incident") return "Pending incident";
  if (value === "failed") return "Needs attention";
  if (value === "received") return "Received";
  return "Pending incident";
}

function resolveIncidentService(incident, agencies) {
  const textParts = [
    incident.incident_type,
    incident.latest_summary,
    incident.agency
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const agencyText = (agencies || []).map((agency) => agency.toLowerCase()).join(" ");
  const combined = `${textParts} ${agencyText}`;
  if (/(fire|structure|smoke|alarm)/.test(combined)) return "fire";
  if (/(ems|ambulance|medical|injury|cardiac|paramedic)/.test(combined)) return "ems";
  if (/(police|law|traffic|special)/.test(combined)) return "special";
  return "unknown";
}

function resolveRecency(ageMinutes) {
  if (typeof ageMinutes !== "number") return "";
  if (ageMinutes <= TAG_NEW_WINDOW_MINUTES) return "hot";
  if (ageMinutes <= TAG_UPDATED_WINDOW_MINUTES) return "warm";
  return "";
}

export function IncidentsBoard({ filters, onSelect, onSelectCall, refreshToken }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [pendingCalls, setPendingCalls] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingError, setPendingError] = useState("");
  const [loading, setLoading] = useState(false);
  const prevFiltersRef = useRef("");
  const limit = 50;

  const loadPage = useCallback(
    async ({ replace = false, nextOffset = 0 } = {}) => {
      setLoading(true);
      setError("");
      try {
        const result = await listIncidents({ filters, limit, offset: nextOffset });
        setTotal(result.total ?? 0);
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setOffset(nextOffset + result.items.length);
      } catch (err) {
        setError(`Failed to load incidents: ${err.message}`);
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

  useEffect(() => {
    let active = true;
    async function loadPending() {
      setPendingError("");
      try {
        const result = await listCalls({
          filters: { ...filters, pendingIncident: true },
          limit: 20,
          offset: 0
        });
        if (!active) return;
        setPendingCalls(result.items || []);
        setPendingTotal(result.total ?? 0);
      } catch (err) {
        if (!active) return;
        setPendingError(`Failed to load pending calls: ${err.message}`);
      }
    }
    loadPending();
    return () => {
      active = false;
    };
  }, [filters, refreshToken]);

  const buckets = useMemo(() => {
    const grouped = {
      active: [],
      monitoring: [],
      resolved: []
    };
    items.forEach((incident) => {
      const bucket = deriveBucket(incident).bucket;
      grouped[bucket] = grouped[bucket] || [];
      grouped[bucket].push(incident);
    });
    return grouped;
  }, [items]);

  const bucketDefs = [
    { key: "active", title: "Active", hint: `0-${MONITOR_WINDOW_MINUTES}m` },
    {
      key: "monitoring",
      title: "Monitoring",
      hint: `${MONITOR_WINDOW_MINUTES}-${AUTO_RESOLVE_MINUTES}m`
    },
    { key: "resolved", title: "Resolved", hint: `>${AUTO_RESOLVE_MINUTES}m` }
  ];

  const showEmpty = !loading && !error && total === 0 && offset === 0;
  const canLoadMore = offset < total;

  return (
    <div className="incidents-view">
      <section className="pending-incidents">
        <div className="incident-column-header">
          <span>Pending incident candidates</span>
          <span className="column-hint">
            {pendingTotal ? `${pendingTotal} awaiting grouping` : "No pending calls"}
          </span>
        </div>
        {pendingCalls.length ? (
          <ul className="incident-list pending-list">
            {pendingCalls.map((call) => {
              const address = call.address || call.town || "Location pending";
              const updatedAt = call.first_seen_at || call.created_at;
              const timestamp = formatRelativeTime(updatedAt);
              const agency = call.agency || "Unknown agency";
              const progress = resolveProgressLabel(call.progress_state);
              const confidence = formatConfidenceSignal(call.confidence_signal);
              return (
                <li
                  key={call.call_id}
                  className="cad-card pending-card"
                  data-service={call.service_type ? call.service_type.toLowerCase() : "unknown"}
                  onClick={() => onSelectCall?.(call.call_id)}
                >
                  <div className="cad-card-main">
                    <div className="cad-card-title">{address}</div>
                    <div className="cad-card-summary">
                      {call.summary || "Awaiting incident rollup."}
                    </div>
                    <div className="cad-card-meta">
                      {agency} {"\u00b7"} {progress}
                    </div>
                    <div className="cad-card-tags">
                      <span className="tag tag-pending">{progress}</span>
                      <span className="tag">{confidence.label}</span>
                    </div>
                  </div>
                  <div className="cad-card-status">
                    <span className="status-badge status-processing">Pending</span>
                    <div className="incident-updated" title={timestamp.title}>
                      {timestamp.text}
                    </div>
                    <div className="incident-meta">{confidence.detail}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state">
            {pendingError || "No pending calls in the current window."}
          </div>
        )}
      </section>
      <div className="incident-board">
        {bucketDefs.map((bucketDef) => (
          <section
            key={bucketDef.key}
            className={`incident-column incident-column--${bucketDef.key}`}
          >
            <div className="incident-column-header">
              <span>{bucketDef.title}</span>
              <span className="column-hint">{bucketDef.hint}</span>
            </div>
            <ul className="incident-list">
              {(buckets[bucketDef.key] || []).map((incident) => {
                const address = incident.address || incident.town || "No address";
                const updatedAt = incident.last_call_at || incident.updated_at || "n/a";
                const memberCount = incident.member_count ?? 0;
                const reAlertCount = incident.re_alert_count ?? 0;
                const summary = incident.latest_summary || "No rollup summary yet.";
                const timestamp = formatRelativeTime(updatedAt);
                const agencies = Array.isArray(incident.agencies)
                  ? incident.agencies
                  : incident.agency
                  ? [incident.agency]
                  : [];
                const metaLine = [incident.incident_type].filter(Boolean).join(" \u00b7 ");
                const tags = buildTags(incident);
                const bucket = deriveBucket(incident);
                const resolveIn =
                  bucket.bucket === "resolved" || bucket.ageMinutes === null
                    ? null
                    : Math.max(AUTO_RESOLVE_MINUTES - Math.floor(bucket.ageMinutes), 0);
                const incidentId = incident.incident_id || incident.incidentId;
                const confidence = formatConfidenceSignal(incident.confidence_signal);
                const serviceKey = resolveIncidentService(incident, agencies);
                const recency = resolveRecency(bucket.ageMinutes);
                return (
                  <li
                    key={incidentId}
                    className="cad-card"
                    data-service={serviceKey}
                    data-recency={recency || undefined}
                    onClick={() => onSelect(incidentId)}
                  >
                    <div className="cad-card-main">
                      <div className="cad-card-title">{address}</div>
                      <div className="cad-card-summary">{summary}</div>
                      <div className="cad-card-meta">
                        {metaLine || "Unspecified"} {"\u00b7"} {confidence.label}
                      </div>
                      <div className="cad-card-agencies">
                        <AgencyList agencies={agencies} />
                      </div>
                      <div className="cad-card-tags">
                        {tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="cad-card-status">
                      <span className={`status-badge status-${bucket.bucket}`}>
                        {bucket.label}
                      </span>
                      <div className="incident-updated" title={timestamp.title}>
                        {timestamp.text}
                      </div>
                      <div className="incident-meta">Calls linked {memberCount}</div>
                      {reAlertCount > 0 ? (
                        <div className="incident-meta">re-alerts {reAlertCount}</div>
                      ) : null}
                      {confidence.detail ? (
                        <div className="incident-meta">{confidence.detail}</div>
                      ) : null}
                      {resolveIn !== null ? (
                        <div className="incident-meta">auto resolve in {resolveIn}m</div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {showEmpty ? (
        <div className="empty-state">No incidents match the current filters.</div>
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
