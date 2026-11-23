// verdict.js - decides ACCEPT or REJECT.
// This file only does the calculation. It does not read input or print anything.

// The acceptance limits table from the assignment.
// "atLeast" means: this row is used when sample size is at least this number.
const ACCEPTANCE_LIMITS = [
  { atLeast: 1, major: 0, minor: 1 },
  { atLeast: 16, major: 2, minor: 4 },
  { atLeast: 52, major: 4, minor: 9 },
  { atLeast: 190, major: 8, minor: 17 },
  { atLeast: 720, major: 15, minor: 32 },
];

// The only severities we accept (exact spelling and capital letters).
const VALID_SEVERITIES = ['Critical', 'Major', 'Minor'];

// Sample size must be a whole number and at least 1.
function isValidSampleSize(sampleSize) {
  return Number.isInteger(sampleSize) && sampleSize >= 1;
}

// Rule 1: pick the row with the largest "atLeast" that is <= sampleSize.
// The table is sorted small to big, so the last matching row wins.
function getLimits(sampleSize) {
  let selectedRow = null;
  for (const row of ACCEPTANCE_LIMITS) {
    if (row.atLeast <= sampleSize) {
      selectedRow = row;
    }
  }
  return selectedRow;
}

// Count how many defects have the given severity.
function countBySeverity(defects, severity) {
  return defects.filter((defect) => defect.severity === severity).length;
}

// Main function. defects is a list like: [{ severity: 'Major', description: '...' }]
function calculateVerdict(sampleSize, defects = []) {
  // Rule 4: invalid sample size -> error, no verdict.
  if (!isValidSampleSize(sampleSize)) {
    return {
      valid: false,
      error: 'Sample size must be a whole number of 1 or more.',
    };
  }

  if (!Array.isArray(defects)) {
    return { valid: false, error: 'Defects must be a list.' };
  }

  // An unknown severity must never be ignored silently,
  // because it could turn a REJECT into a wrong ACCEPT.
  const badDefect = defects.find(
    (defect) => !defect || !VALID_SEVERITIES.includes(defect.severity)
  );
  if (badDefect !== undefined) {
    return {
      valid: false,
      error: `Invalid severity "${badDefect && badDefect.severity}". Allowed: Critical, Major, Minor.`,
    };
  }

  const limits = getLimits(sampleSize);
  const critical = countBySeverity(defects, 'Critical');
  const major = countBySeverity(defects, 'Major');
  const minor = countBySeverity(defects, 'Minor');

  // Rule 2: collect every reason for REJECT.
  const reasons = [];
  if (critical >= 1) {
    reasons.push(`Critical defects: ${critical} (must be 0)`);
  }
  if (major > limits.major) {
    reasons.push(`Major defects: ${major} (limit ${limits.major})`);
  }
  if (minor > limits.minor) {
    reasons.push(`Minor defects: ${minor} (limit ${limits.minor})`);
  }

  // Rule 3: no reasons -> ACCEPT (zero defects also ends up here).
  return {
    valid: true,
    verdict: reasons.length > 0 ? 'REJECT' : 'ACCEPT',
    counts: { critical, major, minor },
    limits: { major: limits.major, minor: limits.minor },
    reasons,
  };
}

module.exports = {
  ACCEPTANCE_LIMITS,
  VALID_SEVERITIES,
  isValidSampleSize,
  getLimits,
  calculateVerdict,
};
