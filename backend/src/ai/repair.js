function attemptRepair(raw) {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    // continue
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const slice = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (_error) {
    return null;
  }
}

module.exports = {
  attemptRepair
};
