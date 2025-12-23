import { listAgencies } from "../api";
import { DEFAULT_WINDOW_HOURS } from "./config";

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toLocalInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function applyRelativeWindow(hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { start: toIso(start), end: toIso(end) };
}

export function createDefaultFilters() {
  const end = new Date();
  const start = new Date(end.getTime() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000);
  return {
    start: toIso(start),
    end: toIso(end),
    incidentType: "",
    jurisdiction: "",
    agencies: [],
    serviceTypes: [],
    status: "any",
    mapMode: "markers"
  };
}

export function serializeFilters(filters) {
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.incidentType) params.set("incident_type", filters.incidentType);
  if (filters.jurisdiction) params.set("jurisdiction", filters.jurisdiction);
  if (Array.isArray(filters.agencies) && filters.agencies.length) {
    filters.agencies.forEach((agency) => params.append("agency", agency));
  } else if (filters.agency) {
    params.set("agency", filters.agency);
  }
  if (Array.isArray(filters.serviceTypes) && filters.serviceTypes.length) {
    filters.serviceTypes.forEach((service) => params.append("service_type", service));
  } else if (filters.serviceType) {
    params.set("service_type", filters.serviceType);
  }
  if (filters.status && filters.status !== "any") params.set("status", filters.status);
  return params;
}

export function updateFilters(current, next) {
  return { ...current, ...next };
}

function createField(labelText, control) {
  const field = document.createElement("label");
  field.className = "filter-field";
  const label = document.createElement("span");
  label.className = "filter-label";
  label.textContent = labelText;
  field.appendChild(label);
  field.appendChild(control);
  return field;
}

export function renderFilterPanel({ filters, onChange }) {
  const container = document.createElement("div");
  container.className = "filter-panel";
  const selectedAgencies = new Set(
    Array.isArray(filters.agencies)
      ? filters.agencies
      : filters.agency
      ? [filters.agency]
      : []
  );
  const selectedServices = new Set(
    Array.isArray(filters.serviceTypes)
      ? filters.serviceTypes
      : filters.serviceType
      ? [filters.serviceType]
      : []
  );

  const agenciesSection = document.createElement("div");
  agenciesSection.className = "filter-section";
  const agenciesTitle = document.createElement("div");
  agenciesTitle.className = "panel-title";
  agenciesTitle.textContent = "Agencies";
  agenciesSection.appendChild(agenciesTitle);

  const agencySearch = document.createElement("input");
  agencySearch.type = "text";
  agencySearch.placeholder = "Search agencies";
  agencySearch.className = "filter-input";
  agenciesSection.appendChild(agencySearch);

  const agencyList = document.createElement("div");
  agencyList.className = "agency-list";
  agenciesSection.appendChild(agencyList);

  const startInput = document.createElement("input");
  startInput.type = "datetime-local";
  startInput.className = "filter-input";
  startInput.value = toLocalInputValue(filters.start);
  startInput.addEventListener("change", () => {
    onChange({ start: fromLocalInput(startInput.value) });
  });

  const endInput = document.createElement("input");
  endInput.type = "datetime-local";
  endInput.className = "filter-input";
  endInput.value = toLocalInputValue(filters.end);
  endInput.addEventListener("change", () => {
    onChange({ end: fromLocalInput(endInput.value) });
  });

  const incidentInput = document.createElement("input");
  incidentInput.type = "text";
  incidentInput.placeholder = "Type (e.g. medical)";
  incidentInput.className = "filter-input";
  incidentInput.value = filters.incidentType || "";
  incidentInput.addEventListener("change", () => {
    onChange({ incidentType: incidentInput.value.trim() });
  });

  const jurisdictionInput = document.createElement("input");
  jurisdictionInput.type = "text";
  jurisdictionInput.placeholder = "Town / jurisdiction";
  jurisdictionInput.className = "filter-input";
  jurisdictionInput.value = filters.jurisdiction || "";
  jurisdictionInput.addEventListener("change", () => {
    onChange({ jurisdiction: jurisdictionInput.value.trim() });
  });

  const statusRow = document.createElement("div");
  statusRow.className = "status-chip-row";
  const statusOptions = ["any", "active", "monitoring", "resolved", "processing", "failed"];
  statusOptions.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `status-chip ${filters.status === value ? "active" : ""}`;
    button.textContent = value === "any" ? "All" : value;
    button.addEventListener("click", () => {
      onChange({ status: value });
    });
    statusRow.appendChild(button);
  });

  const quickRow = document.createElement("div");
  quickRow.className = "quick-range";
  const last24 = document.createElement("button");
  last24.className = "button small";
  last24.textContent = "Last 24h";
  last24.addEventListener("click", () => {
    const next = applyRelativeWindow(24);
    startInput.value = toLocalInputValue(next.start);
    endInput.value = toLocalInputValue(next.end);
    onChange(next);
  });
  const last7d = document.createElement("button");
  last7d.className = "button small";
  last7d.textContent = "Last 7d";
  last7d.addEventListener("click", () => {
    const next = applyRelativeWindow(24 * 7);
    startInput.value = toLocalInputValue(next.start);
    endInput.value = toLocalInputValue(next.end);
    onChange(next);
  });
  const last30d = document.createElement("button");
  last30d.className = "button small";
  last30d.textContent = "Last 30d";
  last30d.addEventListener("click", () => {
    const next = applyRelativeWindow(24 * 30);
    startInput.value = toLocalInputValue(next.start);
    endInput.value = toLocalInputValue(next.end);
    onChange(next);
  });
  quickRow.appendChild(last24);
  quickRow.appendChild(last7d);
  quickRow.appendChild(last30d);

  const timeSection = document.createElement("div");
  timeSection.className = "filter-section";
  const timeTitle = document.createElement("div");
  timeTitle.className = "panel-title";
  timeTitle.textContent = "Operational window";
  timeSection.appendChild(timeTitle);
  timeSection.appendChild(quickRow);
  const timeGrid = document.createElement("div");
  timeGrid.className = "filter-grid filter-grid--two";
  timeGrid.appendChild(createField("Start", startInput));
  timeGrid.appendChild(createField("End", endInput));
  timeSection.appendChild(timeGrid);

  const classifySection = document.createElement("div");
  classifySection.className = "filter-section";
  const classifyTitle = document.createElement("div");
  classifyTitle.className = "panel-title";
  classifyTitle.textContent = "Classification";
  classifySection.appendChild(classifyTitle);
  const classifyGrid = document.createElement("div");
  classifyGrid.className = "filter-grid";
  classifyGrid.appendChild(createField("Incident type", incidentInput));
  classifyGrid.appendChild(createField("Town / jurisdiction", jurisdictionInput));
  classifySection.appendChild(classifyGrid);
  classifySection.appendChild(createField("Status", statusRow));

  const serviceSection = document.createElement("div");
  serviceSection.className = "filter-section";
  const serviceTitle = document.createElement("div");
  serviceTitle.className = "panel-title";
  serviceTitle.textContent = "Service filters";
  serviceSection.appendChild(serviceTitle);
  const serviceRow = document.createElement("div");
  serviceRow.className = "service-toggle-row";
  ["EMS", "Fire", "Special"].forEach((service) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `service-chip service-${service.toLowerCase()} ${
      selectedServices.has(service) ? "active" : ""
    }`;
    button.textContent = service;
    button.addEventListener("click", () => {
      if (selectedServices.has(service)) {
        selectedServices.delete(service);
      } else {
        selectedServices.add(service);
      }
      onChange({ serviceTypes: Array.from(selectedServices) });
    });
    serviceRow.appendChild(button);
  });
  serviceSection.appendChild(serviceRow);

  container.appendChild(timeSection);
  container.appendChild(serviceSection);
  container.appendChild(classifySection);
  container.appendChild(agenciesSection);
  const loadAgencies = async () => {
    try {
      const agencies = await listAgencies({ filters });
      agencyList.innerHTML = "";
      let results = agencies;
      const query = agencySearch.value.trim().toLowerCase();
      if (query) {
        results = agencies.filter((agency) =>
          String(agency.canonical_name || "").toLowerCase().includes(query)
        );
      }
      const unknownItem = {
        canonical_name: "Unknown",
        call_count: 0,
        re_alert_count: 0,
        service_type: "Unknown"
      };
      [unknownItem, ...results].forEach((agency) => {
        if (!agency?.canonical_name) return;
        const row = document.createElement("label");
        row.className = "agency-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedAgencies.has(agency.canonical_name);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedAgencies.add(agency.canonical_name);
          } else {
            selectedAgencies.delete(agency.canonical_name);
          }
          onChange({ agencies: Array.from(selectedAgencies) });
        });
        const info = document.createElement("div");
        info.className = "agency-info";
        const name = document.createElement("div");
        name.className = "agency-name";
        name.textContent = agency.canonical_name;
        const meta = document.createElement("div");
        meta.className = "agency-meta";
        const counts = [];
        if (typeof agency.call_count === "number") {
          counts.push(`${agency.call_count} calls`);
        }
        if (typeof agency.re_alert_count === "number" && agency.re_alert_count > 0) {
          counts.push(`${agency.re_alert_count} re-alerts`);
        }
        meta.textContent = counts.length
          ? counts.join(" · ")
          : agency.service_type
          ? agency.service_type
          : "";
        info.appendChild(name);
        info.appendChild(meta);
        row.appendChild(checkbox);
        row.appendChild(info);
        agencyList.appendChild(row);
      });
    } catch (_error) {
      // Ignore agency load failures; filters remain usable.
    }
  };
  agencySearch.addEventListener("input", () => {
    loadAgencies();
  });
  loadAgencies();
  return container;
}
