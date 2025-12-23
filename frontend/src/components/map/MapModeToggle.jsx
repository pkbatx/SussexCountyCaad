import React from "react";
import { RadioGroup } from "@headlessui/react";

const OPTIONS = [
  { value: "markers", label: "Markers" },
  { value: "heatmap", label: "Heatmap" }
];

export function MapModeToggle({ value, onChange }) {
  return (
    <RadioGroup value={value} onChange={onChange} className="map-controls">
      {OPTIONS.map((option) => (
        <RadioGroup.Option
          key={option.value}
          value={option.value}
          as="button"
          type="button"
          className={({ checked }) => `button small ${checked ? "active" : ""}`}
        >
          {option.label}
        </RadioGroup.Option>
      ))}
    </RadioGroup>
  );
}
