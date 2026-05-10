const { loadConfig } = require("./config/env");
const { openDatabase } = require("./db/connection");
const { runMigrations } = require("./db/migrate");
const { ingestReferenceData } = require("./db/reference_ingest");
const { startApiServer } = require("./api/server");
const { startWatcher } = require("./ingest/watcher");
const { startPipeline } = require("./pipeline/runner");
const log = require("./services/logger");

async function main() {
  const config = loadConfig();
  const db = openDatabase(config);

  runMigrations(db);
  await ingestReferenceData({ db, config });

  const pipeline = startPipeline({ config, db });
  await startApiServer({ config, db, pipeline });
  startWatcher({ config, db, pipeline });
}

main().catch((error) => {
  log.fatal({ err: error }, "backend fatal error");
  process.exit(1);
});
