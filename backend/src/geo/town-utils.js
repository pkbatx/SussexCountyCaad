function isCounty(value) {
  return /\bcounty\b/i.test(value || "");
}

function normalizeCounty(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+county\b/, "")
    .trim();
}

function isAllowedCounty(value) {
  const normalized = normalizeCounty(value);
  if (!normalized) {
    return false;
  }
  return normalized === "sussex" || normalized === "warren";
}

function normalizeTownQuery(value) {
  if (!value) {
    return "";
  }
  const text = String(value).trim();
  if (isCounty(text)) {
    return "";
  }
  return text
    .replace(/\b(Township|Borough|Boro|Town|City)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTownFromGeocode(geocodeJson) {
  if (!geocodeJson) {
    return null;
  }
  let parsed = geocodeJson;
  if (typeof geocodeJson === "string") {
    try {
      parsed = JSON.parse(geocodeJson);
    } catch (_error) {
      return null;
    }
  }
  if (parsed?.metadata?.town) {
    return parsed.metadata.town;
  }
  const response = parsed.response || parsed;
  const feature = response?.features?.[0];
  if (!feature) {
    return null;
  }
  const contexts = Array.isArray(feature.context) ? feature.context : [];
  const countyContext = contexts.find((item) => item?.id?.startsWith("district."));
  if (countyContext?.text && !isAllowedCounty(countyContext.text)) {
    return null;
  }
  if (!countyContext?.text && contexts.length > 0) {
    return null;
  }
  const locality = contexts.find((item) => item?.id?.startsWith("locality."));
  if (locality?.text && !isCounty(locality.text)) {
    return locality.text;
  }
  const preferredTypes = ["place", "district", "locality"];
  for (const type of preferredTypes) {
    const match = contexts.find((item) => item?.id?.startsWith(`${type}.`));
    if (match?.text && !isCounty(match.text)) {
      return match.text;
    }
  }
  if (
    feature.place_type?.includes("place") &&
    feature.text &&
    !isCounty(feature.text)
  ) {
    return feature.text;
  }
  return null;
}

module.exports = {
  extractTownFromGeocode,
  normalizeTownQuery
};
