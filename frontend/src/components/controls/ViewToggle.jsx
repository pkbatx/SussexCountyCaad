import React from "react";
import { RadioGroup } from "@headlessui/react";

const OPTIONS = [
  { value: "incidents", label: "Incidents" },
  { value: "calls", label: "Calls" }
];

export function ViewToggle({ value, onChange }) {
  return (
    <RadioGroup value={value} onChange={onChange} className="view-toggle">
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
