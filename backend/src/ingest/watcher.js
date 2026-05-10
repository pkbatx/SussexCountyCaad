const fs = require("fs");
const path = require("path");
const { ingestFile } = require("./ingest");

function startWatcher({ config, db, pipeline }) {
  const callsDir = config.callsDir;
  const inFlight = new Set();
  const ignoredNames = new Set([".DS_Store"]);

  function processFile(filePath) {
    const baseName = path.basename(filePath);
    if (ignoredNames.has(baseName)) {
      return;
    }
    if (inFlight.has(filePath)) {
      return;
    }
    inFlight.add(filePath);
    try {
      ingestFile({ db, pipeline, filePath, config });
    } catch (error) {
      console.error("[ingest] failed", error);
    } finally {
      inFlight.delete(filePath);
    }
  }

  function scanDirectory() {
    const entries = fs.readdirSync(callsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      if (ignoredNames.has(entry.name)) {
        continue;
      }
      processFile(path.join(callsDir, entry.name));
    }
  }

  fs.watch(callsDir, () => {
    scanDirectory();
  });

  scanDirectory();
  setInterval(scanDirectory, 10000);

  console.log(`[ingest] watching ${callsDir}`);
}

module.exports = {
  startWatcher
};
