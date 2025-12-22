const { listMetadataForCall } = require("../../db/queries/metadata");
const { createLocationCandidate } = require("../../db/queries/locations");
const { findReferenceCandidatesForText } = require("../../db/queries/reference_data");
const { geocodeMapbox } = require("../../geo/mapbox");

function normalizeText(value) {
  if (!value) {
    return "";
  }
  return String(value).toLowerCase().trim();
}

function matchReference(value, candidates) {
  if (!value || !Array.isArray(candidates)) {
    return null;
  }
  const normalized = normalizeText(value);
  return (
    candidates.find((candidate) => {
      const options = [candidate.canonical_name, ...(candidate.aliases || [])]
        .map(normalizeText)
        .filter(Boolean);
      return options.some(
        (option) =>
          normalized === option ||
          normalized.includes(option) ||
          option.includes(normalized)
      );
    }) || null
  );
}

function buildGeocodeQueries(payload, townFallback, rawText) {
  const queries = [];
  if (!payload) {
    if (!rawText) {
      return queries;
    }
    const city = townFallback || "Sussex County";
    queries.push(`${rawText}, ${city}, NJ`);
    return queries;
  }
  const city =
    payload.city || payload.jurisdiction || townFallback || "Sussex County";
  const address = payload.address_normalized || payload.address_raw;
  const cross1 = payload.cross_street_1;
  const cross2 = payload.cross_street_2;

  if (address && cross1) {
    queries.push(`${address} and ${cross1}, ${city}, NJ`);
  }
  if (cross1 && cross2) {
    queries.push(`${cross1} and ${cross2}, ${city}, NJ`);
  }
  if (address) {
    queries.push(`${address}, ${city}, NJ`);
  }
  if (cross1) {
    queries.push(`${cross1}, ${city}, NJ`);
  }
  if (payload.landmark) {
    queries.push(`${payload.landmark}, ${city}, NJ`);
  }
  if (rawText) {
    queries.push(`${rawText}, ${city}, NJ`);
  }

  return Array.from(new Set(queries));
}

async function runStage({ config, db, callId }) {
  const extracts = listMetadataForCall(db, callId);
  if (!extracts.length) {
    return;
  }

  const v2Extract = extracts.find(
    (item) => item.schema_version === "extraction.v2"
  );
  const payload = v2Extract ? JSON.parse(v2Extract.payload_json) : null;
  const legacy = !payload ? JSON.parse(extracts[0].payload_json) : null;

  let rawText = null;
  let confidence = null;
  let referenceCandidates = { street: [], town: [], poi: [] };

  if (payload) {
    rawText =
      payload.address_raw ||
      payload.address_normalized ||
      payload.cross_street_1 ||
      payload.landmark;
    if (payload.address_raw && payload.field_confidence) {
      confidence = payload.field_confidence.address_raw ?? null;
    } else if (payload.cross_street_1 && payload.field_confidence) {
      confidence = payload.field_confidence.cross_street_1 ?? null;
    } else if (payload.cross_street_2 && payload.field_confidence) {
      confidence = payload.field_confidence.cross_street_2 ?? null;
    } else if (payload.landmark && payload.field_confidence) {
      confidence = payload.field_confidence.landmark ?? null;
    } else if (payload.address_normalized && payload.field_confidence) {
      confidence = payload.field_confidence.address_normalized ?? null;
    }
  } else if (legacy?.fields?.locationText?.value) {
    rawText = legacy.fields.locationText.value;
    confidence = legacy.fields.locationText.confidence ?? null;
  }

  if (rawText) {
    referenceCandidates = findReferenceCandidatesForText(db, {
      text: [
        rawText,
        payload?.address_normalized,
        payload?.cross_street_1,
        payload?.cross_street_2,
        payload?.city,
        payload?.jurisdiction,
        payload?.landmark
      ]
        .filter(Boolean)
        .join(" "),
      limitPerType: config.referenceDataMaxCandidates
    });
  }

  const poiMatch = matchReference(payload?.landmark, referenceCandidates.poi);
  if (poiMatch?.latitude && poiMatch?.longitude) {
    createLocationCandidate(db, {
      subjectType: "call",
      subjectId: callId,
      rawText,
      normalizedText: poiMatch.canonical_name,
      geocodeJson: {
        source: "reference",
        reference_id: poiMatch.reference_id,
        latitude: poiMatch.latitude,
        longitude: poiMatch.longitude,
        raw_address: poiMatch.raw_address || null,
        metadata: poiMatch.metadata || {}
      },
      confidence
    });
    return;
  }

  if (!rawText) {
    return;
  }

  const townFallback = referenceCandidates.town?.[0]?.canonical_name || null;
  const queries = buildGeocodeQueries(payload, townFallback, rawText);
  if (!queries.length || !config.mapboxAccessToken) {
    createLocationCandidate(db, {
      subjectType: "call",
      subjectId: callId,
      rawText,
      normalizedText: null,
      geocodeJson: null,
      confidence
    });
    return;
  }

  try {
    let geocode = null;
    let query = null;
    for (const candidate of queries) {
      const result = await geocodeMapbox({ config, query: candidate });
      const top = result.response?.features?.[0] || null;
      if (top) {
        geocode = result;
        query = candidate;
        break;
      }
    }
    if (!geocode) {
      throw new Error("Mapbox geocoding returned no results");
    }
    const top = geocode.response?.features?.[0] || null;
    const center = Array.isArray(top?.center) ? top.center : null;
    const longitude = center ? center[0] : null;
    const latitude = center ? center[1] : null;
    createLocationCandidate(db, {
      subjectType: "call",
      subjectId: callId,
      rawText,
      normalizedText: top?.place_name || null,
      geocodeJson: {
        provider: "mapbox",
        query,
        latitude,
        longitude,
        response: geocode.response
      },
      confidence
    });
  } catch (error) {
    createLocationCandidate(db, {
      subjectType: "call",
      subjectId: callId,
      rawText,
      normalizedText: null,
      geocodeJson: { error: error.message, query },
      confidence
    });
  }
}

module.exports = {
  runStage,
  buildGeocodeQueries
};
