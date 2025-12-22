const path = require("path");
const {
  normalizeKey,
  upsertAgency,
  cleanupAgencies,
  setCallAgency
} = require("../db/queries/agencies");

const NOISE_TOKENS = new Set([
  "duty",
  "gen",
  "siren",
  "alert"
]);

const TOKEN_CANONICAL_MAP = new Map([
  ["twp", "Twp"],
  ["township", "Twp"],
  ["boro", "Boro"],
  ["borough", "Boro"],
  ["nj", "NJ"]
]);

const SERVICE_TOKEN_MAP = new Map([
  ["fm", "FM"],
  ["firemarshal", "FM"],
  ["fire-marshall", "FM"],
  ["firemarshall", "FM"],
  ["marshal", "FM"],
  ["fire", "FD"],
  ["fd", "FD"],
  ["firedept", "FD"],
  ["firedepartment", "FD"],
  ["ems", "EMS"],
  ["rescue", "EMS"]
]);

const KNOWN_AGENCIES = [
  "Alamuchy-Green EMS",
  "Andover Boro FD",
  "Andover Twp FD",
  "Andover Twp / Andover Boro FD",
  "Branchville FD",
  "Blue Ridge Rescue EMS",
  "Byram FD",
  "Frankford FD",
  "Franklin EMS",
  "Franklin FD",
  "Fredon EMS",
  "Fredon FD",
  "Glenwood-Pochuck EMS",
  "Green FD",
  "Hamburg FD",
  "Hampton EMS",
  "Hardyston FD",
  "Highland Lakes FD",
  "Hopatcong EMS",
  "Hopatcong FD",
  "Jefferson FD",
  "Lakeland EMS",
  "Lafayette FD",
  "McAfee FD",
  "Montague FD",
  "Newton EMS",
  "Newton FD",
  "NJ Forest Fire Service FD",
  "Ogdensburg EMS",
  "Pochuck FD",
  "Sandyston FD",
  "Sparta EMS",
  "Sparta FD",
  "Stanhope EMS",
  "Stanhope FD",
  "Stanhope-Netcong EMS",
  "Stillwater EMS",
  "Stillwater FD",
  "Sussex Boro EMS",
  "Sussex Boro FD",
  "Vernon FD",
  "Vernon EMS",
  "Wantage FD",
  "Wantage EMS",
  "Sussex County FM"
];

const KNOWN_AGENCY_KEYS = new Map(
  KNOWN_AGENCIES.map((name) => [normalizeKey(name).replace(/\s+/g, ""), name])
);

const AGENCY_TOWN_COVERAGE = {
  "Alamuchy-Green EMS": ["Green", "Andover"],
  "Blue Ridge Rescue EMS": ["Wantage", "Montague"],
  "Franklin EMS": ["Franklin", "Hamburg", "Hardyston"],
  "Fredon EMS": ["Fredon"],
  "Glenwood-Pochuck EMS": ["Vernon"],
  "Hampton EMS": ["Hampton", "Lafayette"],
  "Hopatcong EMS": ["Hopatcong"],
  "Lakeland EMS": ["Hopatcong"],
  "Newton EMS": ["Newton"],
  "Ogdensburg EMS": ["Ogdensburg", "Franklin"],
  "Sparta EMS": ["Sparta"],
  "Stanhope EMS": ["Stanhope"],
  "Stanhope-Netcong EMS": ["Stanhope"],
  "Stillwater EMS": ["Stillwater"],
  "Sussex Boro EMS": ["Sussex", "Wantage"],
  "Vernon EMS": ["Vernon"],
  "Wantage EMS": ["Wantage"],
  "Andover Boro FD": ["Andover", "Green"],
  "Andover Twp FD": ["Andover", "Green", "Newton"],
  "Andover Twp / Andover Boro FD": ["Andover", "Green"],
  "Branchville FD": ["Branchville", "Frankford"],
  "Byram FD": ["Byram", "Sparta", "Hopatcong"],
  "Frankford FD": ["Frankford", "Branchville"],
  "Franklin FD": ["Franklin", "Hamburg", "Hardyston"],
  "Green FD": ["Green", "Andover", "Fredon"],
  "Hamburg FD": ["Hamburg", "Hardyston", "Franklin"],
  "Hardyston FD": ["Hardyston", "Hamburg", "Franklin"],
  "Highland Lakes FD": ["Vernon"],
  "Hopatcong FD": ["Hopatcong"],
  "Jefferson FD": ["Hopatcong", "Sparta"],
  "Lafayette FD": ["Lafayette"],
  "McAfee FD": ["Vernon"],
  "Montague FD": ["Montague"],
  "Newton FD": ["Newton"],
  "Pochuck FD": ["Vernon"],
  "Sandyston FD": ["Sandyston"],
  "Sparta FD": ["Sparta"],
  "Stanhope FD": ["Stanhope"],
  "Stillwater FD": ["Stillwater"],
  "Sussex Boro FD": ["Sussex", "Wantage"],
  "Vernon FD": ["Vernon"],
  "Wantage FD": ["Wantage"]
};

function tokenizeFilename(sourcePath) {
  if (!sourcePath) {
    return [];
  }
  const base = path.basename(sourcePath, path.extname(sourcePath));
  return base
    .split(/[^a-zA-Z0-9-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && /[a-zA-Z]/.test(token));
}

function normalizeToken(token) {
  return String(token || "").toLowerCase();
}

function canonicalizeToken(token) {
  const normalized = normalizeToken(token);
  if (TOKEN_CANONICAL_MAP.has(normalized)) {
    return TOKEN_CANONICAL_MAP.get(normalized);
  }
  return toTitleCase(token);
}

function toTitleCase(word) {
  if (!word) {
    return "";
  }
  return word
    .split("-")
    .map((part) =>
      part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""
    )
    .join("-");
}

function detectServiceType(tokens) {
  const normalized = tokens.map(normalizeToken);
  const tokenSet = new Set(normalized);
  if (tokenSet.has("fm") || (tokenSet.has("fire") && tokenSet.has("marshal"))) {
    return "FM";
  }
  if (normalized.some((token) => SERVICE_TOKEN_MAP.get(token) === "FD")) {
    return "FD";
  }
  if (normalized.some((token) => SERVICE_TOKEN_MAP.get(token) === "EMS")) {
    return "EMS";
  }
  return null;
}

function stripNoise(tokens) {
  return tokens.filter((token) => !NOISE_TOKENS.has(normalizeToken(token)));
}

function stripServiceTokens(tokens) {
  return tokens.filter((token) => {
    const normalized = normalizeToken(token);
    if (normalized === "rescue") {
      return true;
    }
    return !SERVICE_TOKEN_MAP.has(normalized);
  });
}

function buildCanonicalName(tokens, serviceType) {
  const nameParts = tokens.map((token) => {
    const normalized = normalizeToken(token);
    if (normalized === "fd" || normalized === "ems" || normalized === "fm") {
      return normalized.toUpperCase();
    }
    return canonicalizeToken(token);
  });
  const base = nameParts.join(" ").trim();
  if (!base) {
    return null;
  }
  if (!serviceType) {
    return base;
  }
  if (base.toUpperCase().endsWith(serviceType)) {
    return base;
  }
  return `${base} ${serviceType}`.trim();
}

function matchKnownAgency(candidate) {
  if (!candidate) {
    return null;
  }
  const key = normalizeKey(candidate).replace(/\s+/g, "");
  return KNOWN_AGENCY_KEYS.get(key) || null;
}

function getAgencyCoverageTowns(agencyName) {
  if (!agencyName) {
    return [];
  }
  return AGENCY_TOWN_COVERAGE[agencyName] || [];
}

function normalizeAgency({ sourcePath, filenameHints } = {}) {
  const rawTokens =
    filenameHints?.tokens?.length && Array.isArray(filenameHints.tokens)
      ? filenameHints.tokens
      : tokenizeFilename(sourcePath);

  const aliases = Array.from(new Set(rawTokens.map((token) => token.trim()))).filter(
    Boolean
  );
  const cleaned = stripNoise(rawTokens);
  const serviceType = detectServiceType(cleaned);
  const nameTokens = stripServiceTokens(cleaned);
  const candidate = buildCanonicalName(nameTokens, serviceType);
  const canonicalName = matchKnownAgency(candidate) || candidate;

  if (!canonicalName) {
    return { agency: null, serviceType: null, aliases };
  }

  return { agency: canonicalName, serviceType, aliases };
}

function resolveAgency({ db, callId, sourcePath, filenameHints, config } = {}) {
  const normalized = normalizeAgency({ sourcePath, filenameHints });
  if (!normalized.agency) {
    setCallAgency(db, { callId, agencyId: null, agencyName: null, serviceType: null });
    return { agency: null, agencyId: null, serviceType: null };
  }

  const entry = upsertAgency(db, {
    canonicalName: normalized.agency,
    serviceType: normalized.serviceType,
    aliases: normalized.aliases
  });

  if (config?.agencyRegistryRetentionDays) {
    cleanupAgencies(db, { retentionDays: config.agencyRegistryRetentionDays });
  }

  setCallAgency(db, {
    callId,
    agencyId: entry?.agency_id || null,
    agencyName: entry?.canonical_name || normalized.agency,
    serviceType: entry?.service_type || normalized.serviceType
  });

  return {
    agency: entry?.canonical_name || normalized.agency,
    agencyId: entry?.agency_id || null,
    serviceType: entry?.service_type || normalized.serviceType
  };
}

module.exports = {
  normalizeAgency,
  getAgencyCoverageTowns,
  resolveAgency
};
