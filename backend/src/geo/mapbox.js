function buildGeocodeUrl({ query, accessToken, limit, types, bbox, proximity }) {
  const encoded = encodeURIComponent(query);
  const params = new URLSearchParams();
  params.set("access_token", accessToken);
  if (limit) {
    params.set("limit", String(limit));
  }
  if (types) {
    params.set("types", types);
  }
  if (bbox) {
    params.set("bbox", bbox);
  }
  if (proximity) {
    params.set("proximity", proximity);
  }
  return `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?${params.toString()}`;
}

async function geocodeMapbox({ config, query, limit }) {
  if (!config.mapboxAccessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN is required for geocoding");
  }
  const url = buildGeocodeUrl({
    query,
    accessToken: config.mapboxAccessToken,
    limit: limit || config.mapboxGeocodeLimit,
    types: config.mapboxGeocodeTypes,
    bbox: config.mapboxGeocodeBbox || null,
    proximity: null
  });
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Mapbox geocoding failed");
  }
  return { url, response: json };
}

module.exports = {
  buildGeocodeUrl,
  geocodeMapbox
};
