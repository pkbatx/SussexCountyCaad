import React from "react";

const SHORTCUTS = [
  ["j / k", "Next / previous in list"],
  ["Enter", "Open selected item"],
  ["Esc", "Back / close"],
  ["/", "Focus search"],
  ["?", "Toggle this help"]
];

export function ShortcutsCheatsheet({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="cheatsheet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cheatsheet" onClick={(event) => event.stopPropagation()}>
        <div className="cheatsheet-title">KEYBOARD</div>
        <dl className="cheatsheet-list">
          {SHORTCUTS.map(([key, desc]) => (
            <React.Fragment key={key}>
              <dt>{key}</dt>
              <dd>{desc}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}
