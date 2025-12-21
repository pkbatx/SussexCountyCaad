const Database = require("better-sqlite3");

function openDatabase(config) {
  const db = new Database(config.dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  return db;
}

module.exports = {
  openDatabase
};
