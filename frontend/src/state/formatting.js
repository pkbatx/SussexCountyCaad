export function formatClock24(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatRelativeTime(value) {
  if (!value) return { text: "Unknown time", title: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { text: value, title: "" };
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  let text = "Just now";
  if (diffSeconds >= 60) {
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      text = `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        text = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        text = `${diffDays}d ago`;
      }
    }
  }
  return { text, title: date.toLocaleString() };
}

export function formatConfidenceSignal(signal) {
  if (!signal) {
    return { label: "Confidence unknown", detail: "" };
  }
  const tier = signal.tier || "Unknown";
  const reviewStatus = signal.review_status || "no_review";
  const reviewLabel =
    reviewStatus === "confirmed"
      ? "Confirmed"
      : reviewStatus === "needs_review"
      ? "Needs review"
      : "Unreviewed";
  const reason = signal.reason_label || "";
  return {
    label: `${tier} confidence`,
    detail: reason ? `${reviewLabel} · ${reason}` : reviewLabel
  };
}

export function formatTimeLabel(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}
