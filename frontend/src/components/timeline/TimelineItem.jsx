import React, { useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { fetchTimelineTranscript } from "../../api";
import { formatRelativeTime } from "../../state/formatting";
import { TranscriptPanel } from "./TranscriptPanel";

function formatEventTitle(event) {
  if (event.title) return event.title;
  if (event.agency) return event.agency;
  return event.event_type?.toUpperCase() || "Event";
}

function formatEventSubtitle(event) {
  const parts = [];
  if (event.incident_type) parts.push(event.incident_type);
  if (event.service_type) parts.push(event.service_type);
  if (event.address) parts.push(event.address);
  if (event.town) parts.push(event.town);
  return parts.join(" · ");
}

function formatClockTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRailTime(value, fallback) {
  if (!value) return fallback;
  return formatClockTime(value);
}

function resolveTone(event) {
  const source = `${event.incident_type || ""} ${event.service_type || ""} ${event.agency || ""} ${event.title || ""}`.toLowerCase();
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

function buildKeyFacts(event) {
  return [
    { label: "Incident type", value: event.incident_type },
    { label: "Address", value: event.address },
    { label: "Town", value: event.town },
    { label: "Cross street", value: event.cross_street },
    { label: "POI", value: event.poi },
    { label: "Status", value: event.status }
  ].filter((item) => item.value);
}

export function TimelineItem({
  event,
  depth,
  expanded,
  onToggle,
  onSelect,
  playback,
  onPlaybackUpdate,
  evidence,
  onOpenCall,
  children
}) {
  const timeLabel = formatRelativeTime(event.timestamp);
  const clockTime = formatClockTime(event.timestamp);
  const subtitle = formatEventSubtitle(event);
  const latestUpdate =
    Array.isArray(event.latest_update) && event.latest_update.length
      ? event.latest_update[0]
      : null;
  const waveformRef = useRef(null);
  const waveSurferRef = useRef(null);
  const [waveReady, setWaveReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [activeLine, setActiveLine] = useState(null);
  const [transcriptError, setTranscriptError] = useState("");

  const evidenceCallIds = useMemo(() => new Set(evidence?.callIds || []), [evidence]);
  const evidenceTranscriptIds = useMemo(
    () => new Set(evidence?.transcriptIds || []),
    [evidence]
  );
  const isEvidence =
    (event.call_id && evidenceCallIds.has(event.call_id)) ||
    (event.transcript_id && evidenceTranscriptIds.has(event.transcript_id));

  const isActive = playback?.event_id === event.event_id;
  const keyFacts = buildKeyFacts(event);
  const transcriptCount = event.transcript_count || transcripts.length;
  const hasAudio = Boolean(event.audio_url);
  const isIncident = event.event_type === "incident";
  const tone = resolveTone(event);
  const showRail = event.event_type === "dispatch";
  const railStart = formatRailTime(event.received_at || event.timestamp, "Unknown");
  const railEnd = formatRailTime(
    event.closed_at || event.last_update_at || event.updated_at,
    "Active"
  );

  useEffect(() => {
    let active = true;
    if (!expanded || event.event_type !== "dispatch") return undefined;
    if (!event.event_id || !event.call_id) return undefined;
    setTranscriptError("");
    fetchTimelineTranscript(event.event_id)
      .then((payload) => {
        if (!active) return;
        setTranscripts(payload.transcripts || []);
      })
      .catch((err) => {
        if (!active) return;
        setTranscriptError(err.message || "Transcript unavailable.");
      });
    return () => {
      active = false;
    };
  }, [expanded, event.event_id, event.call_id, event.transcript_id]);

  useEffect(() => {
    if (!expanded || !hasAudio || !waveformRef.current) return undefined;
    const wave = WaveSurfer.create({
      container: waveformRef.current,
      height: 64,
      barWidth: 2,
      barGap: 2,
      waveColor: "#334155",
      progressColor: "#f97316",
      cursorColor: "#e2e8f0",
      normalize: true
    });
    waveSurferRef.current = wave;
    setWaveReady(false);
    wave.load(event.audio_url);

    const handleReady = () => setWaveReady(true);
    const handleAudio = () => {
      onPlaybackUpdate?.({
        event_id: event.event_id,
        call_id: event.call_id,
        position: wave.getCurrentTime(),
        timestamp: event.timestamp
      });
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    wave.on("ready", handleReady);
    wave.on("audioprocess", handleAudio);
    wave.on("seek", handleAudio);
    wave.on("play", handlePlay);
    wave.on("pause", handlePause);

    return () => {
      setIsPlaying(false);
      wave.destroy();
      waveSurferRef.current = null;
    };
  }, [expanded, event.audio_url, event.event_id, event.call_id, event.timestamp, hasAudio, onPlaybackUpdate]);

  useEffect(() => {
    const wave = waveSurferRef.current;
    if (!wave || !waveReady) return;
    if (!isActive) {
      wave.pause();
      setIsPlaying(false);
      return;
    }
    if (typeof playback?.position === "number") {
      const current = wave.getCurrentTime();
      if (Math.abs(current - playback.position) > 0.5) {
        wave.setTime(playback.position);
      }
    }
  }, [isActive, playback?.position, waveReady]);

  return (
    <div
      className={`timeline-event timeline-event--tone-${tone} ${
        isActive ? "timeline-event--active" : ""
      } ${isEvidence ? "timeline-event--evidence" : ""}`}
      style={{ marginLeft: depth * 18 }}
    >
      <div className="timeline-event-row">
        <div className={`timeline-marker ${showRail ? "" : "timeline-marker--muted"}`}>
          <span className="timeline-dot" />
        </div>
        <button
          type="button"
          className="timeline-event-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {expanded ? "–" : "+"}
        </button>
        <button
          type="button"
          className="timeline-event-body"
          onClick={onSelect}
        >
          <div className="timeline-event-time" title={timeLabel.title}>
            {clockTime}
          </div>
          <div className="timeline-event-main">
            <div className="timeline-event-title">
              {formatEventTitle(event)}
              {!isIncident ? (
                <span className="timeline-event-type">{event.event_type}</span>
              ) : null}
            </div>
            {subtitle ? (
              <div className="timeline-event-subtitle">{subtitle}</div>
            ) : null}
            {showRail ? (
              <div className="timeline-rail">
                <span className="timeline-rail-time">{railStart}</span>
                <span className="timeline-rail-line" />
                <span className="timeline-rail-time">{railEnd}</span>
              </div>
            ) : null}
            {event.summary_tokens?.length ? (
              <div className="timeline-summary-tokens">
                {event.summary_tokens.map((token, index) => (
                  <span
                    key={`${token.label}-${index}`}
                    className={`timeline-summary-chip timeline-summary-chip--${token.tone || "neutral"}`}
                  >
                    {token.label}
                  </span>
                ))}
              </div>
            ) : null}
            {event.transcript_preview ? (
              <div className="timeline-event-preview">{event.transcript_preview}</div>
            ) : null}
            {event.summary ? (
              <div className="timeline-event-preview">{event.summary}</div>
            ) : null}
            {event.summary_text ? (
              <div className="timeline-event-preview">{event.summary_text}</div>
            ) : null}
            {latestUpdate ? (
              <div className="timeline-event-preview">{latestUpdate}</div>
            ) : null}
            {event.decision ? (
              <div className="timeline-event-preview">{event.decision}</div>
            ) : null}
            {event.summary_line ? (
              <div className="timeline-event-preview">{event.summary_line}</div>
            ) : null}
          </div>
          <div className="timeline-event-meta">
            <div>{timeLabel.text}</div>
            {event.status ? <div>{event.status}</div> : null}
            {transcriptCount ? (
              <div>
                {transcriptCount} transcript{transcriptCount !== 1 ? "s" : ""}
              </div>
            ) : null}
          </div>
        </button>
      </div>

      {expanded && !isIncident ? (
        <div className="timeline-event-detail">
          {hasAudio ? (
            <div className="timeline-waveform">
              <div className="timeline-waveform-header">
                <span>Radio audio</span>
                <button
                  type="button"
                  className="timeline-play-toggle"
                  onClick={() => waveSurferRef.current?.playPause()}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
              </div>
              <div ref={waveformRef} className="timeline-waveform-canvas" />
            </div>
          ) : (
            <div className="timeline-waveform timeline-waveform--empty">
              Audio unavailable.
            </div>
          )}

          <div className="timeline-detail-grid">
            <div>
              {transcriptError ? (
                <div className="transcript-empty">{transcriptError}</div>
              ) : (
                <TranscriptPanel
                  transcripts={transcripts}
                  activeLine={activeLine}
                  onSelectLine={setActiveLine}
                  onSeek={(ratio) => {
                    if (!waveSurferRef.current) return;
                    waveSurferRef.current.seekTo(ratio);
                  }}
                  highlightTranscriptIds={evidenceTranscriptIds}
                />
              )}
            </div>
            <div className="timeline-keyfacts">
              <div className="timeline-keyfacts-title">Key facts</div>
              {keyFacts.length ? (
                <ul>
                  {keyFacts.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="timeline-keyfacts-empty">No structured fields.</div>
              )}
              {event.call_id && onOpenCall ? (
                <button
                  type="button"
                  className="timeline-call-link"
                  onClick={() => onOpenCall(event.call_id)}
                >
                  Open call detail
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {expanded && children ? (
        <div className="timeline-children">{children}</div>
      ) : null}
    </div>
  );
}
