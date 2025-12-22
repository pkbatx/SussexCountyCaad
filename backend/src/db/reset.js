const fs = require("fs");
const path = require("path");
const { loadConfig } = require("../config/env");
const { openDatabase } = require("./connection");
const { runMigrations } = require("./migrate");
const { ingestReferenceData } = require("./reference_ingest");

function hasConfirmFlag(args) {
  return args.includes("--confirm") || args.includes("--force");
}

function ensureConfirmed() {
  const args = process.argv.slice(2);
  const envConfirm = process.env.CAAD_RESET_CONFIRM === "YES";
  if (!envConfirm && !hasConfirmFlag(args)) {
    console.error(
      "Refusing to reset DB without confirmation. Indicate consent with --confirm or CAAD_RESET_CONFIRM=YES."
    );
    process.exit(1);
  }
}

function backupDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return null;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "");
  const backupPath = `${dbPath}.bak-${timestamp}`;
  fs.renameSync(dbPath, backupPath);
  return backupPath;
}

async function resetDatabase() {
  ensureConfirmed();
  const config = loadConfig();
  const dbPath = path.resolve(config.dbPath);
  const backupPath = backupDatabase(dbPath);

  const db = openDatabase({ dbPath });
  runMigrations(db);
  try {
    await ingestReferenceData({ db, config });
  } finally {
    db.close();
  }

  if (backupPath) {
    console.log(`[db] archived ${dbPath} -> ${backupPath}`);
  }
  console.log("[db] reset complete");
}

resetDatabase().catch((error) => {
  console.error("[db] reset failed", error);
  process.exit(1);
});
