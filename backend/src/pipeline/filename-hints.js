const path = require("path");
const { findReferenceCandidatesForText } = require("../db/queries/reference_data");

function normalizeToken(value) {
  if (!value) {
    return "";
  }
  return String(value).toLowerCase();
}

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

function extractFilenameHints({ db, sourcePath, config }) {
  const raw = sourcePath
    ? path.basename(sourcePath, path.extname(sourcePath))
    : null;
  const tokens = tokenizeFilename(sourcePath);
  const referenceCandidates = db
    ? findReferenceCandidatesForText(db, {
        text: raw || "",
        limitPerType: config.referenceDataMaxCandidates
      })
    : { street: [], town: [], poi: [] };

  const townCandidates = (referenceCandidates.town || []).map(
    (item) => item.canonical_name
  );
  const normalizedTowns = new Set(townCandidates.map(normalizeToken));
  const ambiguousList = config.referenceAmbiguousAgencies || [];
  const ambiguous = new Set();
  const detectedAmbiguous = [];
  const rawNormalized = normalizeToken(raw).replace(/[^a-z0-9]+/g, " ").trim();
  ambiguousList.forEach((entry) => {
    const normalized = normalizeToken(entry).replace(/[^a-z0-9]+/g, " ").trim();
    if (!normalized) {
      return;
    }
    if (rawNormalized.includes(normalized)) {
      detectedAmbiguous.push(entry);
      normalized.split(" ").forEach((token) => {
        if (token) {
          ambiguous.add(token);
        }
      });
    }
  });

  const agencyTokens = tokens.filter((token) => {
    const normalized = normalizeToken(token);
    if (!normalized) {
      return false;
    }
    if (normalizedTowns.has(normalized)) {
      return false;
    }
    if (ambiguous.has(normalized)) {
      return false;
    }
    return true;
  });

  return {
    raw,
    tokens,
    referenceCandidates,
    townCandidates,
    agencyTokens,
    ambiguousAgencies: detectedAmbiguous
  };
}

module.exports = {
  extractFilenameHints
};
