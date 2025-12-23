const {
  getLatestDigestSummary,
  createDigestSummary,
  countCallsInWindow,
  listTownServiceCounts,
  listDigestTranscripts
} = require("../db/queries/digests");
const { summarizeDigest, summarizeTranscriptDigest } = require("../ai/openai");

const WINDOW_DEFINITIONS = [
  { label: "24h", hours: 24, maxLines: 8, detailLevel: "detailed" },
  { label: "7d", hours: 24 * 7, maxLines: 5, detailLevel: "summary" },
  { label: "30d", hours: 24 * 30, maxLines: 4, detailLevel: "overview" }
];
const MAX_AGENCIES_PER_TOWN = 3;
const MAX_TRANSCRIPT_CHARS = 480;

function clampText(text, maxChars) {
  if (!text) return "";
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trim()}…`;
}

function buildTranscriptInputs(rows, maxItems) {
  return rows
    .filter((row) => row && row.transcript)
    .slice(0, maxItems)
    .map((row) => ({
      call_id: row.call_id,
      timestamp: row.first_seen_at,
      agency: row.agency_name || "Unknown",
      service_type: row.service_type || null,
      incident_type: row.incident_type || null,
      town: row.town || null,
      address: row.address || null,
      cross_street: row.cross_street || null,
      poi: row.poi || null,
      transcript: clampText(row.transcript, MAX_TRANSCRIPT_CHARS)
    }));
}

function buildTranscriptFallbackLines(transcripts, maxLines) {
  if (!transcripts.length) {
    return [];
  }
  return transcripts.slice(0, maxLines).map((entry) => {
    const label = entry.agency || "Unknown";
    const detailParts = [entry.incident_type, entry.address || entry.town]
      .filter(Boolean)
      .join(" · ");
    const snippet = entry.transcript || "";
    if (detailParts) {
      return `${label} — ${detailParts}`;
    }
    return `${label} — ${snippet}`.trim();
  });
}

function toWindowRange(hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

function shouldRefresh({ latest, callCount, refreshHours, refreshCallThreshold }) {
  if (!latest) return true;
  if (!latest.summary_text || latest.summary_text.trim() === "") {
    return true;
  }
  if (latest.summary_json) {
    try {
      const payload = JSON.parse(latest.summary_json);
      if (Array.isArray(payload.lines) && payload.lines.length === 0) {
        return true;
      }
    } catch (_error) {
      return true;
    }
  }
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
  const transcriptLimit =
    detailLevel === "detailed" ? 36 : detailLevel === "summary" ? 24 : 16;
  const transcriptRows = listDigestTranscripts(db, {
    windowStart,
    windowEnd,
    filters,
    limit: transcriptLimit
  });
  const transcriptInputs = buildTranscriptInputs(
    transcriptRows,
    transcriptLimit
  );

  if (!config.openaiApiKey || (townEntries.length === 0 && transcriptInputs.length === 0)) {
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
    transcripts: transcriptInputs,
    fallback_counts: townEntries
  });

  let summaryLines = transcriptInputs.length
    ? buildTranscriptFallbackLines(transcriptInputs, maxLines)
    : fallbackLines;
  try {
    const result = transcriptInputs.length
      ? await summarizeTranscriptDigest({ config, prompt })
      : await summarizeDigest({ config, prompt });
    const payload = JSON.parse(result.content || "{}");
    if (Array.isArray(payload.lines)) {
      summaryLines = payload.lines.filter((line) => typeof line === "string");
    }
  } catch (_error) {
    summaryLines = transcriptInputs.length
      ? buildTranscriptFallbackLines(transcriptInputs, maxLines)
      : fallbackLines;
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
