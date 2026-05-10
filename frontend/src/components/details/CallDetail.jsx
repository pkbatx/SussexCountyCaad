import React, { useEffect, useRef, useState } from "react";
import { getCallDetail } from "../../api";
import { useSignals } from "../../hooks/useSignals";
import { MAPBOX_ACCESS_TOKEN } from "../../config";

function formatTimestamp(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

// --- Audio + word-level transcript ----------------------------------------

function Transcript({ transcript }) {
  const audioRef = useRef(null);
  // Audio element lives outside this component; the parent passes the ref via context.
  // For simplicity we use a global lookup via the audio element id.
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const audio = document.getElementById("call-detail-audio");
    if (!audio) return undefined;
    audioRef.current = audio;
    if (!Array.isArray(transcript?.words)) return undefined;

    const handler = () => {
      const t = audio.currentTime;
      const idx = transcript.words.findIndex(
        (w) => typeof w.start === "number" && typeof w.end === "number" && t >= w.start && t <= w.end
      );
      setActiveIndex(idx);
    };
    audio.addEventListener("timeupdate", handler);
    return () => audio.removeEventListener("timeupdate", handler);
  }, [transcript]);

  if (!transcript?.text) {
    return <div className="transcript transcript--empty">Transcript pending…</div>;
  }

  if (Array.isArray(transcript.words) && transcript.words.length > 0) {
    return (
      <div className="transcript">
        {transcript.words.map((word, i) => (
          <span key={i} className={classNames("word", i === activeIndex && "word-active")}>
            {word.text || word.word || ""}{" "}
          </span>
        ))}
      </div>
    );
  }

  return <div className="transcript">{transcript.text}</div>;
}

// --- Metadata cards --------------------------------------------------------

function CallCard({ call, agency, incidentType, firstSeenLabel }) {
  return (
    <div className="meta-card">
      <div className="meta-card-title">CALL</div>
      <div className="meta-row"><span className="meta-key">type</span><span>{incidentType || "—"}</span></div>
      <div className="meta-row"><span className="meta-key">agency</span><span>{agency || "—"}</span></div>
      <div className="meta-row"><span className="meta-key">received</span><span className="meta-mono">{firstSeenLabel}</span></div>
      <div className="meta-row"><span className="meta-key">status</span><span>{call?.status || "—"}</span></div>
    </div>
  );
}

function LocationCard({ address, town, lat, lng, isLowConfidence }) {
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const staticUrl =
    hasCoords && MAPBOX_ACCESS_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+3b82f6(${lng},${lat})/${lng},${lat},14,0/200x120@2x?access_token=${MAPBOX_ACCESS_TOKEN}`
      : null;
  return (
    <div className={classNames("meta-card", isLowConfidence && "is-low-confidence")}>
      <div className="meta-card-title">LOCATION</div>
      <div className="meta-row"><span className="meta-key">address</span><span>{address || "—"}</span></div>
      <div className="meta-row"><span className="meta-key">town</span><span>{town || "—"}</span></div>
      {hasCoords ? (
        <div className="meta-row">
          <span className="meta-key">coords</span>
          <span className="meta-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
        </div>
      ) : null}
      {staticUrl ? <img src={staticUrl} alt="map" className="static-map" /> : null}
    </div>
  );
}

function ConfidenceCard({ extraction, isLowConfidence }) {
  const fc = extraction?.field_confidence || {};
  const rows = Object.entries(fc)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => a[1] - b[1]);
  if (rows.length === 0) return null;
  return (
    <div className={classNames("meta-card", isLowConfidence && "is-low-confidence")}>
      <div className="meta-card-title">EXTRACTION CONFIDENCE</div>
      {rows.map(([field, score]) => {
        const low = score < 0.6;
        return (
          <div key={field} className={classNames("meta-row", low && "is-low")}>
            <span className="meta-key">{low ? "⚠ " : ""}{field}</span>
            <span className="meta-mono">{score.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SignalsCard({ signals }) {
  if (!signals?.length) return null;
  return (
    <div className="meta-card">
      <div className="meta-card-title">SIGNALS</div>
      {signals.map((sig) => (
        <div key={sig.id} style={{ padding: "4px 0", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span className={`signal-pill signal-pill--${sig.signal}`}>{sig.signal}</span>
          <span className="meta-mono" style={{ color: "var(--text-muted)" }}>{sig.stage}</span>
          <span title={sig.reason || ""} style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sig.reason || ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function StageHistoryCard({ stages }) {
  if (!stages?.length) return null;
  return (
    <details className="meta-card stage-history">
      <summary>STAGE HISTORY</summary>
      <div style={{ marginTop: 8 }}>
        {stages.map((stage) => {
          const startedAt = stage.started_at || stage.startedAt;
          const completedAt = stage.completed_at || stage.completedAt;
          let delta = "";
          if (startedAt && completedAt) {
            const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
            if (Number.isFinite(ms)) delta = `${ms}ms`;
          }
          const status = stage.status;
          const colorMap = { succeeded: "var(--accent-green)", running: "var(--accent-amber)", failed: "var(--accent-red)" };
          return (
            <div key={stage.stage_name || stage.stage} className="meta-row">
              <span className="meta-key">{stage.stage_name || stage.stage}</span>
              <span style={{ color: colorMap[status] || "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
                {status}{delta ? ` · ${delta}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}

// --- Top-level component ---------------------------------------------------

export function CallDetail({ callId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { signals } = useSignals(callId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getCallDetail(callId)
      .then((next) => { if (active) setData(next); })
      .catch((err) => { if (active) setError(`Failed to load call: ${err.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [callId]);

  if (loading) {
    return (
      <div style={{ padding: 24, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace" }}>
        Loading call…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: 24, color: "var(--accent-red)", fontFamily: "IBM Plex Mono, monospace" }}>
        {error || "Call not found."}
      </div>
    );
  }

  const operator = data.operator_fields || {};
  const transcript = data.transcripts?.[0] || null;
  const audioUrl = data.audio?.url || null;
  const extracts = data.metadata_extracts || data.extracts || [];
  const extraction = extracts.find((m) => m.schema_version === "extraction.v2");
  let extractionPayload = null;
  if (extraction?.payload_json) {
    try {
      extractionPayload = JSON.parse(extraction.payload_json);
    } catch (_err) { /* ignore */ }
  }

  const ambiguous = signals.some((s) => s.signal === "ambiguous");
  const firstLocation = data.locations?.[0];
  const lat = firstLocation?.latitude;
  const lng = firstLocation?.longitude;

  return (
    <div className="call-split">
      <div className="call-left">
        <button className="call-back" type="button" onClick={onBack}>◀ BACK</button>
        {audioUrl ? (
          <audio
            id="call-detail-audio"
            className="tactical-audio"
            controls
            preload="metadata"
            src={audioUrl}
          />
        ) : (
          <div className="transcript transcript--empty">Audio unavailable.</div>
        )}
        <Transcript transcript={transcript} />
      </div>

      <div className="call-right">
        <CallCard
          call={data.call}
          agency={operator.agency}
          incidentType={operator.incident_type}
          firstSeenLabel={formatTimestamp(data.call?.first_seen_at)}
        />
        <LocationCard
          address={operator.address}
          town={operator.town}
          lat={lat}
          lng={lng}
          isLowConfidence={ambiguous}
        />
        <ConfidenceCard extraction={extractionPayload} isLowConfidence={ambiguous} />
        <SignalsCard signals={signals} />
        <StageHistoryCard stages={data.stages} />
      </div>
    </div>
  );
}
