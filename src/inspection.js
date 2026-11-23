// inspection.js - keeps the current inspection (batch, sample size, defects)
// and validates user input. It does not print anything or ask questions.
//
// Every method returns an object:
//   success -> { valid: true, ... data ... }
//   failure -> { valid: false, error: 'clear message' }
// Methods never throw, so the command-line code can simply show result.error.

const { VALID_SEVERITIES, calculateVerdict } = require('./verdict');

// Assumption: "short description" means at most 100 characters.
const MAX_DESCRIPTION_LENGTH = 100;

// Accepts a number (52) or text that looks like a whole number ("52").
function parseSampleSize(input) {
  let number;
  if (typeof input === 'number') {
    number = input;
  } else if (typeof input === 'string' && /^-?\d+$/.test(input.trim())) {
    number = Number(input.trim());
  }

  // A whole number that is too big to be handled exactly (above Number.MAX_SAFE_INTEGER).
  // It is rejected as before. Only the message is different, so it is not misleading.
  if (Number.isInteger(number) && !Number.isSafeInteger(number)) {
    return { valid: false, error: 'Sample size must be a positive safe integer.' };
  }

  // Catches empty, "abc", 5.5, NaN, Infinity, null and undefined.
  if (!Number.isSafeInteger(number)) {
    return { valid: false, error: 'Sample size must be a whole number, for example 52.' };
  }
  if (number < 1) {
    return { valid: false, error: `Sample size must be 1 or more (you entered ${number}).` };
  }
  return { valid: true, value: number };
}

// "major", " MAJOR " -> "Major". Unknown severity -> null.
function normalizeSeverity(input) {
  if (typeof input !== 'string') {
    return null;
  }
  const wanted = input.trim().toLowerCase();
  return VALID_SEVERITIES.find((severity) => severity.toLowerCase() === wanted) || null;
}

class Inspection {
  constructor() {
    this.batchId = null;
    this.sampleSize = null;
    this.defects = [];
  }

  isStarted() {
    return this.batchId !== null;
  }

  // Validate everything first. Only change state if all input is valid,
  // so a bad "start" never damages an inspection that is already running.
  startInspection(batchId, sampleSize) {
    if (typeof batchId !== 'string' || batchId.trim() === '') {
      return { valid: false, error: 'Batch ID must not be empty.' };
    }
    const parsed = parseSampleSize(sampleSize);
    if (!parsed.valid) {
      return parsed;
    }

    this.batchId = batchId.trim();
    this.sampleSize = parsed.value;
    this.defects = [];
    return { valid: true, batchId: this.batchId, sampleSize: this.sampleSize };
  }

  recordDefect(severity, description) {
    if (!this.isStarted()) {
      return { valid: false, error: 'Start an inspection first.' };
    }

    const cleanSeverity = normalizeSeverity(severity);
    if (cleanSeverity === null) {
      return { valid: false, error: 'Severity must be Critical, Major or Minor.' };
    }

    if (typeof description !== 'string' || description.trim() === '') {
      return { valid: false, error: 'Description must not be empty.' };
    }
    const cleanDescription = description.trim();
    if (cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
      return {
        valid: false,
        error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
      };
    }

    const defect = {
      number: this.defects.length + 1,
      severity: cleanSeverity,
      description: cleanDescription,
    };
    this.defects.push(defect);
    return { valid: true, defect: { ...defect } }; // send a copy
  }

  listDefects() {
    if (!this.isStarted()) {
      return { valid: false, error: 'Start an inspection first.' };
    }
    // Send copies so the caller cannot change our stored defects.
    return { valid: true, defects: this.defects.map((defect) => ({ ...defect })) };
  }

  // The verdict is never stored. It is calculated again from the current defects.
  getVerdict() {
    if (!this.isStarted()) {
      return { valid: false, error: 'Start an inspection first.' };
    }
    const result = calculateVerdict(this.sampleSize, this.defects);
    return { ...result, batchId: this.batchId, sampleSize: this.sampleSize };
  }
}

module.exports = { Inspection, parseSampleSize, normalizeSeverity, MAX_DESCRIPTION_LENGTH };
