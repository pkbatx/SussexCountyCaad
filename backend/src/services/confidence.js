function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tierForConfidence(confidence) {
  if (confidence === null || confidence === undefined) return "Unknown";
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.65) return "Medium";
  return "Low";
}

function normalizeReviewStatus(requiresReview) {
  if (requiresReview === true) return "needs_review";
  if (requiresReview === false) return "no_review";
  return "no_review";
}

function buildConfidenceSignal({ confidence, requiresReview, reasonLabel } = {}) {
  const value = toNumber(confidence);
  return {
    tier: tierForConfidence(value),
    review_status: normalizeReviewStatus(requiresReview),
    reason_label: reasonLabel || ""
  };
}

function summarizeLinkReason(linkReason) {
  if (!linkReason) return "Matched to incident";
  const lower = String(linkReason).toLowerCase();
  if (lower.includes("new_incident")) return "New incident";
  if (lower.includes("join_incident")) return "Incident match";
  if (lower.includes("address")) return "Address match";
  if (lower.includes("incident id")) return "Incident ID match";
  if (lower.includes("text")) return "Transcript similarity";
  if (lower.includes("time")) return "Time proximity";
  if (lower.includes("unit")) return "Unit overlap";
  if (lower.includes("jurisdiction") || lower.includes("town")) return "Jurisdiction match";
  return "Matched to incident";
}

module.exports = {
  buildConfidenceSignal,
  summarizeLinkReason,
  tierForConfidence,
  normalizeReviewStatus
};
