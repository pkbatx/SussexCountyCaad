import React, { memo, useEffect, useMemo, useState } from "react";
import { getIncidentDetail, listSignals } from "../../api";
import { MapView } from "../map/MapView";
import { StatusBar } from "../layout/StatusBar";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { AUTO_RESOLVE_MINUTES } from "../../config";

const STAGE_NAMES = ["transcription", "extraction", "geo", "grouping"];

function stagesFromProgress(progress, status) {
  if (status === "failed") return { transcription: "fail", extraction: "fail", geo: "fail", grouping: "fail" };
  switch (progress) {
    case "grouped":          return { transcription: "done", extraction: "done", geo: "done", grouping: "done" };
    case "pending_incident": return { transcription: "done", extraction: "done", geo: "done", grouping: "pending" };
    case "analyzing":        return { transcription: "done", extraction: "pending", geo: "pending", grouping: "pending" };
    case "transcribing":     return { transcription: "pending", extraction: "pending", geo: "pending", grouping: "pending" };
    default:                 return { transcription: "pending", extraction: "pending", geo: "pending", grouping: "pending" };
  }
}

function deltaFromStart(startIso, currentIso) {
  const a = new Date(startIso || 0).getTime();
  const b = new Date(currentIso || 0).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return "+0:00";
  const seconds = Math.max(0, Math.floor((b - a) / 1000));
  return `+${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function timeSince(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function pillForIncident(incident, latestRollupAt) {
  if (incident?.status === "resolved") return "resolved";
  const updated = latestRollupAt || incident?.last_activity_at || incident?.updated_at;
  if (!updated) return "active";
  const ageMin = (Date.now() - new Date(updated).getTime()) / 60000;
  if (!Number.isFinite(ageMin)) return "active";
  if (ageMin >= AUTO_RESOLVE_MINUTES) return "resolved";
  if (ageMin >= AUTO_RESOLVE_MINUTES / 2) return "monitoring";
  return "active";
}

function locationLine(call) {
  return [call.address, call.town].filter(Boolean).join(", ") || call.cross_street || "—";
}

const TimelineRow = memo(function TimelineRow({ call, startIso, signals, isSelected, onOpen }) {
  const stages = stagesFromProgress(call.progress_state, call.status);
  const ambiguousReason = signals[0]?.reason || "";
  const hasAmbiguous = signals.length > 0;
  return (
    <button
      type="button"
      className={`timeline-call ${isSelected ? "is-selected" : ""}`}
      onClick={() => onOpen(call.call_id)}
    >
      <span className="delta">{deltaFromStart(startIso, call.first_seen_at)}</span>
      <div className="body">
        <div className="row1">
          <span className="type-pill">{call.incident_type || call.service_type || "CALL"}</span>
          <span className="location">{locationLine(call)}</span>
        </div>
        <div
          className="stage-icons"
          title={STAGE_NAMES.join(" · ")}
          aria-label={`stages ${STAGE_NAMES.join(", ")}`}
        >
          {STAGE_NAMES.slice(0, hasAmbiguous ? 3 : 4).map((stage) => {
            const state = stages[stage];
            const ch = state === "done" ? "✓" : state === "fail" ? "✗" : "○";
            const cls = state === "done" ? "ok" : state === "fail" ? "fail" : "";
            return <span key={stage} className={cls}>{ch}</span>;
          })}
          {hasAmbiguous ? (
            <span className="ambig" title={ambiguousReason}>⚠</span>
          ) : null}
        </div>
      </div>
    </button>
  );
});

function TimelineSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="timeline-call skeleton-row" aria-hidden="true" />
      ))}
    </>
  );
}

export function IncidentDetail({ incidentId, onBack, onSelectCall, refreshToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signalsByCall, setSignalsByCall] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getIncidentDetail(incidentId)
      .then((next) => { if (active) setData(next); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [incidentId, refreshToken]);

  useEffect(() => {
    let active = true;
    const calls = data?.member_calls || [];
    if (calls.length === 0) { setSignalsByCall({}); return undefined; }
    Promise.all(
      calls.map((call) =>
        listSignals({ callId: call.call_id, signal: "ambiguous", limit: 5 })
          .then((res) => [call.call_id, res?.signals || []])
          .catch(() => [call.call_id, []])
      )
    ).then((entries) => { if (active) setSignalsByCall(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [data?.member_calls, refreshToken]);

  const memberCalls = useMemo(() => {
    const calls = data?.member_calls || [];
    return [...calls].sort(
      (a, b) => new Date(a.first_seen_at || 0).getTime() - new Date(b.first_seen_at || 0).getTime()
    );
  }, [data?.member_calls]);

  const startIso = memberCalls[0]?.first_seen_at;
  const memberCallIds = useMemo(() => memberCalls.map((c) => c.call_id), [memberCalls]);
  const latestRollup = data?.rollups?.[0];
  const dataQualityFlags = latestRollup?.key_fields?.data_quality_flags || [];

  const pill = pillForIncident(data?.incident, latestRollup?.created_at);
  const isActive = pill === "active";

  useKeyboardShortcuts({
    onNext: () => setSelectedIndex((i) => Math.min(i + 1, Math.max(memberCalls.length - 1, 0))),
    onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
    onSelect: () => {
      const call = memberCalls[selectedIndex];
      if (call) onSelectCall?.(call.call_id);
    },
    onBack
  });

  const incidentType =
    latestRollup?.key_fields?.incident_type ||
    data?.operator_fields?.incident_type ||
    memberCalls[0]?.incident_type ||
    "INCIDENT";

  const subtitle = loading
    ? "LOADING…"
    : `${memberCalls.length} call${memberCalls.length === 1 ? "" : "s"} · started ${timeSince(startIso)}`;

  return (
    <div className="route incident-route">
      <StatusBar
        onBack={onBack}
        idLabel="INC"
        idShort={String(incidentId).slice(0, 8)}
        pill={loading ? null : pill}
        title={String(incidentType).toUpperCase()}
        subtitle={subtitle}
        flag={dataQualityFlags.length > 0 ? "⚠ low confidence" : null}
      />

      <section className="incident-map-block" aria-label="incident map">
        {loading ? (
          <div className="skeleton-block" aria-hidden="true" />
        ) : (
          <MapView
            mode="incident"
            filters={{}}
            incident={data?.incident}
            memberCallIds={memberCallIds}
            isActive={isActive}
            refreshToken={refreshToken}
          />
        )}
      </section>

      <section className="incident-bottom">
        <div className="incident-timeline">
          <div className="section-title">CALLS</div>
          {loading ? (
            <TimelineSkeleton />
          ) : memberCalls.length === 0 ? (
            <div className="empty-state empty-state--anomaly">
              NO MEMBER CALLS — DATA INTEGRITY ISSUE
            </div>
          ) : (
            memberCalls.map((call, i) => (
              <TimelineRow
                key={call.call_id}
                call={call}
                startIso={startIso}
                signals={signalsByCall[call.call_id] || []}
                isSelected={i === selectedIndex}
                onOpen={onSelectCall}
              />
            ))
          )}
        </div>

        <div className="incident-synthesis">
          <div className="section-title">SYNTHESIS</div>
          {loading ? (
            <div className="skeleton-lines" aria-hidden="true">
              <div /><div /><div className="short" />
            </div>
          ) : latestRollup?.summary_text ? (
            <>
              <div className="synthesis-prose">{latestRollup.summary_text}</div>
              {dataQualityFlags.length > 0 ? (
                <div className="synthesis-flags">
                  ⚠ {dataQualityFlags.join(" · ")}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state empty-state--pending">Synthesis pending…</div>
          )}
        </div>
      </section>
    </div>
  );
}
