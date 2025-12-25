import React, { useEffect, useState } from "react";
import { getCallDetail } from "../../api";
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
  onBack
}) {
  const [data, setData] = useState(prefetched || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!prefetched);

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
        {data.audio?.url ? (
          <audio className="inline-audio" controls preload="none" src={data.audio.url} />
        ) : (
          <div className="empty-state">Audio unavailable.</div>
        )}
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
        <h2>Stages</h2>
        <ul className="stage-list">
          {(data.stages || []).map((stage) => {
            const label = stage.stage_name || stage.stage;
            return (
              <li key={label} className="stage-item">
                <span>{label}: {stage.status}</span>
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

    </div>
  );
}
