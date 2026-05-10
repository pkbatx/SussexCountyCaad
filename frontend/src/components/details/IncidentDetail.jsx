import React, { useEffect, useMemo, useState } from "react";
import { getIncidentDetail, listSignals } from "../../api";
import { MapView } from "../map/MapView";
import { AUTO_RESOLVE_MINUTES } from "../../config";

// progress_state -> per-stage status for the four-icon row.
// 'done' renders ✓ in green, 'pending' renders ○ in dim, 'fail' renders ✗ in red.
// We derive from progress_state because /api/incidents/:id does not expose
// per-call stage rows; pulling them would require N parallel /api/calls/:id
// fetches which is too costly for an incident-detail open.
function stagesFromProgress(progress, status) {
  if (status === "failed") {
    return { transcription: "fail", extraction: "fail", geo: "fail", grouping: "fail" };
  }
  switch (progress) {
    case "grouped":
      return { transcription: "done", extraction: "done", geo: "done", grouping: "done" };
    case "pending_incident":
      return { transcription: "done", extraction: "done", geo: "done", grouping: "pending" };
    case "analyzing":
      return { transcription: "done", extraction: "pending", geo: "pending", grouping: "pending" };
    case "transcribing":
      return { transcription: "pending", extraction: "pending", geo: "pending", grouping: "pending" };
    case "received":
    default:
      return { transcription: "pending", extraction: "pending", geo: "pending", grouping: "pending" };
  }
}

function StageIcon({ name, state }) {
  const ch = state === "done" ? "✓" : state === "fail" ? "✗" : "○";
  const cls = state === "done" ? "ok" : state === "fail" ? "fail" : "";
  return (
    <span className={cls} title={`${name}: ${state}`}>
      {ch}
    </span>
  );
}

function formatDelta(start, current) {
  const a = new Date(start || 0).getTime();
  const b = new Date(current || 0).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return "+0:00";
  const seconds = Math.max(0, Math.floor((b - a) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `+${m}:${String(s).padStart(2, "0")}`;
}

function isIncidentActive(incident, latestRollupAt) {
  if (incident?.status === "failed") return false;
  const updated = latestRollupAt || incident?.last_activity_at || incident?.updated_at;
  if (!updated) return true;
  const age = (Date.now() - new Date(updated).getTime()) / 60000;
  return Number.isFinite(age) && age < AUTO_RESOLVE_MINUTES;
}

function locationLine(call) {
  return [call.address, call.town].filter(Boolean).join(", ") || call.cross_street || "—";
}

export function IncidentDetail({ incidentId, prefetched, onBack, onSelectCall, refreshToken }) {
  const [data, setData] = useState(prefetched || null);
  const [loading, setLoading] = useState(!prefetched);
  const [error, setError] = useState("");
  const [signalsByCall, setSignalsByCall] = useState({});
  const [selectedCallId, setSelectedCallId] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getIncidentDetail(incidentId)
      .then((next) => {
        if (active) setData(next);
      })
      .catch((err) => {
        if (active) setError(`Failed to load incident: ${err.message}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [incidentId, refreshToken]);

  // Fetch ambiguous signals for each member call (single endpoint, batched).
  useEffect(() => {
    let active = true;
    const calls = data?.member_calls || [];
    if (calls.length === 0) {
      setSignalsByCall({});
      return undefined;
    }
    Promise.all(
      calls.map((call) =>
        listSignals({ callId: call.call_id, signal: "ambiguous", limit: 5 })
          .then((res) => [call.call_id, res?.signals || []])
          .catch(() => [call.call_id, []])
      )
    ).then((entries) => {
      if (active) setSignalsByCall(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [data?.member_calls, refreshToken]);

  const memberCalls = useMemo(() => {
    const calls = data?.member_calls || [];
    return [...calls].sort((a, b) => {
      const x = new Date(a.first_seen_at || 0).getTime();
      const y = new Date(b.first_seen_at || 0).getTime();
      return x - y;
    });
  }, [data?.member_calls]);

  const startTime = memberCalls[0]?.first_seen_at;
  const memberCallIds = useMemo(() => memberCalls.map((c) => c.call_id), [memberCalls]);
  const latestRollup = data?.rollups?.[0];
  const dataQualityFlags = latestRollup?.key_fields?.data_quality_flags || [];
  const incidentActive = isIncidentActive(data?.incident, latestRollup?.created_at);

  if (loading && !data) {
    return (
      <div style={{ padding: 24, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace" }}>
        Loading incident…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: 24, color: "var(--accent-red)", fontFamily: "IBM Plex Mono, monospace" }}>
        {error || "Incident not found."}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "4px 10px",
            cursor: "pointer"
          }}
        >
          ◀ INCIDENTS
        </button>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          INCIDENT&nbsp;<span style={{ color: "var(--text-primary)" }}>{String(incidentId).slice(0, 8)}</span>
        </span>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          MEMBERS&nbsp;<span style={{ color: "var(--text-primary)" }}>{memberCalls.length}</span>
        </span>
      </div>
      <div className="incident-split">
        <div className="incident-timeline-pane">
          <div className="section-title">CALL TIMELINE</div>
          {memberCalls.length === 0 ? (
            <div style={{ padding: 16, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>
              No member calls.
            </div>
          ) : (
            memberCalls.map((call) => {
              const stages = stagesFromProgress(call.progress_state, call.status);
              const sigs = signalsByCall[call.call_id] || [];
              const ambiguousReason = sigs[0]?.reason || "";
              const isSelected = call.call_id === selectedCallId;
              return (
                <div
                  key={call.call_id}
                  className={`timeline-call ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedCallId(call.call_id);
                    onSelectCall?.(call.call_id);
                  }}
                >
                  <span className="delta">{formatDelta(startTime, call.first_seen_at)}</span>
                  <div className="body">
                    <div className="row1">
                      <span className="type-pill">{call.incident_type || call.service_type || "CALL"}</span>
                      <span className="location">{locationLine(call)}</span>
                    </div>
                    <div className="stage-icons">
                      <StageIcon name="transcription" state={stages.transcription} />
                      <StageIcon name="extraction" state={stages.extraction} />
                      <StageIcon name="geo" state={stages.geo} />
                      <StageIcon name="grouping" state={stages.grouping} />
                    </div>
                  </div>
                  {sigs.length > 0 ? (
                    <span className="ambig" title={ambiguousReason}>⚠</span>
                  ) : <span />}
                </div>
              );
            })
          )}

          <div style={{ padding: 16 }}>
            <div className="section-title" style={{ padding: 0, marginBottom: 6 }}>INCIDENT SUMMARY</div>
            {dataQualityFlags.length > 0 ? (
              <div style={{ marginBottom: 8 }}>
                {dataQualityFlags.map((flag) => (
                  <span key={flag} className="dq-chip">⚠ {flag}</span>
                ))}
              </div>
            ) : null}
            {latestRollup?.summary_text ? (
              <div className="summary-blockquote" style={{ borderLeftColor: "var(--accent-cyan)" }}>
                {latestRollup.summary_text}
              </div>
            ) : (
              <div style={{ color: "var(--text-dim)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, fontStyle: "italic" }}>
                Incident summary pending…
              </div>
            )}
          </div>
        </div>

        <div className="incident-map-pane">
          <MapView
            mode="incident"
            filters={{}}
            incident={data?.incident}
            memberCallIds={memberCallIds}
            isActive={incidentActive}
            refreshToken={refreshToken}
          />
        </div>
      </div>
    </div>
  );
}
