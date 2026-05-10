// FilterPanel is gone — its dimensions (service types, status, agencies) are
// now the inline popovers in this bar. The free-text incidentType and
// jurisdiction inputs the old FilterPanel exposed have no place in a
// dropdown UI; their state keys are preserved but no surface writes them.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyRelativeWindow, fromDateInputEnd, fromDateInputStart, toDateInputValue } from "../../state/filters";
import { fetchSummaryMetrics, listAgencies } from "../../api";
import { SERVICE_TYPES } from "../../config";

const TIME_PRESETS = [
  { key: "24h", label: "Last 24h", hours: 24 },
  { key: "7d",  label: "Last 7d",  hours: 24 * 7 },
  { key: "30d", label: "Last 30d", hours: 24 * 30 }
];

const STATUS_OPTIONS = [
  { value: "any",        label: "All" },
  { value: "active",     label: "Active" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved",   label: "Resolved" },
  { value: "processing", label: "Processing" },
  { value: "failed",     label: "Failed" }
];

function activeTimeKey(filters) {
  if (!filters.start || !filters.end) return null;
  const startMs = new Date(filters.start).getTime();
  const endMs = new Date(filters.end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const hours = (endMs - startMs) / 3600000;
  return TIME_PRESETS.find((p) => Math.abs(p.hours - hours) / p.hours < 0.01)?.key || "custom";
}

function timeValueLabel(filters) {
  const key = activeTimeKey(filters);
  if (key && key !== "custom") return TIME_PRESETS.find((p) => p.key === key).label;
  return "Custom";
}

function FilterTrigger({ label, value, isDefault, opened, triggerRef, onClick }) {
  return (
    <button
      ref={triggerRef}
      type="button"
      className={`filter-trigger ${opened ? "is-open" : ""}`}
      onClick={onClick}
    >
      <span className="filter-trigger-label">{label}</span>
      <span className={`filter-trigger-value ${isDefault ? "is-default" : ""}`}>{value}</span>
      <span className="filter-trigger-chevron">▾</span>
    </button>
  );
}

function FilterPopover({ open, onClose, anchorRef, children }) {
  const popRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (popRef.current?.contains(event.target)) return;
      if (anchorRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return <div ref={popRef} className="filter-popover" role="menu">{children}</div>;
}

function OptionRow({ checked, multi, label, onClick }) {
  return (
    <button
      type="button"
      className={`filter-option ${checked ? "is-active" : ""}`}
      onClick={onClick}
      role="menuitemradio"
      aria-checked={checked}
    >
      {multi ? <span className="filter-option-check">{checked ? "✓" : ""}</span> : null}
      <span>{label}</span>
    </button>
  );
}

function TimePopover({ filters, onChange, onClose }) {
  const active = activeTimeKey(filters);
  return (
    <>
      {TIME_PRESETS.map((preset) => (
        <OptionRow
          key={preset.key}
          checked={active === preset.key}
          label={preset.label}
          onClick={() => { onChange(applyRelativeWindow(preset.hours)); onClose(); }}
        />
      ))}
      <div className="filter-popover-divider" />
      <div className="filter-popover-section">
        <label className="filter-popover-field">
          <span>FROM</span>
          <input
            type="date"
            value={toDateInputValue(filters.start)}
            onChange={(event) => onChange({ start: fromDateInputStart(event.target.value) })}
          />
        </label>
        <label className="filter-popover-field">
          <span>TO</span>
          <input
            type="date"
            value={toDateInputValue(filters.end)}
            onChange={(event) => onChange({ end: fromDateInputEnd(event.target.value) })}
          />
        </label>
      </div>
    </>
  );
}

function TypePopover({ filters, onChange }) {
  const selected = new Set(filters.serviceTypes || []);
  const toggle = (value) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value); else next.add(value);
    onChange({ serviceTypes: Array.from(next) });
  };
  return (
    <>
      {SERVICE_TYPES.map((service) => (
        <OptionRow
          key={service}
          multi
          checked={selected.has(service)}
          label={service}
          onClick={() => toggle(service)}
        />
      ))}
      {selected.size > 0 ? (
        <button type="button" className="filter-clear-link" onClick={() => onChange({ serviceTypes: [] })}>
          Clear all
        </button>
      ) : null}
    </>
  );
}

function AgencyPopover({ filters, onChange }) {
  const [agencies, setAgencies] = useState([]);
  useEffect(() => {
    let active = true;
    listAgencies({ filters })
      .then((results) => { if (active) setAgencies(results || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [filters]);

  const selected = new Set(filters.agencies || []);
  const toggle = (name) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    onChange({ agencies: Array.from(next) });
  };
  return (
    <>
      {agencies.length === 0 ? (
        <div className="filter-popover-empty">— no agencies in window —</div>
      ) : (
        agencies.map((agency) => (
          <OptionRow
            key={agency.canonical_name}
            multi
            checked={selected.has(agency.canonical_name)}
            label={agency.canonical_name}
            onClick={() => toggle(agency.canonical_name)}
          />
        ))
      )}
      {selected.size > 0 ? (
        <button type="button" className="filter-clear-link" onClick={() => onChange({ agencies: [] })}>
          Clear all
        </button>
      ) : null}
    </>
  );
}

function StatusPopover({ filters, onChange, onClose }) {
  return STATUS_OPTIONS.map((option) => (
    <OptionRow
      key={option.value}
      checked={(filters.status || "any") === option.value}
      label={option.label}
      onClick={() => { onChange({ status: option.value }); onClose(); }}
    />
  ));
}

export function TopFilterBar({ filters, onChange, refreshToken }) {
  const [openKey, setOpenKey] = useState(null);
  const [count, setCount] = useState(null);
  const triggerRefs = { time: useRef(null), type: useRef(null), agency: useRef(null), status: useRef(null) };

  useEffect(() => {
    let active = true;
    fetchSummaryMetrics({ filters })
      .then((next) => { if (active) setCount(next?.incident_count ?? null); })
      .catch(() => { if (active) setCount(null); });
    return () => { active = false; };
  }, [filters, refreshToken]);

  const close = useCallback(() => setOpenKey(null), []);
  const toggle = (key) => setOpenKey((prev) => (prev === key ? null : key));

  const timeIsDefault = activeTimeKey(filters) === "24h";
  const typeIsDefault = (filters.serviceTypes || []).length === 0;
  const agencyIsDefault = (filters.agencies || []).length === 0;
  const statusIsDefault = !filters.status || filters.status === "any";

  const typeValue = filters.serviceTypes?.length
    ? (filters.serviceTypes.length === 1 ? filters.serviceTypes[0] : `${filters.serviceTypes.length} selected`)
    : "All";
  const agencyValue = filters.agencies?.length
    ? (filters.agencies.length === 1 ? filters.agencies[0] : `${filters.agencies.length} selected`)
    : "All";
  const statusValue = STATUS_OPTIONS.find((s) => s.value === (filters.status || "any"))?.label || "All";

  const countDisplay = useMemo(() => {
    if (count == null) return "—";
    return `${count} incident${count === 1 ? "" : "s"}`;
  }, [count]);

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <FilterTrigger
          label="TIME"
          value={timeValueLabel(filters)}
          isDefault={timeIsDefault}
          opened={openKey === "time"}
          triggerRef={triggerRefs.time}
          onClick={() => toggle("time")}
        />
        <FilterPopover open={openKey === "time"} onClose={close} anchorRef={triggerRefs.time}>
          <TimePopover filters={filters} onChange={onChange} onClose={close} />
        </FilterPopover>
      </div>

      <div className="filter-group">
        <FilterTrigger
          label="TYPE"
          value={typeValue}
          isDefault={typeIsDefault}
          opened={openKey === "type"}
          triggerRef={triggerRefs.type}
          onClick={() => toggle("type")}
        />
        <FilterPopover open={openKey === "type"} onClose={close} anchorRef={triggerRefs.type}>
          <TypePopover filters={filters} onChange={onChange} />
        </FilterPopover>
      </div>

      <div className="filter-group">
        <FilterTrigger
          label="AGENCY"
          value={agencyValue}
          isDefault={agencyIsDefault}
          opened={openKey === "agency"}
          triggerRef={triggerRefs.agency}
          onClick={() => toggle("agency")}
        />
        <FilterPopover open={openKey === "agency"} onClose={close} anchorRef={triggerRefs.agency}>
          <AgencyPopover filters={filters} onChange={onChange} />
        </FilterPopover>
      </div>

      <div className="filter-group">
        <FilterTrigger
          label="STATUS"
          value={statusValue}
          isDefault={statusIsDefault}
          opened={openKey === "status"}
          triggerRef={triggerRefs.status}
          onClick={() => toggle("status")}
        />
        <FilterPopover open={openKey === "status"} onClose={close} anchorRef={triggerRefs.status}>
          <StatusPopover filters={filters} onChange={onChange} onClose={close} />
        </FilterPopover>
      </div>

      <span className="filter-count">{countDisplay}</span>
    </div>
  );
}
