const { test, expect } = require('@playwright/test');
const { ACCEPTANCE_LIMITS, getLimits, calculateVerdict } = require('../src/verdict');

// Helper: make a list of n defects with the same severity.
function makeDefects(severity, n) {
  return Array.from({ length: n }, (_, i) => ({
    severity,
    description: `${severity} defect ${i + 1}`,
  }));
}

test.describe('Mandatory scenarios from the assignment', () => {
  test('1. sample 52, 4 major defects = ACCEPT', () => {
    const result = calculateVerdict(52, makeDefects('Major', 4));
    expect(result.valid).toBe(true);
    expect(result.verdict).toBe('ACCEPT');
  });

  test('2. sample 52, 5 major defects = REJECT', () => {
    const result = calculateVerdict(52, makeDefects('Major', 5));
    expect(result.verdict).toBe('REJECT');
  });

  test('3. sample 51, 4 major defects = REJECT', () => {
    const result = calculateVerdict(51, makeDefects('Major', 4));
    expect(result.verdict).toBe('REJECT');
  });

  test('4. sample 189, 8 major defects = REJECT', () => {
    const result = calculateVerdict(189, makeDefects('Major', 8));
    expect(result.verdict).toBe('REJECT');
  });

  test('5. sample 190, 8 major defects = ACCEPT', () => {
    const result = calculateVerdict(190, makeDefects('Major', 8));
    expect(result.verdict).toBe('ACCEPT');
  });

  test('6. sample 85, 1 critical defect = REJECT', () => {
    const result = calculateVerdict(85, makeDefects('Critical', 1));
    expect(result.verdict).toBe('REJECT');
  });

  test('7. sample 52, zero defects = ACCEPT', () => {
    const result = calculateVerdict(52, []);
    expect(result.verdict).toBe('ACCEPT');
  });

  test('8. sample 0 = clear validation error, no verdict', () => {
    const result = calculateVerdict(0, []);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Sample size must be a whole number of 1 or more.');
    expect(result.verdict).toBeUndefined();
  });
});

test.describe('Limits table', () => {
  test('table matches the assignment exactly', () => {
    expect(ACCEPTANCE_LIMITS).toEqual([
      { atLeast: 1, major: 0, minor: 1 },
      { atLeast: 16, major: 2, minor: 4 },
      { atLeast: 52, major: 4, minor: 9 },
      { atLeast: 190, major: 8, minor: 17 },
      { atLeast: 720, major: 15, minor: 32 },
    ]);
  });

  test('row selection at the edges of each range', () => {
    expect(getLimits(1).atLeast).toBe(1);
    expect(getLimits(15).atLeast).toBe(1);
    expect(getLimits(16).atLeast).toBe(16);
    expect(getLimits(51).atLeast).toBe(16);
    expect(getLimits(52).atLeast).toBe(52);
    expect(getLimits(189).atLeast).toBe(52);
    expect(getLimits(190).atLeast).toBe(190);
    expect(getLimits(719).atLeast).toBe(190);
    expect(getLimits(720).atLeast).toBe(720);
    expect(getLimits(5000).atLeast).toBe(720);
  });
});

test.describe('Boundary value cases', () => {
  test('sample 1: 1 minor = ACCEPT, 2 minor = REJECT', () => {
    expect(calculateVerdict(1, makeDefects('Minor', 1)).verdict).toBe('ACCEPT');
    expect(calculateVerdict(1, makeDefects('Minor', 2)).verdict).toBe('REJECT');
  });

  test('sample 1: 1 major = REJECT (major limit is 0)', () => {
    expect(calculateVerdict(1, makeDefects('Major', 1)).verdict).toBe('REJECT');
  });

  test('sample 15 still uses the first row (1 major = REJECT)', () => {
    expect(calculateVerdict(15, makeDefects('Major', 1)).verdict).toBe('REJECT');
  });

  test('sample 16: 2 major = ACCEPT, 3 major = REJECT', () => {
    expect(calculateVerdict(16, makeDefects('Major', 2)).verdict).toBe('ACCEPT');
    expect(calculateVerdict(16, makeDefects('Major', 3)).verdict).toBe('REJECT');
  });

  test('sample 52: 9 minor = ACCEPT, 10 minor = REJECT', () => {
    expect(calculateVerdict(52, makeDefects('Minor', 9)).verdict).toBe('ACCEPT');
    expect(calculateVerdict(52, makeDefects('Minor', 10)).verdict).toBe('REJECT');
  });

  test('sample 719 uses the 190 row (9 major = REJECT)', () => {
    expect(calculateVerdict(719, makeDefects('Major', 9)).verdict).toBe('REJECT');
  });

  test('sample 720: 15 major = ACCEPT, 16 major = REJECT', () => {
    expect(calculateVerdict(720, makeDefects('Major', 15)).verdict).toBe('ACCEPT');
    expect(calculateVerdict(720, makeDefects('Major', 16)).verdict).toBe('REJECT');
  });

  test('very large sample (5000) uses the last row', () => {
    expect(calculateVerdict(5000, makeDefects('Major', 15)).verdict).toBe('ACCEPT');
    expect(calculateVerdict(5000, makeDefects('Minor', 33)).verdict).toBe('REJECT');
  });
});

test.describe('Multiple severities together', () => {
  test('sample 52: 4 major + 9 minor (both at limit) = ACCEPT', () => {
    const defects = [...makeDefects('Major', 4), ...makeDefects('Minor', 9)];
    const result = calculateVerdict(52, defects);
    expect(result.verdict).toBe('ACCEPT');
    expect(result.counts).toEqual({ critical: 0, major: 4, minor: 9 });
  });

  test('sample 52: 4 major + 10 minor = REJECT (only minor is over)', () => {
    const defects = [...makeDefects('Major', 4), ...makeDefects('Minor', 10)];
    const result = calculateVerdict(52, defects);
    expect(result.verdict).toBe('REJECT');
    expect(result.reasons).toHaveLength(1);
  });

  test('sample 52: 5 major + 9 minor = REJECT (only major is over)', () => {
    const defects = [...makeDefects('Major', 5), ...makeDefects('Minor', 9)];
    expect(calculateVerdict(52, defects).verdict).toBe('REJECT');
  });

  test('sample 190: 1 critical + 2 major + 3 minor = REJECT, critical is a reason', () => {
    const defects = [
      ...makeDefects('Critical', 1),
      ...makeDefects('Major', 2),
      ...makeDefects('Minor', 3),
    ];
    const result = calculateVerdict(190, defects);
    expect(result.verdict).toBe('REJECT');
    expect(result.counts).toEqual({ critical: 1, major: 2, minor: 3 });
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain('Critical');
  });

  test('sample 52: all three over their limits = REJECT with 3 reasons', () => {
    const defects = [
      ...makeDefects('Critical', 2),
      ...makeDefects('Major', 5),
      ...makeDefects('Minor', 10),
    ];
    const result = calculateVerdict(52, defects);
    expect(result.verdict).toBe('REJECT');
    expect(result.reasons).toHaveLength(3);
  });
});

test.describe('Invalid sample size (equivalence partitioning)', () => {
  const badSizes = [
    ['negative number', -5],
    ['decimal number', 5.5],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['text "52"', '52'],
    ['null', null],
    ['undefined', undefined],
  ];

  for (const [name, value] of badSizes) {
    test(`${name} gives an error and no verdict`, () => {
      const result = calculateVerdict(value, []);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('whole number');
      expect(result.verdict).toBeUndefined();
    });
  }
});

test.describe('Invalid severity must never give a silent ACCEPT', () => {
  test('misspelled severity gives an error, not ACCEPT', () => {
    const result = calculateVerdict(52, [{ severity: 'Mjor', description: 'typo' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid severity');
    expect(result.verdict).toBeUndefined();
  });

  test('lowercase "major" is rejected (exact spelling required)', () => {
    const result = calculateVerdict(52, [{ severity: 'major', description: 'x' }]);
    expect(result.valid).toBe(false);
  });

  test('missing severity gives an error', () => {
    const result = calculateVerdict(52, [{ description: 'no severity' }]);
    expect(result.valid).toBe(false);
  });

  test('null defect in the list gives an error', () => {
    const result = calculateVerdict(52, [null]);
    expect(result.valid).toBe(false);
  });

  test('4 valid major + 1 invalid defect does NOT become ACCEPT', () => {
    const defects = [...makeDefects('Major', 4), { severity: 'Urgent', description: 'x' }];
    const result = calculateVerdict(52, defects);
    expect(result.valid).toBe(false);
    expect(result.verdict).toBeUndefined();
  });

  test('defects that are not a list give an error', () => {
    const result = calculateVerdict(52, 'not a list');
    expect(result.valid).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// Commit 6: table-driven boundary tests.
// The expected numbers below are typed again by hand from the assignment table,
// so these tests do not depend on ACCEPTANCE_LIMITS in the code.
// "from" and "to" are the smallest and largest sample size of each row.
// ---------------------------------------------------------------------------
const TABLE_ROWS = [
  { row: 1, from: 1, to: 15, major: 0, minor: 1 },
  { row: 2, from: 16, to: 51, major: 2, minor: 4 },
  { row: 3, from: 52, to: 189, major: 4, minor: 9 },
  { row: 4, from: 190, to: 719, major: 8, minor: 17 },
  { row: 5, from: 720, to: Number.MAX_SAFE_INTEGER, major: 15, minor: 32 },
];

// Helper: Major defects and Minor defects together.
function majorAndMinor(majorCount, minorCount) {
  return [...makeDefects('Major', majorCount), ...makeDefects('Minor', minorCount)];
}

test.describe('Every table row at its smallest and largest sample size', () => {
  for (const r of TABLE_ROWS) {
    for (const size of [r.from, r.to]) {
      const where = `row ${r.row}, sample ${size}`;

      test(`${where}: Major ${r.major} = ACCEPT, Major ${r.major + 1} = REJECT`, () => {
        const atLimit = calculateVerdict(size, makeDefects('Major', r.major));
        expect(atLimit.verdict).toBe('ACCEPT');
        // The limits in the result prove that the correct row was used.
        expect(atLimit.limits).toEqual({ major: r.major, minor: r.minor });

        const over = calculateVerdict(size, makeDefects('Major', r.major + 1));
        expect(over.verdict).toBe('REJECT');
        expect(over.reasons).toHaveLength(1);
        expect(over.reasons[0]).toContain('Major');
      });

      test(`${where}: Minor ${r.minor} = ACCEPT, Minor ${r.minor + 1} = REJECT`, () => {
        const atLimit = calculateVerdict(size, makeDefects('Minor', r.minor));
        expect(atLimit.verdict).toBe('ACCEPT');
        expect(atLimit.limits).toEqual({ major: r.major, minor: r.minor });

        const over = calculateVerdict(size, makeDefects('Minor', r.minor + 1));
        expect(over.verdict).toBe('REJECT');
        expect(over.reasons).toHaveLength(1);
        expect(over.reasons[0]).toContain('Minor');
      });

      test(`${where}: Critical 0 = ACCEPT, Critical 1 = REJECT`, () => {
        expect(calculateVerdict(size, []).verdict).toBe('ACCEPT');

        const one = calculateVerdict(size, makeDefects('Critical', 1));
        expect(one.verdict).toBe('REJECT');
        expect(one.reasons).toHaveLength(1);
        expect(one.reasons[0]).toContain('Critical');
      });

      test(`${where}: Major ${r.major} + Minor ${r.minor} together = ACCEPT, either one over = REJECT`, () => {
        const atBoth = calculateVerdict(size, majorAndMinor(r.major, r.minor));
        expect(atBoth.verdict).toBe('ACCEPT');
        expect(atBoth.counts).toEqual({ critical: 0, major: r.major, minor: r.minor });

        const majorOver = calculateVerdict(size, majorAndMinor(r.major + 1, r.minor));
        expect(majorOver.verdict).toBe('REJECT');
        expect(majorOver.reasons).toHaveLength(1);
        expect(majorOver.reasons[0]).toContain('Major');

        const minorOver = calculateVerdict(size, majorAndMinor(r.major, r.minor + 1));
        expect(minorOver.verdict).toBe('REJECT');
        expect(minorOver.reasons).toHaveLength(1);
        expect(minorOver.reasons[0]).toContain('Minor');

        const bothOver = calculateVerdict(size, majorAndMinor(r.major + 1, r.minor + 1));
        expect(bothOver.verdict).toBe('REJECT');
        expect(bothOver.reasons).toHaveLength(2);

        const withCritical = calculateVerdict(size, [
          ...majorAndMinor(r.major, r.minor),
          ...makeDefects('Critical', 1),
        ]);
        expect(withCritical.verdict).toBe('REJECT');
        expect(withCritical.reasons).toHaveLength(1);
        expect(withCritical.reasons[0]).toContain('Critical');
      });
    }
  }
});

test.describe('Defects argument omitted or null', () => {
  test('calculateVerdict(52) with no defects argument = ACCEPT with zero counts', () => {
    const result = calculateVerdict(52);
    expect(result.valid).toBe(true);
    expect(result.verdict).toBe('ACCEPT');
    expect(result.counts).toEqual({ critical: 0, major: 0, minor: 0 });
    expect(result.reasons).toEqual([]);
  });

  test('defects explicitly undefined is the same as omitted', () => {
    const result = calculateVerdict(52, undefined);
    expect(result.valid).toBe(true);
    expect(result.verdict).toBe('ACCEPT');
  });

  test('defects null gives an error and no verdict (null is not "omitted")', () => {
    const result = calculateVerdict(52, null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Defects must be a list.');
    expect(result.verdict).toBeUndefined();
  });

  test('invalid sample size is still reported when defects are omitted', () => {
    const result = calculateVerdict(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Sample size must be a whole number of 1 or more.');
  });
});
