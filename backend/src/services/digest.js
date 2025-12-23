const {
  getLatestDigestSummary,
  createDigestSummary,
  countCallsInWindow,
  listTownServiceCounts
} = require("../db/queries/digests");
const { summarizeDigest } = require("../ai/openai");

const WINDOW_DEFINITIONS = [
  { label: "24h", hours: 24, maxLines: 8, detailLevel: "detailed" },
  { label: "7d", hours: 24 * 7, maxLines: 5, detailLevel: "summary" },
  { label: "30d", hours: 24 * 30, maxLines: 4, detailLevel: "overview" }
];
const MAX_AGENCIES_PER_TOWN = 3;

function toWindowRange(hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

function shouldRefresh({ latest, callCount, refreshHours, refreshCallThreshold }) {
  if (!latest) return true;
  const lastCreated = new Date(latest.created_at || latest.updated_at || 0);
  const ageHours = (Date.now() - lastCreated.getTime()) / (60 * 60 * 1000);
  if (Number.isFinite(refreshHours) && ageHours >= refreshHours) {
    return true;
  }
  if (
    Number.isFinite(refreshCallThreshold) &&
    callCount - (latest.call_count_window || 0) >= refreshCallThreshold
  ) {
    return true;
  }
  return false;
}

function formatTownCounts(rows, maxLines) {
  const townMap = new Map();
  rows.forEach((row) => {
    if (!row?.town) return;
    const town = String(row.town).trim();
    if (!town) return;
    const service = row.service_type || "Unspecified";
    const entry = townMap.get(town) || {
      town,
      total: 0,
      counts: {},
      agencyCounts: {}
    };
    entry.counts[service] = (entry.counts[service] || 0) + (row.count || 0);
    entry.total += row.count || 0;
    const agency = row.agency_name ? String(row.agency_name).trim() : "";
    if (agency) {
      entry.agencyCounts[agency] = (entry.agencyCounts[agency] || 0) + (row.count || 0);
    }
    townMap.set(town, entry);
  });

  return Array.from(townMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, maxLines)
    .map((entry) => {
      const agency_breakdown = Object.entries(entry.agencyCounts || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_AGENCIES_PER_TOWN)
        .map(([agency, count]) => ({ agency, count }));
      return {
        town: entry.town,
        total: entry.total,
        counts: entry.counts,
        agency_breakdown
      };
    });
}

function buildFallbackLines(townEntries) {
  if (!townEntries.length) {
    return [];
  }
  return townEntries.map((entry) => {
    const parts = Object.entries(entry.counts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${key} ${value}`);
    const agencies = (entry.agency_breakdown || []).map(
      ({ agency, count }) => `${agency} ${count}`
    );
    const agencySuffix = agencies.length ? ` (${agencies.join(", ")})` : "";
    return parts.length ? `${entry.town} — ${parts.join(", ")}${agencySuffix}` : entry.town;
  });
}

async function buildDigest({ db, config, windowLabel, windowStart, windowEnd, maxLines, detailLevel, filters }) {
  const callCount = countCallsInWindow(db, { windowStart, windowEnd, filters });
  const latest = getLatestDigestSummary(db, { windowLabel });
  const refreshHours = config.digestRefreshHours || 2;
  const refreshCallThreshold = config.digestRefreshCallThreshold || 5;

  if (!shouldRefresh({ latest, callCount, refreshHours, refreshCallThreshold })) {
    return latest;
  }

  const rows = listTownServiceCounts(db, { windowStart, windowEnd, filters });
  const townEntries = formatTownCounts(rows, maxLines);
  const fallbackLines = buildFallbackLines(townEntries);

  if (!config.openaiApiKey || townEntries.length === 0) {
    return createDigestSummary(db, {
      windowLabel,
      windowStart,
      windowEnd,
      callCountWindow: callCount,
      summaryText: fallbackLines.join("\n"),
      summaryJson: JSON.stringify({ lines: fallbackLines })
    });
  }

  const prompt = JSON.stringify({
    window_label: windowLabel,
    detail_level: detailLevel,
    max_lines: maxLines,
    towns: townEntries
  });

  let summaryLines = fallbackLines;
  try {
    const result = await summarizeDigest({ config, prompt });
    const payload = JSON.parse(result.content || "{}");
    if (Array.isArray(payload.lines)) {
      summaryLines = payload.lines.filter((line) => typeof line === "string");
    }
  } catch (_error) {
    summaryLines = fallbackLines;
  }
  summaryLines = summaryLines.slice(0, maxLines);

  return createDigestSummary(db, {
    windowLabel,
    windowStart,
    windowEnd,
    callCountWindow: callCount,
    summaryText: summaryLines.join("\n"),
    summaryJson: JSON.stringify({ lines: summaryLines })
  });
}

async function getDigestSummaries(db, config, filters = {}) {
  const sanitizedFilters = { ...filters };
  delete sanitizedFilters.start;
  delete sanitizedFilters.end;

  const results = [];
  for (const definition of WINDOW_DEFINITIONS) {
    const range = toWindowRange(definition.hours);
    const digest = await buildDigest({
      db,
      config,
      windowLabel: definition.label,
      windowStart: range.windowStart,
      windowEnd: range.windowEnd,
      maxLines: definition.maxLines,
      detailLevel: definition.detailLevel,
      filters: sanitizedFilters
    });
    if (digest) {
      results.push(digest);
    }
  }
  return results;
}

module.exports = {
  getDigestSummaries
};
