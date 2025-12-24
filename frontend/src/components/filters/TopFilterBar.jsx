import React, { useEffect, useState } from "react";
import { Popover } from "@headlessui/react";
import {
  applyRelativeWindow,
  fromDateInputEnd,
  fromDateInputStart,
  toDateInputValue
} from "../../state/filters";
import { FilterPanel } from "./FilterPanel";
import { fetchSummaryMetrics } from "../../api";

function TopMetrics({ filters, refreshToken }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = await fetchSummaryMetrics({ filters });
        if (!active) return;
        setMetrics(next);
      } catch (_error) {
        if (!active) return;
        setMetrics(null);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [filters, refreshToken]);

  return (
    <div className="top-metrics">
      <div className="top-metric">
        <div className="top-metric-label">Incidents</div>
        <div className="top-metric-value">{metrics?.incident_active_count ?? 0}</div>
      </div>
      <div className="top-metric">
        <div className="top-metric-label">Calls</div>
        <div className="top-metric-value">{metrics?.call_active_count ?? 0}</div>
      </div>
      <div className="top-metric">
        <div className="top-metric-label">Resolved</div>
        <div className="top-metric-value">{metrics?.incident_resolved_count ?? 0}</div>
      </div>
    </div>
  );
}

export function TopFilterBar({ filters, onChange, refreshToken }) {
  return (
    <div className="top-filter-bar">
      <div className="top-filter-group">
        <button
          className="button small"
          type="button"
          onClick={() => onChange(applyRelativeWindow(24))}
        >
          Last 24h
        </button>
        <button
          className="button small"
          type="button"
          onClick={() => onChange(applyRelativeWindow(24 * 7))}
        >
          Last 7d
        </button>
        <button
          className="button small"
          type="button"
          onClick={() => onChange(applyRelativeWindow(24 * 30))}
        >
          Last 30d
        </button>
      </div>
      <div className="top-filter-group">
        <label className="top-filter-field">
          <span className="top-filter-label">Start date</span>
          <input
            className="filter-input"
            type="date"
            value={toDateInputValue(filters.start)}
            onChange={(event) =>
              onChange({ start: fromDateInputStart(event.target.value) })
            }
          />
        </label>
        <label className="top-filter-field">
          <span className="top-filter-label">End date</span>
          <input
            className="filter-input"
            type="date"
            value={toDateInputValue(filters.end)}
            onChange={(event) =>
              onChange({ end: fromDateInputEnd(event.target.value) })
            }
          />
        </label>
        <Popover className="top-filter-popover">
          <Popover.Button className="button small top-filter-trigger" type="button">
            Filters
          </Popover.Button>
          <Popover.Panel className="top-filter-panel">
            <FilterPanel filters={filters} onChange={onChange} />
          </Popover.Panel>
        </Popover>
      </div>
      <TopMetrics filters={filters} refreshToken={refreshToken} />
    </div>
  );
}
