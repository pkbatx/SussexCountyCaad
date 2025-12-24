import React, { useEffect, useMemo, useState } from "react";
import { getCallDetail, listCallFeedback, retryStage, submitCallFeedback } from "../../api";
import { formatConfidenceSignal, formatRelativeTime } from "../../state/formatting";

function resolveProgressLabel(progressState) {
  const value = String(progressState || "");
  if (value === "grouped") return "Grouped to incident";
  if (value === "pending_incident") return "Awaiting incident";
  if (value === "transcribing") return "Transcribing audio";
  if (value === "analyzing") return "Analyzing call";
  if (value === "failed") return "Needs attention";
  return "Received";
}

export function CallDetail({
  callId,
  prefetched,
  onBack,
  onFeedback,
  onPlayAudio
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
        const next = prefetched || (await getCallDetail(callId));
        if (!active) return;
        setData(next);
      } catch (err) {
        if (!active) return;
        setError(`Failed to load call detail: ${err.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [callId, prefetched]);

  useEffect(() => {
    let active = true;
    async function loadFeedback() {
      try {
        const existing = await listCallFeedback(callId);
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
  }, [callId]);

  const operator = data?.operator_fields || {};
  const agencyLabel = operator.agency || "Unknown";
  const typeLabel = operator.incident_type || "Unspecified";
  const addressLabel = operator.address || "Location unknown";
  const townLabel = operator.town || "";
  const crossLabel = operator.cross_street || "";
  const poiLabel = operator.poi || "";
  const progressLabel = resolveProgressLabel(data?.call?.progress_state);
  const confidence = formatConfidenceSignal(
    data?.confidence_signal || data?.call?.confidence_signal
  );
  const firstSeenLabel = formatRelativeTime(data?.call?.first_seen_at);
  const incidentId = data?.call?.incident_id || null;

  const feedbackFields = useMemo(
    () => [
      { label: "Agency", value: agencyLabel, type: "wrong_agency", confirm: "confirm_agency" },
      { label: "Incident type", value: typeLabel, type: "wrong_type", confirm: "confirm_type" },
      { label: "Address", value: addressLabel, type: "wrong_address", confirm: "confirm_address" },
      { label: "Town", value: townLabel || "Unknown", type: "wrong_town", confirm: "confirm_town" },
      {
        label: "Cross street",
        value: crossLabel || "None",
        type: "wrong_cross_street",
        confirm: "confirm_cross_street"
      },
      { label: "POI", value: poiLabel || "None", type: "wrong_poi", confirm: "confirm_poi" }
    ],
    [agencyLabel, typeLabel, addressLabel, townLabel, crossLabel, poiLabel]
  );

  if (loading) {
    return <div className="empty-state">Loading call detail...</div>;
  }

  if (error || !data) {
    return <div className="empty-state">{error || "Call not found."}</div>;
  }

  return (
    <div className="call-detail">
      <button className="button" type="button" onClick={onBack}>
        Back to Incidents
      </button>

      <div className="detail-header">
        <div className="detail-title">Call Detail</div>
        <div className="incident-meta">{agencyLabel} {"\u00b7"} {typeLabel}</div>
        <div className="incident-meta">{[addressLabel, townLabel].filter(Boolean).join(" \u00b7 ")}</div>
        <div className="incident-meta">
          {progressLabel} {"\u00b7"} {confidence.label}
        </div>
        {confidence.detail ? (
          <div className="incident-meta">{confidence.detail}</div>
        ) : null}
      </div>

      <div className="detail-section">
        <h2>Audio</h2>
        <div className="audio-row">
          <button
            className="button"
            type="button"
            disabled={!data.audio?.url}
            onClick={() =>
              onPlayAudio?.({
                src: data.audio?.url,
                label: `${agencyLabel} \u00b7 ${typeLabel}`
              })
            }
          >
            {data.audio?.url ? "Play in audio dock" : "Audio unavailable"}
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h2>Call status</h2>
        <ul className="detail-table">
          <li className="detail-row">
            <div className="detail-label">Progress</div>
            <div className="detail-value">{progressLabel}</div>
            <div className="detail-actions" />
          </li>
          <li className="detail-row">
            <div className="detail-label">Confidence</div>
            <div className="detail-value">
              {confidence.label}
              {confidence.detail ? ` \u2022 ${confidence.detail}` : ""}
            </div>
            <div className="detail-actions" />
          </li>
          <li className="detail-row">
            <div className="detail-label">Incident link</div>
            <div className="detail-value">
              {incidentId ? `Linked to incident ${incidentId}` : "Pending incident assignment"}
            </div>
            <div className="detail-actions" />
          </li>
          <li className="detail-row">
            <div className="detail-label">Received</div>
            <div className="detail-value" title={firstSeenLabel.title}>
              {firstSeenLabel.text}
            </div>
            <div className="detail-actions" />
          </li>
        </ul>
      </div>

      <div className="detail-section">
        <h2>Details</h2>
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
                    await submitCallFeedback(callId, { feedback_type: field.confirm });
                    setFeedbackHistory((prev) => [
                      {
                        feedback_id: `${field.confirm}-${Date.now()}`,
                        feedback_type: `${field.label} confirmed`,
                        apply_status: "queued"
                      },
                      ...prev
                    ]);
                    onFeedback?.(callId);
                  }}
                >
                  OK
                </button>
                <button
                  className="thumb-button thumb-button--flag"
                  type="button"
                  title="Mark incorrect"
                  onClick={async () => {
                    await submitCallFeedback(callId, { feedback_type: field.type });
                    setFeedbackHistory((prev) => [
                      {
                        feedback_id: `${field.type}-${Date.now()}`,
                        feedback_type: `${field.label} flagged (queued)`,
                        apply_status: "queued"
                      },
                      ...prev
                    ]);
                    onFeedback?.(callId);
                  }}
                >
                  Flag
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="detail-section">
        <h2>Stages</h2>
        <ul>
          {(data.stages || []).map((stage) => {
            const label = stage.stage_name || stage.stage;
            return (
              <li key={label} className="stage-item">
                <span>{label}: {stage.status}</span>
                <button
                  className="button small"
                  type="button"
                  onClick={async (event) => {
                    event.stopPropagation();
                    await retryStage(callId, label);
                    const refreshed = await getCallDetail(callId);
                    setData(refreshed);
                  }}
                >
                  Retry
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="detail-section">
        <h2>Transcript</h2>
        <pre>{data.transcripts?.[0]?.text || "No transcript yet."}</pre>
      </div>

      <div className="detail-section">
        <h2>Summary</h2>
        {operator.summary || data.summaries?.[0]?.summary_text || "No summary yet."}
      </div>

      <div className="detail-section">
        <h2>Feedback history</h2>
        <ul className="evidence-list">
          {feedbackHistory.length
            ? feedbackHistory.map((entry, index) => (
                <li key={entry.feedback_id || index} className="evidence-item">
                  {entry.feedback_type} {entry.apply_status ? `\u2022 ${entry.apply_status}` : ""}
                </li>
              ))
            : "No feedback yet."}
        </ul>
      </div>
    </div>
  );
}
