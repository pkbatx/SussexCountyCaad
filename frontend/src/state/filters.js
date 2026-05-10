import { DEFAULT_WINDOW_HOURS } from "../config";

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

export function toLocalInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateInputStart(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function fromDateInputEnd(value) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function applyRelativeWindow(hours) {
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
  if (filters.pendingIncident) params.set("pending_incident", "true");
  if (Array.isArray(filters.agencies) && filters.agencies.length) {
    filters.agencies.forEach((agency) => params.append("agency", agency));
  } else if (filters.agency) {
    params.set("agency", filters.agency);
  }
  if (Array.isArray(filters.serviceTypes) && filters.serviceTypes.length) {
    filters.serviceTypes.forEach((service) =>
      params.append("service_type", service)
    );
  } else if (filters.serviceType) {
    params.set("service_type", filters.serviceType);
  }
  if (filters.status && filters.status !== "any") params.set("status", filters.status);
  return params;
}

export function updateFilters(current, next) {
  return { ...current, ...next };
}

// Hash query persistence — keep only filters that diverge from defaults so a
// clean state has an empty hash and shared URLs are minimal.
export function filtersToHash(filters) {
  const defaults = createDefaultFilters();
  const params = new URLSearchParams();
  if (filters.start && filters.start !== defaults.start) params.set("start", filters.start);
  if (filters.end && filters.end !== defaults.end) params.set("end", filters.end);
  (filters.agencies || []).forEach((a) => params.append("agency", a));
  (filters.serviceTypes || []).forEach((s) => params.append("service_type", s));
  if (filters.status && filters.status !== "any") params.set("status", filters.status);
  if (filters.incidentType) params.set("incident_type", filters.incidentType);
  if (filters.jurisdiction) params.set("jurisdiction", filters.jurisdiction);
  if (filters.mapMode && filters.mapMode !== defaults.mapMode) params.set("map_mode", filters.mapMode);
  return params;
}

export function filtersFromHash(params) {
  const defaults = createDefaultFilters();
  if (!params || params.toString() === "") return defaults;
  const agencies = params.getAll("agency");
  const serviceTypes = params.getAll("service_type");
  return {
    ...defaults,
    start: params.get("start") || defaults.start,
    end: params.get("end") || defaults.end,
    agencies,
    serviceTypes,
    status: params.get("status") || "any",
    incidentType: params.get("incident_type") || "",
    jurisdiction: params.get("jurisdiction") || "",
    mapMode: params.get("map_mode") || defaults.mapMode
  };
}

export function hasActiveFilters(filters) {
  const defaults = createDefaultFilters();
  if (filters.start !== defaults.start || filters.end !== defaults.end) return true;
  if (filters.agencies?.length) return true;
  if (filters.serviceTypes?.length) return true;
  if (filters.status && filters.status !== "any") return true;
  if (filters.incidentType) return true;
  if (filters.jurisdiction) return true;
  return false;
}
