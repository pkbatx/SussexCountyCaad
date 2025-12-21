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

export function createDefaultFilters() {
  const end = new Date();
  const start = new Date(end.getTime() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000);
  return {
    start: toIso(start),
    end: toIso(end),
    incidentType: "",
    jurisdiction: "",
    status: "any",
    minConfidence: 0,
    mapMode: "markers"
  };
}

export function serializeFilters(filters) {
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.incidentType) params.set("incident_type", filters.incidentType);
  if (filters.jurisdiction) params.set("jurisdiction", filters.jurisdiction);
  if (filters.status && filters.status !== "any") params.set("status", filters.status);
  if (typeof filters.minConfidence === "number") {
    params.set("min_confidence", String(filters.minConfidence));
  }
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
  const heading = document.createElement("div");
  heading.className = "panel-title";
  heading.textContent = "Filters";
  container.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "filter-grid";

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

  const statusSelect = document.createElement("select");
  statusSelect.className = "filter-select";
  ["any", "active", "resolved", "pending", "processing", "failed", "duplicate"].forEach(
    (value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      statusSelect.appendChild(option);
    }
  );
  statusSelect.value = filters.status || "any";
  statusSelect.addEventListener("change", () => {
    onChange({ status: statusSelect.value });
  });

  const confidenceInput = document.createElement("input");
  confidenceInput.type = "number";
  confidenceInput.min = "0";
  confidenceInput.max = "1";
  confidenceInput.step = "0.05";
  confidenceInput.className = "filter-input";
  confidenceInput.value = String(filters.minConfidence ?? 0);
  confidenceInput.addEventListener("change", () => {
    const parsed = Number(confidenceInput.value);
    onChange({ minConfidence: Number.isFinite(parsed) ? parsed : 0 });
  });

  grid.appendChild(createField("Start", startInput));
  grid.appendChild(createField("End", endInput));
  grid.appendChild(createField("Incident type", incidentInput));
  grid.appendChild(createField("Jurisdiction", jurisdictionInput));
  grid.appendChild(createField("Status", statusSelect));
  grid.appendChild(createField("Min confidence", confidenceInput));

  container.appendChild(grid);
  return container;
}
