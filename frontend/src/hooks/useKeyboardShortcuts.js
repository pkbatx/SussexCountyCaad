import { useEffect } from "react";

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable === true;
}

// Subscribes a single document keydown listener. Handlers fire when their key
// is pressed AND the active focus is not inside a text input. Unspecified
// handlers are ignored.
export function useKeyboardShortcuts({ onNext, onPrev, onSelect, onBack, onHelp, onSearch }) {
  useEffect(() => {
    const handler = (event) => {
      if (isTypingTarget(event.target)) return;
      switch (event.key) {
        case "j": if (onNext) { event.preventDefault(); onNext(); } break;
        case "k": if (onPrev) { event.preventDefault(); onPrev(); } break;
        case "Enter": if (onSelect) { event.preventDefault(); onSelect(); } break;
        case "Escape": if (onBack) { event.preventDefault(); onBack(); } break;
        case "/": if (onSearch) { event.preventDefault(); onSearch(); } break;
        case "?": if (onHelp) { event.preventDefault(); onHelp(); } break;
        default: break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext, onPrev, onSelect, onBack, onHelp, onSearch]);
}
