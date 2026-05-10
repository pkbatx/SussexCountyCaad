import React from "react";

const OPTIONS = [
  { value: "markers", label: "Markers" },
  { value: "heatmap", label: "Heatmap" }
];

export function MapModeToggle({ value, onChange }) {
  return (
    <div className="map-mode-toggle" role="radiogroup">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`map-mode-btn ${value === option.value ? "is-active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
