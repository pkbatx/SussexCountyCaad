const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { normalizeKey } = require("./queries/reference_data");
const { createAIAdapter } = require("../ai/adapter");
const log = require("../services/logger");
const {
  listReferenceEmbeddings,
  upsertReferenceEmbedding
} = require("./queries/reference_embeddings");

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

function resolveReferencePath(configPath, fallbackPath) {
  const normalized = configPath ? path.resolve(configPath) : null;
  if (normalized && fs.existsSync(normalized)) {
    return normalized;
  }
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    if (normalized && normalized !== fallbackPath) {
      log.warn(
        { fallbackPath, normalized },
        "reference fallback path"
      );
    }
    return fallbackPath;
  }
  return normalized || null;
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

  return {
    streetRecords: streets.map((street) => ({
      reference_id: buildReferenceId("street", street, source),
      text: street
    })),
    townRecords: towns.map((town) => ({
      reference_id: buildReferenceId("town", town, source),
      text: town
    }))
  };
}

function ingestPoiData(db, data, source) {
  const now = new Date().toISOString();
  const records = [];
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
      records.push({
        reference_id: buildReferenceId("poi", canonical, townName),
        text: canonical
      });
    });
  });
  return records;
}

async function indexReferenceEmbeddings({ db, config, records }) {
  if (!config.openaiApiKey || !config.openaiEmbeddingsModel) {
    return;
  }
  if (!records.length) {
    return;
  }
  const pending = [];
  const chunkSize = 400;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const embeddings = listReferenceEmbeddings(db, {
      referenceIds: chunk.map((entry) => entry.reference_id),
      model: config.openaiEmbeddingsModel
    });
    chunk.forEach((entry) => {
      if (!embeddings.has(entry.reference_id)) {
        pending.push(entry);
      }
    });
  }
  if (!pending.length) {
    return;
  }

  const adapter = createAIAdapter({ config });
  const batchSize = Number(config.openaiEmbeddingsBatchSize || 64);
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const inputs = batch.map((entry) => entry.text);
    try {
      const result = await adapter.embedTexts({
        input: inputs,
        model: config.openaiEmbeddingsModel
      });
      result.embeddings.forEach((embedding, idx) => {
        const record = batch[idx];
        if (!record || !embedding) {
          return;
        }
        upsertReferenceEmbedding(db, {
          referenceId: record.reference_id,
          model: result.model || config.openaiEmbeddingsModel,
          embedding
        });
      });
    } catch (error) {
      log.warn({ err: error }, "reference embeddings failed");
      return;
    }
  }
}

async function ingestReferenceData({ db, config }) {
  const defaultPoiPath = path.resolve(__dirname, "..", "..", "sussexpoi.json");
  const defaultStreetPath = path.resolve(
    __dirname,
    "..",
    "..",
    "sussexstreetstowns.json"
  );
  const poiPath = resolveReferencePath(config.referencePoiPath, defaultPoiPath);
  const streetPath = resolveReferencePath(
    config.referenceStreetTownsPath,
    defaultStreetPath
  );
  const poiData = loadJson(poiPath);
  const streetData = loadJson(streetPath);

  if (poiPath && !poiData) {
    log.warn({ poiPath }, "reference POI file not found");
  }
  if (streetPath && !streetData) {
    log.warn({ streetPath }, "reference street/town file not found");
  }

  if (!poiData && !streetData) {
    log.warn("no reference data files found");
    return;
  }

  const embedRecords = [];
  db.transaction(() => {
    if (streetData) {
      const result = ingestStreetTownData(db, streetData, "sussexstreetstowns");
      embedRecords.push(...result.streetRecords, ...result.townRecords);
    }
    if (poiData) {
      embedRecords.push(...ingestPoiData(db, poiData, "sussexpoi"));
    }
  })();

  if (config.openaiEmbeddingsPrecompute) {
    await indexReferenceEmbeddings({ db, config, records: embedRecords });
  }
}

module.exports = {
  ingestReferenceData
};
