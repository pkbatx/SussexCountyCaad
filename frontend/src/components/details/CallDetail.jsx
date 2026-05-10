import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCallDetail } from "../../api";
import { useSignals } from "../../hooks/useSignals";
import { StatusBar } from "../layout/StatusBar";
import { MAPBOX_ACCESS_TOKEN } from "../../config";

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function confidenceColor(score) {
  if (typeof score !== "number") return "var(--text-muted)";
  if (score >= 0.8) return "var(--accent-green)";
  if (score >= 0.6) return "var(--accent-amber)";
  return "var(--accent-red)";
}

function lowestFieldConfidence(extraction) {
  const fc = extraction?.field_confidence;
  if (!fc) return null;
  const values = Object.values(fc).filter((v) => typeof v === "number");
  if (!values.length) return null;
  return Math.min(...values);
}

function shortId(callId) {
  const s = String(callId || "");
  return s.length > 4 ? `${s.slice(0, 4)}…` : s;
}

function Transcript({ transcript }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const rafRef = useRef(0);

  useEffect(() => {
    const audio = document.getElementById("call-detail-audio");
    if (!audio || !Array.isArray(transcript?.words)) return undefined;
    const handler = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const t = audio.currentTime;
        const idx = transcript.words.findIndex(
          (w) => typeof w.start === "number" && typeof w.end === "number" && t >= w.start && t <= w.end
        );
        setActiveIndex(idx);
      });
    };
    audio.addEventListener("timeupdate", handler);
    return () => {
      audio.removeEventListener("timeupdate", handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [transcript]);

  if (!transcript?.text) {
    return <div className="transcript transcript--empty">Transcript pending…</div>;
  }

  if (Array.isArray(transcript.words) && transcript.words.length > 0) {
    return (
      <div className="transcript" aria-live="polite">
        {transcript.words.map((word, i) => (
          <span key={i} className={i === activeIndex ? "word word-active" : "word"}>
            {word.text || word.word || ""}{" "}
          </span>
        ))}
      </div>
    );
  }
  return <div className="transcript">{transcript.text}</div>;
}

function DetailsTray({ location, extractionPayload, stages, signals, signalsCount }) {
  const { address, town, lat, lng } = location;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const staticUrl =
    hasCoords && MAPBOX_ACCESS_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+3b82f6(${lng},${lat})/${lng},${lat},14,0/200x120@2x?access_token=${MAPBOX_ACCESS_TOKEN}`
      : null;

  const confidenceRows = Object.entries(extractionPayload?.field_confidence || {})
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => a[1] - b[1]);

  const summaryBits = [];
  if (address || town) summaryBits.push("Location");
  if (confidenceRows.length) summaryBits.push("Extraction");
  if (stages?.length) summaryBits.push("Stages");
  summaryBits.push(`Signals${signalsCount ? ` (${signalsCount})` : ""}`);

  return (
    <details className="details-tray">
      <summary className="details-tray-summary">
        <span className="details-tray-label">DETAILS</span>
        <span className="details-tray-mini">{summaryBits.join(" · ")}</span>
      </summary>
      <div className="details-tray-cols">
        <div className="details-col">
          <div className="details-col-title">LOCATION</div>
          {address || town ? (
            <>
              <div className="details-row"><span className="k">address</span><span>{address || "—"}</span></div>
              <div className="details-row"><span className="k">town</span><span>{town || "—"}</span></div>
              {hasCoords ? (
                <div className="details-row">
                  <span className="k">coords</span>
                  <span className="mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                </div>
              ) : null}
              {staticUrl ? <img src={staticUrl} alt="" className="static-map" /> : null}
            </>
          ) : (
            <div className="details-empty">—</div>
          )}
        </div>

        <div className="details-col">
          <div className="details-col-title">EXTRACTION</div>
          {confidenceRows.length === 0 ? (
            <div className="details-empty">—</div>
          ) : (
            confidenceRows.map(([field, score]) => {
              const low = score < 0.6;
              return (
                <div key={field} className={`details-row ${low ? "is-low" : ""}`}>
                  <span className="k">{low ? "⚠ " : ""}{field}</span>
                  <span className="mono">{score.toFixed(2)}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="details-col">
          <div className="details-col-title">STAGES</div>
          {!stages?.length ? (
            <div className="details-empty">—</div>
          ) : (
            stages.map((stage) => {
              const startedAt = stage.started_at || stage.startedAt;
              const completedAt = stage.completed_at || stage.completedAt;
              let delta = "";
              if (startedAt && completedAt) {
                const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
                if (Number.isFinite(ms)) delta = `${ms}ms`;
              }
              const color = { succeeded: "var(--accent-green)", running: "var(--accent-amber)", failed: "var(--accent-red)" }[stage.status] || "var(--text-muted)";
              return (
                <div key={stage.stage_name || stage.stage} className="details-row">
                  <span className="k">{stage.stage_name || stage.stage}</span>
                  <span className="mono" style={{ color }}>{stage.status}{delta ? ` · ${delta}` : ""}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="details-col">
          <div className="details-col-title">
            SIGNALS
            {signalsCount > 0 ? <span className="details-col-count"> ({signalsCount})</span> : null}
          </div>
          {!signals?.length ? (
            <div className="details-empty">—</div>
          ) : (
            signals.map((sig) => (
              <div key={sig.id} className="details-signal">
                <span className={`signal-pill signal-pill--${sig.signal}`}>{sig.signal}</span>
                <span className="signal-reason" title={sig.reason || ""}>{sig.reason || "—"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </details>
  );
}

function CallSkeleton({ callId, onBack }) {
  return (
    <div className="route call-route">
      <StatusBar
        onBack={onBack}
        idLabel="CALL"
        idShort={shortId(callId)}
        title="LOADING…"
        subtitle=""
      />
      <div className="skeleton-block call-audio" aria-hidden="true" />
      <div className="call-transcript">
        <div className="section-title">TRANSCRIPT</div>
        <div className="skeleton-lines" aria-hidden="true">
          <div /><div /><div /><div className="short" /><div />
        </div>
      </div>
    </div>
  );
}

export function CallDetail({ callId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { signals } = useSignals(callId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCallDetail(callId)
      .then((next) => { if (active) setData(next); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [callId]);

  const extractionPayload = useMemo(() => {
    const extract = (data?.metadata_extracts || data?.extracts || [])
      .find((m) => m.schema_version === "extraction.v2");
    if (!extract?.payload_json) return null;
    try { return JSON.parse(extract.payload_json); } catch (_err) { return null; }
  }, [data]);

  if (loading) return <CallSkeleton callId={callId} onBack={onBack} />;
  if (!data) {
    return (
      <div className="route call-route">
        <StatusBar onBack={onBack} idLabel="CALL" idShort={shortId(callId)} title="NOT FOUND" />
        <div className="empty-state">CALL NOT FOUND</div>
      </div>
    );
  }

  const operator = data.operator_fields || {};
  const transcript = data.transcripts?.[0] || null;
  const audioUrl = data.audio?.url || null;
  const lowestConf = lowestFieldConfidence(extractionPayload);
  const signalsCount = signals.length;

  const subtitleParts = [
    formatTimestamp(data.call?.first_seen_at),
    operator.agency || data.call?.agency_name || "—"
  ];
  if (typeof lowestConf === "number") {
    subtitleParts.push(
      <span key="conf" style={{ color: confidenceColor(lowestConf) }}>
        conf {lowestConf.toFixed(2)}
      </span>
    );
  }
  if (signalsCount > 0) {
    subtitleParts.push(
      <span key="sig" style={{ color: "var(--accent-amber)" }}>⚠ {signalsCount} signal{signalsCount === 1 ? "" : "s"}</span>
    );
  }

  const subtitle = subtitleParts.flatMap((part, i) =>
    i === 0 ? [part] : [<span key={`sep-${i}`} className="status-bar-sep">·</span>, part]
  );

  const firstLocation = data.locations?.[0];

  return (
    <div className="route call-route">
      <StatusBar
        onBack={onBack}
        idLabel="CALL"
        idShort={shortId(callId)}
        title={String(operator.incident_type || "CALL").toUpperCase()}
        subtitle={<span className="status-bar-subtitle-line">{subtitle}</span>}
      />

      <div className="call-audio">
        {audioUrl ? (
          <audio
            id="call-detail-audio"
            className="tactical-audio"
            controls
            preload="metadata"
            src={audioUrl}
          />
        ) : (
          <div className="empty-state empty-state--inline">AUDIO UNAVAILABLE</div>
        )}
      </div>

      <div className="call-transcript">
        <div className="section-title">TRANSCRIPT</div>
        <Transcript transcript={transcript} />
      </div>

      <DetailsTray
        location={{
          address: operator.address,
          town: operator.town,
          lat: firstLocation?.latitude,
          lng: firstLocation?.longitude
        }}
        extractionPayload={extractionPayload}
        stages={data.stages}
        signals={signals}
        signalsCount={signalsCount}
      />
    </div>
  );
}
