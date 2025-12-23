import React, { useEffect, useMemo, useState } from "react";
import {
  getIncidentDetail,
  listIncidentFeedback,
  submitIncidentFeedback
} from "../../api";

function formatRelative(value) {
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

export function IncidentDetail({ incidentId, prefetched, onBack, onFeedback }) {
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
  const updatedLabel = formatRelative(updatedAt);
  const summary = latestRollup?.summary_text || "No rollup summary yet.";
  const operator = data?.operator_fields || {};
  const agencyLabel = operator.agency || "Unknown";
  const typeLabel = operator.incident_type || "Unspecified";
  const addressLabel = operator.address || operator.town || "No address";

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

  const memberMeta = new Map(
    (data.members || []).map((member) => [member.call_id || member.callId, member])
  );
  const memberCalls = data.member_calls?.length ? data.member_calls : data.members || [];

  return (
    <div className="incident-detail">
      <button className="button" type="button" onClick={onBack}>
        Back to Incidents
      </button>

      <div className="detail-header">
        <div className="detail-title">Incident Detail</div>
        <div className="detail-path">{addressLabel}</div>
        <div className="incident-meta">{agencyLabel} {"\u00b7"} {typeLabel}</div>
        <div className="incident-updated" title={updatedLabel.title}>
          last update {updatedLabel.text}
        </div>
        <div className="incident-summary">{summary}</div>
      </div>

      <div className="detail-section">
        <h2>Calls</h2>
        <ul>
          {memberCalls.map((member) => {
            const callId = member.call_id || member.callId;
            const meta = memberMeta.get(callId);
            const reason = meta?.link_reason || meta?.linkReason || "linked";
            const agency = member.agency || "Unknown";
            const serviceType = member.service_type ? ` \u00b7 ${member.service_type}` : "";
            const time = member.first_seen_at
              ? new Date(member.first_seen_at).toLocaleString()
              : "Unknown time";
            return (
              <li key={callId} className="evidence-item">
                {agency}{serviceType} {"\u2022"} {reason} {"\u2022"} {time}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="detail-section">
        <h2>Rollup History</h2>
        {data.rollups?.length ? (
          <ul>
            {data.rollups.map((rollup) => {
              const created = formatRelative(rollup.created_at);
              return (
                <li key={rollup.rollup_id} className="rollup-item">
                  <div className="rollup-summary">{rollup.summary_text}</div>
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
