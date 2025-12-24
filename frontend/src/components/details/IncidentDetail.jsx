import React, { useEffect, useMemo, useState } from "react";
import {
  getIncidentDetail,
  listIncidentFeedback,
  submitIncidentFeedback
} from "../../api";
import { formatConfidenceSignal, formatRelativeTime } from "../../state/formatting";

function resolveProgressLabel(progressState) {
  const value = String(progressState || "");
  if (value === "grouped") return "Grouped";
  if (value === "pending_incident") return "Pending incident";
  if (value === "transcribing") return "Transcribing";
  if (value === "analyzing") return "Analyzing";
  if (value === "failed") return "Needs attention";
  return "Received";
}

function formatDispatchTime(value) {
  if (!value) return { text: "Unknown time", title: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { text: String(value), title: "" };
  return {
    text: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: date.toLocaleString()
  };
}

export function IncidentDetail({
  incidentId,
  prefetched,
  onBack,
  onFeedback,
  onSelectCall
}) {
  const [data, setData] = useState(prefetched || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!prefetched);
  const [feedbackHistory, setFeedbackHistory] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const next = prefetched || (await getIncidentDetail(incidentId));
        if (!active) return;
        setData(next);
      } catch (err) {
        if (!active) return;
        setError(`Failed to load incident detail: ${err.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [incidentId, prefetched]);

  useEffect(() => {
    let active = true;
    async function loadFeedback() {
      try {
        const existing = await listIncidentFeedback(incidentId);
        if (!active) return;
        setFeedbackHistory(existing || []);
      } catch (_error) {
        if (!active) return;
        setFeedbackHistory([
          {
            feedback_id: "error",
            feedback_type: "Feedback history unavailable.",
            apply_status: ""
          }
        ]);
      }
    }
    loadFeedback();
    return () => {
      active = false;
    };
  }, [incidentId]);

  const latestRollup = data?.rollups?.[0];
  const updatedAt = latestRollup?.created_at || data?.incident?.updated_at || "n/a";
  const updatedLabel = formatRelativeTime(updatedAt);
  const summary = latestRollup?.summary_text || "No rollup summary yet.";
  const operator = data?.operator_fields || {};
  const agencyLabel = operator.agency || "Unknown";
  const typeLabel = operator.incident_type || "Unspecified";
  const addressLabel = operator.address || operator.town || "No address";
  const incidentConfidence = formatConfidenceSignal(data?.incident?.confidence_signal);

  const feedbackFields = useMemo(
    () => [
      { label: "Agency", value: agencyLabel, type: "wrong_agency", confirm: "confirm_agency" },
      { label: "Incident type", value: typeLabel, type: "wrong_type", confirm: "confirm_type" },
      {
        label: "Address",
        value: operator.address || "No address",
        type: "wrong_address",
        confirm: "confirm_address"
      },
      { label: "Town", value: operator.town || "Unknown", type: "wrong_town", confirm: "confirm_town" },
      {
        label: "Cross street",
        value: operator.cross_street || "None",
        type: "wrong_cross_street",
        confirm: "confirm_cross_street"
      },
      { label: "POI", value: operator.poi || "None", type: "wrong_poi", confirm: "confirm_poi" }
    ],
    [agencyLabel, typeLabel, operator]
  );

  if (loading) {
    return <div className="empty-state">Loading incident detail...</div>;
  }

  if (error || !data) {
    return <div className="empty-state">{error || "Incident not found."}</div>;
  }

  const memberCalls = data.member_calls?.length ? data.member_calls : [];
  const chronologicalCalls = [...memberCalls].sort((a, b) => {
    const left = new Date(a.first_seen_at || 0).getTime();
    const right = new Date(b.first_seen_at || 0).getTime();
    return left - right;
  });
  const rollupUpdates = (data.rollups || []).flatMap((rollup) => {
    const updates =
      Array.isArray(rollup.latest_update) && rollup.latest_update.length
        ? rollup.latest_update
        : rollup.summary_text
        ? [rollup.summary_text]
        : [];
    return updates.map((text) => ({
      text,
      created_at: rollup.created_at
    }));
  });
  const seenUpdates = new Set();
  const dedupedUpdates = rollupUpdates.filter((entry) => {
    if (!entry.text) return false;
    const key = entry.text.trim().toLowerCase();
    if (seenUpdates.has(key)) return false;
    seenUpdates.add(key);
    return true;
  });

  return (
    <div className="incident-detail">
      <button className="button" type="button" onClick={onBack}>
        Back to Incidents
      </button>

      <div className="detail-header">
        <div className="detail-title">Incident Detail</div>
        <div className="detail-path">{addressLabel}</div>
        <div className="incident-meta">
          {agencyLabel} {"\u00b7"} {typeLabel} {"\u00b7"} {incidentConfidence.label}
        </div>
        {incidentConfidence.detail ? (
          <div className="incident-meta">{incidentConfidence.detail}</div>
        ) : null}
        <div className="incident-updated" title={updatedLabel.title}>
          last update {updatedLabel.text}
        </div>
        <div className="incident-summary">{summary}</div>
      </div>

      <div className="detail-section">
        <h2>Dispatch timeline</h2>
        {chronologicalCalls.length ? (
          <ul className="timeline-list">
            {chronologicalCalls.map((member) => {
              const callId = member.call_id || member.callId;
              const agency = member.agency || "Unknown";
              const serviceType = member.service_type ? ` · ${member.service_type}` : "";
              const time = formatDispatchTime(member.first_seen_at);
              return (
                <li
                  key={callId}
                  className="timeline-item"
                  onClick={() => onSelectCall?.(callId)}
                >
                  <div className="timeline-time" title={time.title}>
                    {time.text}
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-title">
                      {agency}
                      {serviceType}
                    </div>
                    <div className="timeline-meta">
                      {resolveProgressLabel(member.progress_state)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state">No dispatch updates yet.</div>
        )}
      </div>

      <div className="detail-section">
        <h2>Calls</h2>
        {memberCalls.length ? (
          <ul className="detail-call-list">
            {memberCalls.map((member) => {
              const callId = member.call_id || member.callId;
              const agency = member.agency || "Unknown";
              const serviceType = member.service_type ? ` \u00b7 ${member.service_type}` : "";
              const timeLabel = formatRelativeTime(member.first_seen_at);
              const progress = resolveProgressLabel(member.progress_state);
              const confidence = formatConfidenceSignal(member.confidence_signal);
              return (
                <li
                  key={callId}
                  className="detail-call-row"
                  onClick={() => onSelectCall?.(callId)}
                >
                  <div>
                    <div className="detail-call-title">
                      {agency}
                      {serviceType}
                    </div>
                    <div className="detail-call-meta">
                      {progress} {"\u00b7"} {confidence.label}
                    </div>
                    {confidence.detail ? (
                      <div className="detail-call-meta">{confidence.detail}</div>
                    ) : null}
                  </div>
                  <div className="detail-call-time" title={timeLabel.title}>
                    {timeLabel.text}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state">No calls linked to this incident yet.</div>
        )}
      </div>

      <div className="detail-section">
        <h2>Rollup History</h2>
        {dedupedUpdates.length ? (
          <ul>
            {dedupedUpdates.map((rollup, index) => {
              const created = formatRelativeTime(rollup.created_at);
              return (
                <li key={`${rollup.text}-${index}`} className="rollup-item">
                  <div className="rollup-summary">{rollup.text}</div>
                  <div className="rollup-meta">updated {created.text}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          "No rollups yet."
        )}
      </div>

      <div className="detail-section">
        <h2>Feedback</h2>
        <ul className="detail-table">
          {feedbackFields.map((field) => (
            <li key={field.label} className="detail-row">
              <div className="detail-label">{field.label}</div>
              <div className="detail-value">{field.value}</div>
              <div className="detail-actions">
                <button
                  className="thumb-button thumb-button--confirm"
                  type="button"
                  title="Mark correct"
                  onClick={async () => {
                    await submitIncidentFeedback(incidentId, { feedback_type: field.confirm });
                    setFeedbackHistory((prev) => [
                      {
                        feedback_id: `${field.confirm}-${Date.now()}`,
                        feedback_type: `${field.label} confirmed`,
                        apply_status: "queued"
                      },
                      ...prev
                    ]);
                    onFeedback?.(incidentId);
                  }}
                >
                  OK
                </button>
                <button
                  className="thumb-button thumb-button--flag"
                  type="button"
                  title="Mark incorrect"
                  onClick={async () => {
                    await submitIncidentFeedback(incidentId, { feedback_type: field.type });
                    setFeedbackHistory((prev) => [
                      {
                        feedback_id: `${field.type}-${Date.now()}`,
                        feedback_type: `${field.label} flagged (queued)`,
                        apply_status: "queued"
                      },
                      ...prev
                    ]);
                    onFeedback?.(incidentId);
                  }}
                >
                  Flag
                </button>
              </div>
            </li>
          ))}
        </ul>
        <ul className="evidence-list">
          {feedbackHistory.length
            ? feedbackHistory.map((entry, index) => (
                <li key={entry.feedback_id || index} className="evidence-item">
                  {entry.feedback_type} {entry.apply_status ? `\u2022 ${entry.apply_status}` : ""}
                </li>
              ))
            : "Feedback history unavailable."}
        </ul>
      </div>
    </div>
  );
}
