export function formatClock24(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDateTime24(date, { includeSeconds = true } = {}) {
  if (!date) return "Unknown";
  const pad = (value) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}${includeSeconds ? `:${seconds}` : ""}`;
}

export function parseFilenameTimestamp(sourcePath) {
  if (!sourcePath) return null;
  const base = String(sourcePath).split(/[\\/]/).pop();
  if (!base) return null;
  const name = base.replace(/\.[^.]+$/, "");
  const pattern = /(20\\d{2})[_-](\\d{2})[_-](\\d{2})[_-](\\d{2})[_-](\\d{2})[_-](\\d{2})/g;
  let match = null;
  let lastMatch = null;
  while ((match = pattern.exec(name)) !== null) {
    lastMatch = match;
  }
  if (!lastMatch) return null;
  const [, year, month, day, hour, minute, second] = lastMatch;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  if (Number.isNaN(date.getTime())) return null;
  return date;
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
  const reason = signal.reason_label || "";
  return {
    label: `${tier} confidence`,
    detail: reason
  };
}

export function formatTimeLabel(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}
