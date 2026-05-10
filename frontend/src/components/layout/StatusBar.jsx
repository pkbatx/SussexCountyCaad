import React from "react";

// Pill kinds rendered by the status bar. Any other value collapses to active.
const PILLS = {
  active: { glyph: "●", label: "ACTIVE", className: "status-pill--active" },
  monitoring: { glyph: "◐", label: "MONITORING", className: "status-pill--monitoring" },
  resolved: { glyph: "✓", label: "RESOLVED", className: "status-pill--resolved" }
};

export function StatusBar({ onBack, idLabel, idShort, title, subtitle, pill, flag }) {
  const pillSpec = pill ? PILLS[pill] || PILLS.active : null;
  return (
    <header className="status-bar">
      <div className="status-bar-row">
        <button type="button" className="status-bar-back" onClick={onBack} aria-label="Back">
          ◀ BACK
        </button>
        {idLabel ? (
          <span className="status-bar-id">
            {idLabel} <span className="status-bar-id-value">{idShort}</span>
          </span>
        ) : null}
        {pillSpec ? (
          <span
            className={`status-pill ${pillSpec.className}`}
            aria-label={pillSpec.label.toLowerCase()}
          >
            <span aria-hidden="true">{pillSpec.glyph}</span> {pillSpec.label}
          </span>
        ) : null}
        {flag ? <span className="status-bar-flag">{flag}</span> : null}
      </div>
      <div className="status-bar-row status-bar-row--title">
        <span className="status-bar-title">{title}</span>
        {subtitle ? <span className="status-bar-subtitle">{subtitle}</span> : null}
      </div>
    </header>
  );
}
