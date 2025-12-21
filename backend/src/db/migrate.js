const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function ensureMigrationsTable(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL, checksum TEXT NOT NULL)"
  );
}

function readAppliedMigrations(db) {
  const rows = db.prepare("SELECT version FROM schema_migrations").all();
  return new Set(rows.map((row) => row.version));
}

function checksumFor(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

function runMigrations(db) {
  ensureMigrationsTable(db);
  const applied = readAppliedMigrations(db);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(fullPath, "utf8");
    const checksum = checksumFor(sql);

    db.transaction(() => {
      db.exec(sql);
      db.prepare(
        "INSERT INTO schema_migrations (version, applied_at, checksum) VALUES (?, ?, ?)"
      ).run(file, new Date().toISOString(), checksum);
    })();
  }
}

module.exports = {
  runMigrations
};
