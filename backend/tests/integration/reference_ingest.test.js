const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { ingestReferenceData } = require("../../src/db/reference_ingest");

function loadSql(relativePath) {
  return fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath),
    "utf8"
  );
}

function fixturePath(name) {
  return path.join(__dirname, "..", "fixtures", "reference_ingest", name);
}

test("reference ingestion loads streets, towns, and pois", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(loadSql("001_init.sql"));
  db.exec(loadSql("003_incident_centric.sql"));
  db.exec(loadSql("004_reference_data_geo.sql"));

  ingestReferenceData({
    db,
    config: {
      referencePoiPath: fixturePath("poi.json"),
      referenceStreetTownsPath: fixturePath("streets_towns.json"),
      referenceDataMaxCandidates: 5
    }
  });

  const streets = db
    .prepare("SELECT * FROM reference_data WHERE ref_type = 'street'")
    .all();
  const towns = db
    .prepare("SELECT * FROM reference_data WHERE ref_type = 'town'")
    .all();
  const pois = db
    .prepare("SELECT * FROM reference_data WHERE ref_type = 'poi'")
    .all();

  assert.equal(streets.length, 1);
  assert.equal(towns.length, 1);
  assert.equal(pois.length, 1);
  assert.equal(streets[0].canonical_name, "Main St");
  assert.ok(streets[0].normalized_key.includes("MAIN"));
  assert.equal(towns[0].canonical_name, "Andover");
  assert.equal(pois[0].canonical_name, "Andover Borough Hall");
  assert.equal(pois[0].latitude, 40.9853);
  assert.equal(pois[0].longitude, -74.7451);
});
