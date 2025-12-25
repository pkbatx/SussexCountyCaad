import React from "react";

function splitTranscript(text) {
  if (!text) return [];
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length) return lines;
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function TranscriptPanel({
  transcripts,
  activeLine,
  onSelectLine,
  onSeek,
  highlightTranscriptIds
}) {
  if (!transcripts?.length) {
    return <div className="transcript-empty">Transcript unavailable.</div>;
  }

  return (
    <div className="transcript-panel">
      {transcripts.map((transcript) => {
        const lines = splitTranscript(transcript.text);
        const highlight = highlightTranscriptIds?.has(transcript.transcript_id);
        return (
          <div
            key={transcript.transcript_id}
            className={`transcript-block ${highlight ? "transcript-block--evidence" : ""}`}
          >
            <div className="transcript-header">
              <span>Transcript</span>
              {transcript.confidence ? (
                <span className="transcript-confidence">
                  {Math.round(transcript.confidence * 100)}%
                </span>
              ) : null}
            </div>
            <ul className="transcript-lines">
              {lines.map((line, index) => {
                const lineKey = `${transcript.transcript_id}:${index}`;
                const isActive = activeLine === lineKey;
                return (
                  <li key={lineKey}>
                    <button
                      type="button"
                      className={`transcript-line ${isActive ? "transcript-line--active" : ""}`}
                      onClick={() => {
                        onSelectLine?.(lineKey);
                        const ratio =
                          lines.length > 1 ? index / (lines.length - 1) : 0;
                        onSeek?.(ratio);
                      }}
                    >
                      {line}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
