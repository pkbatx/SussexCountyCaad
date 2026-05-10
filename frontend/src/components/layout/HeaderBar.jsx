import React from "react";

function statusClass(status) {
  if (status === "connected") return "sse-dot--connected";
  if (status === "disconnected") return "sse-dot--disconnected";
  return "sse-dot--connecting";
}

function statusLabel(status) {
  if (status === "connected") return "LIVE";
  if (status === "disconnected") return "OFFLINE";
  return "RECONNECTING";
}

export function HeaderBar({ sseStatus, lastRefresh, activeIncidentCount }) {
  const ts = lastRefresh ? new Date(lastRefresh).toISOString().replace("T", " ").slice(0, 19) : "—";
  return (
    <header className="tactical-header">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1>SussexCountyCAAD</h1>
        <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
          OPERATOR CONSOLE
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }} className="mono">
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span className={`sse-dot ${statusClass(sseStatus)}`} />
          {statusLabel(sseStatus)}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          ACTIVE&nbsp;<span style={{ color: "var(--text-primary)" }}>{activeIncidentCount ?? "—"}</span>
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          UPDATED&nbsp;<span style={{ color: "var(--text-primary)" }}>{ts}</span>
        </span>
      </div>
    </header>
  );
}
