import React, { useEffect, useMemo, useState } from "react";
import { formatClock24 } from "../../state/formatting";
import logoUrl from "../../../caad.png";

export function AppLayout({
  title,
  left,
  center,
  right,
  summary,
  topbar,
  footer,
  sseStatus,
  nav,
  layout = "standard",
  centerSpan = "one"
}) {
  const [clock, setClock] = useState(() => formatClock24(new Date()));

  useEffect(() => {
    const tick = () => setClock(formatClock24(new Date()));
    const timer = setInterval(tick, 1000);
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
        <a className="header-left brand-link" href="#/incidents">
          <img className="brand-logo" src={logoUrl} alt="CAAD logo" />
          <div className="brand-text">
            <div className="brand">Sussex County</div>
            <div className="brand-subtitle">Computer Aided Agent Dispatch</div>
          </div>
        </a>
        <div className="header-right">
          <div className="header-status-row">
            <div className="header-clock">{clock}</div>
            {statusLabel ? (
              <div className={`sse-status sse-status--${sseStatus.status}`}>
                {statusLabel}
              </div>
            ) : null}
          </div>
          {nav ? <div className="header-last-call">{nav}</div> : null}
        </div>
      </header>

      {topbar ? <div className="app-topbar">{topbar}</div> : null}

      <main className="app-shell">
        {title ? <div className="page-heading">{title}</div> : null}
        {summary ? <div className="summary-strip">{summary}</div> : null}
        <div
          className={[
            layout === "ops" ? "ops-grid" : "app-grid",
            layout === "ops" ? "" : left ? "" : "app-grid--no-left",
            layout === "ops" ? "" : right ? "" : "app-grid--no-right"
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {left ? (
            <section
              className={layout === "ops" ? "ops-column ops-column-left" : "panel panel-left"}
            >
              {left}
            </section>
          ) : null}
          <section
            className={
              layout === "ops"
                ? [
                    "ops-column ops-column-center",
                    centerSpan === "two" ? "ops-column--span-two" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")
                : "panel panel-center"
            }
          >
            {center || <div className="empty-state">No data available.</div>}
          </section>
          {right ? (
            <section
              className={layout === "ops" ? "ops-column ops-column-right" : "panel panel-right"}
            >
              {right}
            </section>
          ) : null}
        </div>
        {footer ? <div className="app-footer">{footer}</div> : null}
      </main>
    </>
  );
}
