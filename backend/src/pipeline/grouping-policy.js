const DEFAULT_THRESHOLD = 0.7;
const LOCATION_SIGNAL_TYPES = new Set([
  "address_match",
  "cross_street_match",
  "jurisdiction_match"
]);

function hasStrongIncidentIdSignal(payload) {
  if (!Array.isArray(payload.signals)) {
    return false;
  }
  return payload.signals.some((signal) => {
    if (signal.type !== "incident_id_match") {
      return false;
    }
    if (typeof signal.weight !== "number" || signal.weight < 0.7) {
      return false;
    }
    return Array.isArray(signal.evidence) && signal.evidence.length > 0;
  });
}

function normalizeDecision(payload, threshold, confidencePenalty) {
  const adjustedConfidence =
    typeof payload.confidence === "number"
      ? Math.max(0, payload.confidence - (confidencePenalty || 0))
      : null;
  const strongIncidentId = hasStrongIncidentIdSignal(payload);
  const hasLocationSignal = Array.isArray(payload.signals)
    ? payload.signals.some((signal) => LOCATION_SIGNAL_TYPES.has(signal.type))
    : false;
  if (typeof adjustedConfidence !== "number") {
    return { decision: "new_incident", requiresReview: true, reason: "no_confidence" };
  }
  if (adjustedConfidence < threshold && !strongIncidentId) {
    return { decision: "new_incident", requiresReview: true, reason: "low_confidence" };
  }
  if (
    payload.decision === "join_incident" &&
    !hasLocationSignal &&
    !strongIncidentId
  ) {
    return {
      decision: "new_incident",
      requiresReview: true,
      reason: "missing_location_signal"
    };
  }
  return {
    decision: payload.decision,
    requiresReview: payload.requires_review,
    reason: strongIncidentId ? "incident_id_signal" : "model_decision"
  };
}

function selectIncident({
  payload,
  existingIncidents,
  threshold = DEFAULT_THRESHOLD,
  confidencePenalty = 0
}) {
  const normalized = normalizeDecision(payload, threshold, confidencePenalty);

  if (normalized.decision === "join_incident") {
    const matchId = payload.matched_existing_incident_id;
    const match = existingIncidents.find(
      (incident) => incident.incident_id === matchId
    );
    if (match) {
      return {
        incidentId: match.incident_id,
        requiresReview: normalized.requiresReview,
        reason: "matched_existing_incident"
      };
    }
  }

  return {
    incidentId: null,
    requiresReview: normalized.requiresReview,
    reason: normalized.reason
  };
}

module.exports = {
  selectIncident
};
