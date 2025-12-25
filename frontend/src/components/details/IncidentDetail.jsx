import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getIncidentDetail } from "../../api";
import { useTimelinePolling } from "../../hooks/useTimelinePolling";
import { TimelineView } from "../timeline/TimelineView";
import { formatConfidenceSignal, formatRelativeTime } from "../../state/formatting";
import { createPlaybackCursor, updatePlaybackCursor } from "../../state/playback";

function formatSummaryTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatIncidentTitle(value) {
  if (!value) return "";
  const cleaned = String(value).replace(/[_-]+/g, " ").trim();
  return cleaned
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      if (/^[0-9]+$/.test(word)) return word;
      if (word.length <= 3) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function resolveTone({ incidentType, serviceType, agency }) {
  const source = `${incidentType || ""} ${serviceType || ""} ${agency || ""}`.toLowerCase();
  if (source.includes("fire") || source.includes("fd") || source.includes("marshal")) {
    return "fire";
  }
  if (source.includes("ems") || source.includes("ambulance") || source.includes("medical")) {
    return "ems";
  }
  if (source.includes("special")) {
    return "special";
  }
  return "neutral";
}

function buildIncidentSummaryTokens({ dispatchEvents, incidentType }) {
  const tokens = [];
  if (incidentType) {
    tokens.push({
      label: formatIncidentTitle(incidentType),
      tone: resolveTone({ incidentType }),
      kind: "type"
    });
  }
  dispatchEvents.forEach((event) => {
    const agency = event.agency || event.title || "Dispatch";
    const service =
      event.service_type && !agency.includes(event.service_type)
        ? ` ${event.service_type}`
        : "";
    const time = formatSummaryTime(event.timestamp);
    tokens.push({
      label: `${agency}${service} ${time}`.trim(),
      tone: resolveTone({
        incidentType: event.incident_type,
        serviceType: event.service_type,
        agency: event.agency
      }),
      kind: "dispatch"
    });
  });
  const line = tokens.map((token) => token.label).join(" — ");
  return { tokens, line };
}

export function IncidentDetail({
  incidentId,
  prefetched,
  onBack,
  onSelectCall,
  refreshToken
}) {
  const [data, setData] = useState(prefetched || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!prefetched);
  const [playback, setPlayback] = useState(createPlaybackCursor);

  const handlePlaybackUpdate = useCallback((update) => {
    setPlayback((prev) => updatePlaybackCursor(prev, update));
  }, []);

  const {
    data: timelineData,
    loading: timelineLoading,
    error: timelineError
  } = useTimelinePolling({ incidentId, refreshToken });

  useEffect(() => {
    setPlayback(createPlaybackCursor());
  }, [incidentId]);

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

  if (loading && !data) {
    return <div className="empty-state">Loading incident detail...</div>;
  }

  if (error || !data) {
    return <div className="empty-state">{error || "Incident not found."}</div>;
  }

  const timelineEventsRaw = timelineData?.events || [];
  const dispatchEvents = timelineEventsRaw.filter(
    (event) => event.event_type === "dispatch"
  );
  const sortedDispatch = [...dispatchEvents].sort((a, b) => {
    const left = new Date(a.timestamp || 0).getTime();
    const right = new Date(b.timestamp || 0).getTime();
    return left - right;
  });
  const latestRollup = data?.rollups?.[0];
  const updatedAt = latestRollup?.created_at || data?.incident?.updated_at || "n/a";
  const updatedLabel = formatRelativeTime(updatedAt);
  const operator = data?.operator_fields || {};
  const incidentTypeRaw =
    operator.incident_type || sortedDispatch[0]?.incident_type || "";
  const incidentTitle = formatIncidentTitle(incidentTypeRaw) || "Incident";
  const agencyLabel = operator.agency || "Unknown";
  const addressLabel = operator.address || sortedDispatch[0]?.address || "";
  const townLabel = operator.town || sortedDispatch[0]?.town || "";
  const townLine = townLabel ? `${formatIncidentTitle(townLabel)} NJ` : "";
  const locationLine = [townLine, addressLabel].filter(Boolean).join(" ");
  const incidentConfidence = formatConfidenceSignal(data?.incident?.confidence_signal);
  const incidentTimestamp =
    sortedDispatch[sortedDispatch.length - 1]?.timestamp || updatedAt;
  const summary = buildIncidentSummaryTokens({
    dispatchEvents: sortedDispatch,
    incidentType: incidentTypeRaw
  });

  const incidentEvent = {
    event_id: `incident:${incidentId}`,
    event_type: "incident",
    timestamp: incidentTimestamp,
    title: incidentTitle,
    incident_type: operator.incident_type || null,
    summary_line: summary.line,
    summary_tokens: summary.tokens
  };

  const dispatchWithParent = sortedDispatch.map((event) => ({
    ...event,
    parent_event_id: incidentEvent.event_id
  }));

  const timelineEvents = [incidentEvent, ...dispatchWithParent];
  const defaultExpandedIds = [
    incidentEvent.event_id,
    ...(dispatchWithParent.length === 1 ? [dispatchWithParent[0].event_id] : [])
  ];

  return (
    <div className="incident-detail">
      <button className="button" type="button" onClick={onBack}>
        Back to Incidents
      </button>

      <div className="detail-header">
        <div className="detail-title">
          {incidentTitle}
          {locationLine ? ` — ${locationLine}` : ""}
        </div>
        <div className="incident-meta">
          {agencyLabel} {"\u00b7"} {incidentConfidence.label}
        </div>
        {incidentConfidence.detail ? (
          <div className="incident-meta">{incidentConfidence.detail}</div>
        ) : null}
        <div className="incident-updated" title={updatedLabel.title}>
          last update {updatedLabel.text}
        </div>
      </div>

      <div className="incident-timeline-shell incident-timeline-shell--single">
        <div className="incident-timeline-main">
          {timelineLoading ? (
            <div className="empty-state">Loading timeline...</div>
          ) : timelineError ? (
            <div className="empty-state">{timelineError}</div>
          ) : (
            <TimelineView
              events={timelineEvents}
              playback={playback}
              onPlaybackUpdate={handlePlaybackUpdate}
              evidence={null}
              onSelectEvent={(event) =>
                setPlayback((prev) =>
                  updatePlaybackCursor(prev, {
                    event_id: event.event_id,
                    call_id: event.call_id || null,
                    position: 0,
                    timestamp: event.timestamp
                  })
                )
              }
              onOpenCall={onSelectCall}
              defaultExpandedIds={defaultExpandedIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}
