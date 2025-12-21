const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { normalizeKey } = require("./queries/reference_data");

function buildReferenceId(refType, canonicalName, scope) {
  const hash = crypto
    .createHash("sha256")
    .update(`${refType}:${canonicalName}:${scope || ""}`)
    .digest("hex");
  return hash;
}

function toAliasMap(matchMap) {
  const map = new Map();
  Object.entries(matchMap || {}).forEach(([alias, canonical]) => {
    if (!canonical) {
      return;
    }
    const list = map.get(canonical) || [];
    if (alias && alias !== canonical) {
      list.push(alias);
    }
    map.set(canonical, list);
  });
  return map;
}

function loadJson(filePath) {
  if (!filePath) {
    return null;
  }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function upsertReference(db, record) {
  const stmt = db.prepare(
    "INSERT INTO reference_data (reference_id, ref_type, canonical_name, aliases_json, normalized_key, raw_address, latitude, longitude, source, metadata_json, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(reference_id) DO UPDATE SET ref_type = excluded.ref_type, canonical_name = excluded.canonical_name, aliases_json = excluded.aliases_json, normalized_key = excluded.normalized_key, raw_address = excluded.raw_address, latitude = excluded.latitude, longitude = excluded.longitude, source = excluded.source, metadata_json = excluded.metadata_json, active = excluded.active, updated_at = excluded.updated_at"
  );

  stmt.run(
    record.reference_id,
    record.ref_type,
    record.canonical_name,
    JSON.stringify(record.aliases || []),
    record.normalized_key || null,
    record.raw_address || null,
    record.latitude ?? null,
    record.longitude ?? null,
    record.source || null,
    JSON.stringify(record.metadata || {}),
    record.active ? 1 : 0,
    record.created_at,
    record.updated_at
  );
}

function ingestStreetTownData(db, data, source) {
  const streets = data?.entities?.streets?.all || [];
  const towns = data?.entities?.towns?.all || [];
  const streetAliasMap = toAliasMap(data?.entities?.streets?.match_map || {});
  const townAliasMap = toAliasMap(data?.entities?.towns?.match_map || {});
  const now = new Date().toISOString();

  streets.forEach((street) => {
    const aliases = streetAliasMap.get(street) || [];
    upsertReference(db, {
      reference_id: buildReferenceId("street", street, source),
      ref_type: "street",
      canonical_name: street,
      aliases,
      normalized_key: normalizeKey(street),
      raw_address: null,
      latitude: null,
      longitude: null,
      source,
      metadata: {},
      active: true,
      created_at: now,
      updated_at: now
    });
  });

  towns.forEach((town) => {
    const aliases = townAliasMap.get(town) || [];
    upsertReference(db, {
      reference_id: buildReferenceId("town", town, source),
      ref_type: "town",
      canonical_name: town,
      aliases,
      normalized_key: normalizeKey(town),
      raw_address: null,
      latitude: null,
      longitude: null,
      source,
      metadata: {},
      active: true,
      created_at: now,
      updated_at: now
    });
  });
}

function ingestPoiData(db, data, source) {
  const now = new Date().toISOString();
  data.forEach((town) => {
    const townName = town?.name || "";
    const zipCodes = town?.zip_codes || [];
    const pois = town?.pois || [];
    pois.forEach((poi) => {
      const canonical = poi?.name || "";
      if (!canonical) {
        return;
      }
      const aliases = [];
      if (poi?.address) {
        aliases.push(poi.address);
      }
      if (townName) {
        aliases.push(`${canonical} ${townName}`);
      }
      upsertReference(db, {
        reference_id: buildReferenceId("poi", canonical, townName),
        ref_type: "poi",
        canonical_name: canonical,
        aliases,
        normalized_key: normalizeKey(canonical),
        raw_address: poi?.address || null,
        latitude: poi?.latitude ?? null,
        longitude: poi?.longitude ?? null,
        source,
        metadata: {
          town: townName || null,
          zip_codes: zipCodes
        },
        active: true,
        created_at: now,
        updated_at: now
      });
    });
  });
}

function ingestReferenceData({ db, config }) {
  const poiPath = config.referencePoiPath;
  const streetPath = config.referenceStreetTownsPath;
  const poiData = loadJson(poiPath);
  const streetData = loadJson(streetPath);

  if (poiPath && !poiData) {
    console.warn(`[reference] POI file not found: ${poiPath}`);
  }
  if (streetPath && !streetData) {
    console.warn(`[reference] street/town file not found: ${streetPath}`);
  }

  if (!poiData && !streetData) {
    console.warn("[reference] no reference data files found");
    return;
  }

  db.transaction(() => {
    if (streetData) {
      ingestStreetTownData(db, streetData, "sussexstreetstowns");
    }
    if (poiData) {
      ingestPoiData(db, poiData, "sussexpoi");
    }
  })();
}

module.exports = {
  ingestReferenceData
};
