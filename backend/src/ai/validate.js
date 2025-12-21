const fs = require("fs");
const Ajv = require("ajv");

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaCache = new Map();

function loadSchema(schemaPath) {
  if (schemaCache.has(schemaPath)) {
    return schemaCache.get(schemaPath);
  }
  const raw = fs.readFileSync(schemaPath, "utf8");
  const schema = JSON.parse(raw);
  const validate = ajv.compile(schema);
  schemaCache.set(schemaPath, validate);
  return validate;
}

function validatePayload(schemaPath, payload) {
  const validate = loadSchema(schemaPath);
  const ok = validate(payload);
  return { ok, errors: validate.errors || [] };
}

function parseJsonStrict(text) {
  return JSON.parse(text);
}

function isEmptyValue(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  return false;
}

function evidenceItemError(item, field) {
  if (!item || typeof item !== "object") {
    return `Evidence item for ${field} must be an object.`;
  }
  if (typeof item.text !== "string" || !item.text.trim()) {
    return `Evidence item for ${field} must include text.`;
  }
  if (typeof item.reason !== "string" || !item.reason.trim()) {
    return `Evidence item for ${field} must include reason.`;
  }

  const hasCharSpan =
    Number.isInteger(item.start_char) && Number.isInteger(item.end_char);
  const hasSegmentSpan =
    typeof item.segment_id === "string" &&
    typeof item.t_start === "number" &&
    typeof item.t_end === "number";

  if (!hasCharSpan && !hasSegmentSpan) {
    return `Evidence item for ${field} must include a span reference.`;
  }

  if (hasCharSpan && item.end_char < item.start_char) {
    return `Evidence item for ${field} has invalid character span.`;
  }

  if (hasSegmentSpan && item.t_end < item.t_start) {
    return `Evidence item for ${field} has invalid time span.`;
  }

  return null;
}

function validateEvidenceArray(items, field, errors) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push({ field, message: `Missing evidence for ${field}.` });
    return;
  }

  items.forEach((item, index) => {
    const error = evidenceItemError(item, field);
    if (error) {
      errors.push({ field, index, message: error });
    }
  });
}

function validateExtractionEvidence(payload) {
  const errors = [];
  const requiredFields = [
    "incident_type",
    "priority",
    "jurisdiction",
    "channel",
    "talkgroup",
    "units",
    "incident_id",
    "address_raw",
    "address_normalized",
    "cross_street_1",
    "cross_street_2",
    "landmark",
    "city",
    "notes"
  ];

  const fieldConfidence = payload.field_confidence || {};
  const evidence = payload.evidence || {};

  requiredFields.forEach((field) => {
    if (typeof fieldConfidence[field] !== "number") {
      errors.push({ field, message: `Missing field confidence for ${field}.` });
    }

    const value = payload[field];
    if (!isEmptyValue(value)) {
      validateEvidenceArray(evidence[field], field, errors);
    } else if (Array.isArray(evidence[field])) {
      evidence[field].forEach((item, index) => {
        const error = evidenceItemError(item, field);
        if (error) {
          errors.push({ field, index, message: error });
        }
      });
    }
  });

  return { ok: errors.length === 0, errors };
}

module.exports = {
  validatePayload,
  parseJsonStrict,
  validateExtractionEvidence
};
