import React, { useEffect, useMemo, useState } from "react";

function formatClock(value) {
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AppLayout({
  title,
  left,
  center,
  right,
  summary,
  footer,
  sseStatus,
  nav
}) {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);

  const statusLabel = useMemo(() => {
    if (!sseStatus?.status) return null;
    if (sseStatus.status === "connected") return "Live";
    if (sseStatus.status === "connecting") return "Connecting";
    return "Offline";
  }, [sseStatus]);

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <div className="brand">SussexCountyCAAD</div>
          <div className="brand-subtitle">Operational CAD View</div>
        </div>
        <div className="header-center">{nav}</div>
        <div className="header-right">
          <div className="nav-title">Operations Console</div>
          <div className="header-clock">{clock}</div>
          {statusLabel ? (
            <div className={`sse-status sse-status--${sseStatus.status}`}>
              {statusLabel}
            </div>
          ) : null}
        </div>
      </header>

      <main className="app-shell">
        <div className="page-heading">{title}</div>
        <div className="summary-strip">{summary}</div>
        <div className="app-grid">
          <section className="panel panel-left">{left}</section>
          <section className="panel panel-center">
            {center || <div className="empty-state">No data available.</div>}
          </section>
          <section className="panel panel-right">{right}</section>
        </div>
        {footer ? <div className="app-footer">{footer}</div> : null}
      </main>
    </>
  );
}
