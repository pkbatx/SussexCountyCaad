const crypto = require("crypto");
const fs = require("fs");

function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

module.exports = {
  hashFile
};
