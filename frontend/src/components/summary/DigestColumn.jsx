import React, { useEffect, useMemo, useState } from "react";
import { fetchDigestSummaries } from "../../api";
import { formatRelativeTime } from "../../state/formatting";

const WINDOW_ORDER = [{ key: "24h", title: "Last 24h" }];

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  const deduped = [];
  entries.forEach((entry, index) => {
    if (!entry) return;
    const locationKey = [entry.address, entry.town, entry.incident_type]
      .filter(Boolean)
      .join("|");
    const key =
      entry.incident_id ||
      entry.incidentId ||
      (locationKey ? locationKey.toLowerCase() : "") ||
      entry.summary ||
      `row-${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(entry);
  });
  return deduped;
}

function DigestSection({ title, entries, emptyMessage }) {
  return (
    <div className="digest-section">
      {title ? <div className="digest-section-title">{title}</div> : null}
      <ul className="digest-entries">
        {entries.length ? (
          entries.map((entry, index) => {
            const location =
              entry.address || entry.town || entry.cross_street || entry.poi || "";
            const metaParts = [entry.agency, entry.incident_type, location].filter(Boolean);
            const time = formatRelativeTime(entry.updated_at);
            return (
              <li key={entry.incident_id || entry.summary || index} className="digest-entry">
                <div className="digest-entry-title">
                  {entry.summary || "Incident update pending."}
                </div>
                {metaParts.length ? (
                  <div className="digest-entry-meta">{metaParts.join(" \u00b7 ")}</div>
                ) : null}
                {entry.updated_at ? (
                  <div className="digest-entry-time" title={time.title}>
                    Updated {time.text}
                  </div>
                ) : null}
              </li>
            );
          })
        ) : (
          <li className="digest-entry digest-entry-empty">{emptyMessage}</li>
        )}
      </ul>
    </div>
  );
}

export function DigestColumn({ filters, refreshToken }) {
  const [digests, setDigests] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetchDigestSummaries({ filters });
        if (!active) return;
        setDigests(response?.digests || []);
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error.message || "Digest unavailable.");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [filters, refreshToken]);

  const digestLookup = useMemo(() => {
    return new Map(
      (digests || []).map((digest) => [digest.window_label, digest.entries || []])
    );
  }, [digests]);

  return (
    <section className="digest-column">
      <div className="digest-column-header">Incident digest (last 24h)</div>
      {WINDOW_ORDER.map((window) => {
        const entries = normalizeEntries(digestLookup.get(window.key) || []);
        return (
          <DigestSection
            key={window.key}
            title={WINDOW_ORDER.length > 1 ? window.title : null}
            entries={entries}
            emptyMessage={errorMessage || "No incidents in this window."}
          />
        );
      })}
    </section>
  );
}
