import React from "react";
import { formatRelativeTime } from "../../state/formatting";

export function IncidentSummaryPanel({
  summary,
  activeStatementId,
  onSelectStatement
}) {
  const updated = formatRelativeTime(summary?.updated_at);
  const statements = summary?.statements || [];

  return (
    <div className="incident-summary-panel">
      <div className="incident-summary-header">
        <div>Incident summary</div>
        <span title={updated.title}>{updated.text}</span>
      </div>
      {statements.length ? (
        <ul className="incident-summary-list">
          {statements.map((statement) => (
            <li key={statement.statement_id}>
              <button
                type="button"
                className={`incident-summary-item ${
                  activeStatementId === statement.statement_id
                    ? "incident-summary-item--active"
                    : ""
                }`}
                onClick={() => onSelectStatement?.(statement)}
              >
                {statement.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="incident-summary-empty">No summary statements yet.</div>
      )}
    </div>
  );
}
