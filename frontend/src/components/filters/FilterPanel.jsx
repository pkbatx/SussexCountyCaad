import React, { useEffect, useMemo, useState } from "react";
import { Listbox, RadioGroup, Switch } from "@headlessui/react";
import { listAgencies } from "../../api";
import { SERVICE_TYPES } from "../../config";
import {
  applyRelativeWindow,
  fromLocalInput,
  toLocalInputValue
} from "../../state/filters";

const STATUS_OPTIONS = [
  { value: "any", label: "All" },
  { value: "active", label: "active" },
  { value: "monitoring", label: "monitoring" },
  { value: "resolved", label: "resolved" },
  { value: "processing", label: "processing" },
  { value: "failed", label: "failed" }
];

export function FilterPanel({ filters, onChange }) {
  const [agencies, setAgencies] = useState([]);

  const selectedAgencies = useMemo(() => {
    if (Array.isArray(filters.agencies)) return new Set(filters.agencies);
    if (filters.agency) return new Set([filters.agency]);
    return new Set();
  }, [filters.agencies, filters.agency]);

  const selectedAgencyList = useMemo(
    () => Array.from(selectedAgencies),
    [selectedAgencies]
  );

  const selectedServices = useMemo(() => {
    if (Array.isArray(filters.serviceTypes)) return new Set(filters.serviceTypes);
    if (filters.serviceType) return new Set([filters.serviceType]);
    return new Set();
  }, [filters.serviceTypes, filters.serviceType]);

  useEffect(() => {
    let active = true;
    async function loadAgencies() {
      try {
        const results = await listAgencies({ filters });
        if (!active) return;
        const unknownItem = {
          canonical_name: "Unknown",
          call_count: 0,
          re_alert_count: 0,
          service_type: "Unknown"
        };
        setAgencies([unknownItem, ...(results || [])]);
      } catch (_error) {
        // Ignore agency load failures; filters remain usable.
      }
    }
    loadAgencies();
    return () => {
      active = false;
    };
  }, [filters]);

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <div className="panel-title">Operational window</div>
        <div className="quick-range">
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
        <div className="filter-grid filter-grid--two">
          <label className="filter-field">
            <span className="filter-label">Start</span>
            <input
              className="filter-input"
              type="datetime-local"
              value={toLocalInputValue(filters.start)}
              onChange={(event) =>
                onChange({ start: fromLocalInput(event.target.value) })
              }
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">End</span>
            <input
              className="filter-input"
              type="datetime-local"
              value={toLocalInputValue(filters.end)}
              onChange={(event) =>
                onChange({ end: fromLocalInput(event.target.value) })
              }
            />
          </label>
        </div>
      </div>

      <div className="filter-section">
        <div className="panel-title">Service filters</div>
        <div className="service-toggle-row">
          {SERVICE_TYPES.map((service) => {
            const isActive = selectedServices.has(service);
            return (
              <Switch
                key={service}
                checked={isActive}
                onChange={() => {
                  const next = new Set(selectedServices);
                  if (isActive) {
                    next.delete(service);
                  } else {
                    next.add(service);
                  }
                  onChange({ serviceTypes: Array.from(next) });
                }}
                className={`service-chip service-${service.toLowerCase()} ${
                  isActive ? "active" : ""
                }`}
              >
                {service}
              </Switch>
            );
          })}
        </div>
      </div>

      <div className="filter-section">
        <div className="panel-title">Classification</div>
        <div className="filter-grid">
          <label className="filter-field">
            <span className="filter-label">Incident type</span>
            <input
              className="filter-input"
              type="text"
              placeholder="Type (e.g. medical)"
              value={filters.incidentType || ""}
              onChange={(event) =>
                onChange({ incidentType: event.target.value.trim() })
              }
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Town / jurisdiction</span>
            <input
              className="filter-input"
              type="text"
              placeholder="Town / jurisdiction"
              value={filters.jurisdiction || ""}
              onChange={(event) =>
                onChange({ jurisdiction: event.target.value.trim() })
              }
            />
          </label>
        </div>
        <div className="filter-field">
          <span className="filter-label">Status</span>
          <RadioGroup
            value={filters.status || "any"}
            onChange={(value) => onChange({ status: value })}
            className="status-chip-row"
          >
            {STATUS_OPTIONS.map((option) => (
              <RadioGroup.Option
                key={option.value}
                value={option.value}
                as="button"
                type="button"
                className={({ checked }) =>
                  `status-chip ${checked ? "active" : ""}`
                }
              >
                {option.label}
              </RadioGroup.Option>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div className="filter-section">
        <div className="panel-title">Agencies</div>
        <Listbox
          value={selectedAgencyList}
          onChange={(values) => onChange({ agencies: values })}
          multiple
        >
          <div className="listbox">
            <Listbox.Button className="filter-input listbox-button" type="button">
              {selectedAgencyList.length
                ? `${selectedAgencyList.length} selected`
                : "All agencies"}
            </Listbox.Button>
            <Listbox.Options className="listbox-options">
              {agencies.map((agency) => {
                if (!agency?.canonical_name) return null;
                const counts = [];
                if (typeof agency.call_count === "number") {
                  counts.push(`${agency.call_count} calls`);
                }
                if (
                  typeof agency.re_alert_count === "number" &&
                  agency.re_alert_count > 0
                ) {
                  counts.push(`${agency.re_alert_count} re-alerts`);
                }
                const meta = counts.length
                  ? counts.join(" \u00b7 ")
                  : agency.service_type
                  ? agency.service_type
                  : "";
                return (
                  <Listbox.Option
                    key={agency.canonical_name}
                    value={agency.canonical_name}
                    className={({ active, selected }) =>
                      `listbox-option ${active ? "active" : ""} ${
                        selected ? "selected" : ""
                      }`
                    }
                  >
                    {({ selected }) => (
                      <div className="listbox-row">
                        <span className="listbox-check">
                          {selected ? "x" : ""}
                        </span>
                        <div className="agency-info">
                          <div className="agency-name">{agency.canonical_name}</div>
                          <div className="agency-meta">{meta}</div>
                        </div>
                      </div>
                    )}
                  </Listbox.Option>
                );
              })}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>
    </div>
  );
}
