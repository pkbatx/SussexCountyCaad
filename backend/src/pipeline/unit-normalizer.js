const SERVICE_REGEX = /(EMS|Fire|FD|Rescue)/i;
const SEQUENCE_REGEX = /\b(\d{4,})\s*(EMS|Fire|FD|Rescue)\b/gi;
const NUMBER_SERVICE_REGEX = /\b(\d{1,3})\s*(EMS|Fire|FD|Rescue)\b/gi;
const SERVICE_NUMBER_REGEX = /\b(EMS|Fire|FD|Rescue)\s+(\d{1,3})\b/gi;
const UNIT_WORD_REGEX = /\bunit\s+(\d{1,3})\b/gi;

function addUnit(map, unit, evidence) {
  if (!unit) {
    return;
  }
  const cleaned = String(unit).trim();
  if (!cleaned) {
    return;
  }
  if (!map.has(cleaned)) {
    map.set(cleaned, { unit: cleaned, evidence });
  }
}

function buildEvidence(match, reason) {
  return {
    text: match[0],
    start_char: match.index,
    end_char: match.index + match[0].length,
    reason
  };
}

function splitUnitSequence(sequence) {
  if (!sequence || sequence.length < 4 || sequence.length % 2 !== 0) {
    return [];
  }
  const units = [];
  for (let i = 0; i < sequence.length; i += 2) {
    units.push(sequence.slice(i, i + 2));
  }
  return units;
}

function extractUnitCandidates(text) {
  if (!text) {
    return [];
  }
  const units = new Map();
  const transcript = String(text);

  for (const match of transcript.matchAll(SEQUENCE_REGEX)) {
    const sequence = match[1];
    const service = match[2];
    if (!SERVICE_REGEX.test(service)) {
      continue;
    }
    const pairs = splitUnitSequence(sequence);
    const evidence = buildEvidence(match, "Unit sequence in dispatch.");
    pairs.forEach((unit) => addUnit(units, unit, evidence));
  }

  for (const match of transcript.matchAll(NUMBER_SERVICE_REGEX)) {
    const unit = match[1];
    const service = match[2];
    if (!SERVICE_REGEX.test(service)) {
      continue;
    }
    addUnit(units, unit, buildEvidence(match, "Unit identifier in dispatch."));
  }

  for (const match of transcript.matchAll(SERVICE_NUMBER_REGEX)) {
    const unit = match[2];
    addUnit(units, unit, buildEvidence(match, "Unit identifier in dispatch."));
  }

  for (const match of transcript.matchAll(UNIT_WORD_REGEX)) {
    const unit = match[1];
    addUnit(units, unit, buildEvidence(match, "Unit identifier in dispatch."));
  }

  return Array.from(units.values());
}

module.exports = {
  extractUnitCandidates
};
