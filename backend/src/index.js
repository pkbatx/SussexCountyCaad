const { loadConfig } = require("./config/env");
const { openDatabase } = require("./db/connection");
const { runMigrations } = require("./db/migrate");
const { ingestReferenceData } = require("./db/reference_ingest");
const { startApiServer } = require("./api/server");
const { startWatcher } = require("./ingest/watcher");
const { startPipeline } = require("./pipeline/runner");

async function main() {
  const config = loadConfig();
  const db = openDatabase(config);

  runMigrations(db);
  ingestReferenceData({ db, config });

  const pipeline = startPipeline({ config, db });
  startApiServer({ config, db, pipeline });
  startWatcher({ config, db, pipeline });
}

main().catch((error) => {
  console.error("[backend] fatal error", error);
  process.exit(1);
});
