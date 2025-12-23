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
