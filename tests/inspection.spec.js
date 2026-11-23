const { test, expect } = require('@playwright/test');
const { Inspection, MAX_DESCRIPTION_LENGTH } = require('../src/inspection');

// Helper: a started inspection.
function startedInspection(sampleSize = 52) {
  const inspection = new Inspection();
  const result = inspection.startInspection('B-101', sampleSize);
  expect(result.valid).toBe(true);
  return inspection;
}

// Helper: record n defects of one severity.
function addDefects(inspection, severity, n) {
  for (let i = 1; i <= n; i++) {
    const result = inspection.recordDefect(severity, `${severity} defect ${i}`);
    expect(result.valid).toBe(true);
  }
}

test.describe('Start inspection - normal cases', () => {
  test('valid batch ID and sample size starts an inspection', () => {
    const inspection = new Inspection();
    const result = inspection.startInspection('B-101', 52);
    expect(result).toEqual({ valid: true, batchId: 'B-101', sampleSize: 52 });
    expect(inspection.isStarted()).toBe(true);
  });

  test('batch ID spaces at the start and end are removed', () => {
    const inspection = new Inspection();
    expect(inspection.startInspection('  B-101  ', 52).batchId).toBe('B-101');
  });

  test('sample size typed as text "52" is accepted as 52', () => {
    const inspection = new Inspection();
    const result = inspection.startInspection('B-101', ' 52 ');
    expect(result.valid).toBe(true);
    expect(result.sampleSize).toBe(52);
  });

  test('starting a new inspection clears the old defects', () => {
    const inspection = startedInspection();
    addDefects(inspection, 'Major', 2);
    inspection.startInspection('B-202', 16);
    expect(inspection.listDefects().defects).toEqual([]);
    expect(inspection.batchId).toBe('B-202');
  });
});

test.describe('Start inspection - boundary and invalid input', () => {
  test('sample size 1 is valid', () => {
    expect(new Inspection().startInspection('B-1', 1).valid).toBe(true);
  });

  test('sample size 0 gives a clear error (mandatory scenario 8)', () => {
    const inspection = new Inspection();
    const result = inspection.startInspection('B-1', 0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Sample size must be 1 or more (you entered 0).');
    expect(inspection.isStarted()).toBe(false);
  });

  test('sample size -1 and "-5" give a "1 or more" error', () => {
    expect(new Inspection().startInspection('B-1', -1).error).toContain('1 or more');
    expect(new Inspection().startInspection('B-1', '-5').error).toContain('1 or more');
  });

  test('text "0" gives a "1 or more" error', () => {
    expect(new Inspection().startInspection('B-1', '0').error).toContain('1 or more');
  });

  test('large sample size 5000 is valid', () => {
    expect(new Inspection().startInspection('B-1', 5000).valid).toBe(true);
  });

  const badBatchIds = [
    ['empty text', ''],
    ['only spaces', '   '],
    ['null', null],
    ['undefined', undefined],
    ['a number', 123],
  ];
  for (const [name, value] of badBatchIds) {
    test(`batch ID ${name} gives an error`, () => {
      const inspection = new Inspection();
      const result = inspection.startInspection(value, 52);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Batch ID must not be empty.');
      expect(inspection.isStarted()).toBe(false);
    });
  }

  const badSampleSizes = [
    ['"abc"', 'abc'],
    ['empty text', ''],
    ['only spaces', '   '],
    ['"5.5"', '5.5'],
    ['5.5 as number', 5.5],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['null', null],
    ['undefined', undefined],
    ['"12abc"', '12abc'],
  ];
  for (const [name, value] of badSampleSizes) {
    test(`sample size ${name} gives a "whole number" error`, () => {
      const inspection = new Inspection();
      const result = inspection.startInspection('B-1', value);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('whole number');
      expect(inspection.isStarted()).toBe(false);
    });
  }

  test('invalid start does not change an inspection that is already running', () => {
    const inspection = startedInspection(52);
    addDefects(inspection, 'Major', 2);

    expect(inspection.startInspection('', 16).valid).toBe(false);
    expect(inspection.startInspection('B-999', 0).valid).toBe(false);
    expect(inspection.startInspection('B-999', 'abc').valid).toBe(false);

    expect(inspection.batchId).toBe('B-101');
    expect(inspection.sampleSize).toBe(52);
    expect(inspection.listDefects().defects).toHaveLength(2);
  });
});

test.describe('Record defect', () => {
  test('valid defect is recorded with number, severity and description', () => {
    const inspection = startedInspection();
    const result = inspection.recordDefect('Major', 'Cracked seal');
    expect(result).toEqual({
      valid: true,
      defect: { number: 1, severity: 'Major', description: 'Cracked seal' },
    });
  });

  test('severity is case-insensitive and spaces are removed', () => {
    const inspection = startedInspection();
    expect(inspection.recordDefect('major', 'a').defect.severity).toBe('Major');
    expect(inspection.recordDefect(' CRITICAL ', 'b').defect.severity).toBe('Critical');
    expect(inspection.recordDefect('mInOr', 'c').defect.severity).toBe('Minor');
  });

  test('description spaces at the start and end are removed', () => {
    const inspection = startedInspection();
    expect(inspection.recordDefect('Minor', '  scratch  ').defect.description).toBe('scratch');
  });

  test('description of 1 and exactly 100 characters is valid', () => {
    const inspection = startedInspection();
    expect(inspection.recordDefect('Minor', 'a').valid).toBe(true);
    expect(MAX_DESCRIPTION_LENGTH).toBe(100);
    expect(inspection.recordDefect('Minor', 'a'.repeat(100)).valid).toBe(true);
  });

  test('description of 101 characters gives an error', () => {
    const inspection = startedInspection();
    const result = inspection.recordDefect('Minor', 'a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100 characters');
  });

  const badSeverities = [
    ['misspelled "Mjor"', 'Mjor'],
    ['empty text', ''],
    ['only spaces', '   '],
    ['"Major1"', 'Major1'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 1],
  ];
  for (const [name, value] of badSeverities) {
    test(`severity ${name} gives an error and nothing is saved`, () => {
      const inspection = startedInspection();
      const result = inspection.recordDefect(value, 'some description');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Severity must be Critical, Major or Minor.');
      expect(inspection.listDefects().defects).toHaveLength(0);
    });
  }

  const badDescriptions = [
    ['empty text', ''],
    ['only spaces', '    '],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
  ];
  for (const [name, value] of badDescriptions) {
    test(`description ${name} gives an error and nothing is saved`, () => {
      const inspection = startedInspection();
      const result = inspection.recordDefect('Major', value);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Description must not be empty.');
      expect(inspection.listDefects().defects).toHaveLength(0);
    });
  }

  test('recording a defect before starting an inspection gives an error', () => {
    const result = new Inspection().recordDefect('Major', 'x');
    expect(result).toEqual({ valid: false, error: 'Start an inspection first.' });
  });

  test('a failed defect does not use up a defect number', () => {
    const inspection = startedInspection();
    inspection.recordDefect('Major', 'first');
    inspection.recordDefect('Mjor', 'bad');
    expect(inspection.recordDefect('Minor', 'second').defect.number).toBe(2);
  });
});

test.describe('List defects', () => {
  test('lists all defects in the order they were recorded', () => {
    const inspection = startedInspection();
    inspection.recordDefect('Major', 'first');
    inspection.recordDefect('Minor', 'second');
    inspection.recordDefect('Critical', 'third');
    expect(inspection.listDefects().defects).toEqual([
      { number: 1, severity: 'Major', description: 'first' },
      { number: 2, severity: 'Minor', description: 'second' },
      { number: 3, severity: 'Critical', description: 'third' },
    ]);
  });

  test('a new inspection with no defects gives an empty list', () => {
    expect(startedInspection().listDefects()).toEqual({ valid: true, defects: [] });
  });

  test('listing before starting an inspection gives an error', () => {
    expect(new Inspection().listDefects()).toEqual({
      valid: false,
      error: 'Start an inspection first.',
    });
  });

  test('changing the returned list does not change the stored defects', () => {
    const inspection = startedInspection();
    inspection.recordDefect('Major', 'original');

    const listed = inspection.listDefects().defects;
    listed[0].severity = 'Minor';
    listed[0].description = 'hacked';
    listed.push({ number: 99, severity: 'Critical', description: 'extra' });

    expect(inspection.listDefects().defects).toEqual([
      { number: 1, severity: 'Major', description: 'original' },
    ]);
  });

  test('changing the returned defect from recordDefect does not change stored data', () => {
    const inspection = startedInspection();
    const recorded = inspection.recordDefect('Major', 'original').defect;
    recorded.severity = 'Minor';
    expect(inspection.listDefects().defects[0].severity).toBe('Major');
  });
});

test.describe('Verdict through the inspection (uses calculateVerdict)', () => {
  test('zero defects = ACCEPT', () => {
    const result = startedInspection(52).getVerdict();
    expect(result.valid).toBe(true);
    expect(result.verdict).toBe('ACCEPT');
    expect(result.batchId).toBe('B-101');
    expect(result.sampleSize).toBe(52);
  });

  test('sample 52, 4 major defects = ACCEPT', () => {
    const inspection = startedInspection(52);
    addDefects(inspection, 'Major', 4);
    expect(inspection.getVerdict().verdict).toBe('ACCEPT');
  });

  test('sample 52, 5 major defects = REJECT', () => {
    const inspection = startedInspection(52);
    addDefects(inspection, 'Major', 5);
    expect(inspection.getVerdict().verdict).toBe('REJECT');
  });

  test('sample 51, 4 major defects = REJECT', () => {
    const inspection = startedInspection(51);
    addDefects(inspection, 'Major', 4);
    expect(inspection.getVerdict().verdict).toBe('REJECT');
  });

  test('sample 85, 1 critical defect = REJECT', () => {
    const inspection = startedInspection(85);
    addDefects(inspection, 'Critical', 1);
    expect(inspection.getVerdict().verdict).toBe('REJECT');
  });

  test('sample size given as text "190" with 8 major = ACCEPT', () => {
    const inspection = startedInspection('190');
    addDefects(inspection, 'Major', 8);
    expect(inspection.getVerdict().verdict).toBe('ACCEPT');
  });

  test('severity typed in lowercase still counts in the verdict', () => {
    const inspection = startedInspection(52);
    for (let i = 0; i < 5; i++) {
      inspection.recordDefect('major', `defect ${i}`);
    }
    expect(inspection.getVerdict().verdict).toBe('REJECT');
  });

  test('verdict changes automatically when more defects are recorded', () => {
    const inspection = startedInspection(52);
    addDefects(inspection, 'Major', 4);
    expect(inspection.getVerdict().verdict).toBe('ACCEPT');
    addDefects(inspection, 'Major', 1);
    expect(inspection.getVerdict().verdict).toBe('REJECT');
  });

  test('verdict before starting an inspection gives an error', () => {
    expect(new Inspection().getVerdict()).toEqual({
      valid: false,
      error: 'Start an inspection first.',
    });
  });
});


// ---------------------------------------------------------------------------
// Commit 6: more boundary and equivalence tests.
// ---------------------------------------------------------------------------

// One emoji is 2 UTF-16 units in JavaScript, so its .length is 2.
const EMOJI = String.fromCodePoint(0x1f600);

test.describe('Sample size: largest safe whole number and just above', () => {
  test('Number.MAX_SAFE_INTEGER is valid (number and text)', () => {
    const fromNumber = new Inspection().startInspection('B-1', Number.MAX_SAFE_INTEGER);
    expect(fromNumber).toEqual({ valid: true, batchId: 'B-1', sampleSize: 9007199254740991 });

    const fromText = new Inspection().startInspection('B-1', '9007199254740991');
    expect(fromText.valid).toBe(true);
    expect(fromText.sampleSize).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('Number.MAX_SAFE_INTEGER + 1 gives the "positive safe integer" error', () => {
    const inspection = new Inspection();
    const result = inspection.startInspection('B-1', Number.MAX_SAFE_INTEGER + 1);
    expect(result).toEqual({ valid: false, error: 'Sample size must be a positive safe integer.' });
    expect(inspection.isStarted()).toBe(false);
  });

  test('too big as text ("9007199254740992" and 20 nines) gives the same error', () => {
    for (const text of ['9007199254740992', '99999999999999999999']) {
      const result = new Inspection().startInspection('B-1', text);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Sample size must be a positive safe integer.');
    }
  });

  test('other invalid sizes keep their own messages (not changed by this fix)', () => {
    expect(new Inspection().startInspection('B-1', 'abc').error).toContain('whole number');
    expect(new Inspection().startInspection('B-1', 5.5).error).toContain('whole number');
    expect(new Inspection().startInspection('B-1', Infinity).error).toContain('whole number');
    expect(new Inspection().startInspection('B-1', 0).error).toContain('1 or more');
  });

  test('a failed oversized restart keeps the current inspection', () => {
    const inspection = startedInspection(52);
    addDefects(inspection, 'Major', 2);
    expect(inspection.startInspection('B-2', Number.MAX_SAFE_INTEGER + 1).valid).toBe(false);
    expect(inspection.batchId).toBe('B-101');
    expect(inspection.sampleSize).toBe(52);
    expect(inspection.listDefects().defects).toHaveLength(2);
  });

  test('at Number.MAX_SAFE_INTEGER the last table row is used (15 major = ACCEPT, 16 = REJECT)', () => {
    const inspection = startedInspection(Number.MAX_SAFE_INTEGER);
    addDefects(inspection, 'Major', 15);
    expect(inspection.getVerdict().verdict).toBe('ACCEPT');
    addDefects(inspection, 'Major', 1);
    expect(inspection.getVerdict().verdict).toBe('REJECT');
  });
});

test.describe('Sample size text formats (documented decision)', () => {
  const validFormats = [
    ['"52"', '52', 52],
    ['"007" (leading zeros are allowed)', '007', 7],
  ];
  for (const [name, text, expected] of validFormats) {
    test(`${name} is valid and becomes ${expected}`, () => {
      const result = new Inspection().startInspection('B-1', text);
      expect(result.valid).toBe(true);
      expect(result.sampleSize).toBe(expected);
    });
  }

  const invalidFormats = [
    ['"52.0" (decimal point)', '52.0'],
    ['"+52" (plus sign)', '+52'],
    ['"1e3" (scientific notation)', '1e3'],
  ];
  for (const [name, text] of invalidFormats) {
    test(`${name} is invalid with the "whole number" message`, () => {
      const inspection = new Inspection();
      const result = inspection.startInspection('B-1', text);
      expect(result).toEqual({
        valid: false,
        error: 'Sample size must be a whole number, for example 52.',
      });
      expect(inspection.isStarted()).toBe(false);
    });
  }
});

test.describe('Description length: spaces, inner spaces and emoji', () => {
  test('exactly 100 characters with spaces around is valid and saved without the spaces', () => {
    const inspection = startedInspection();
    const result = inspection.recordDefect('Minor', '  ' + 'a'.repeat(100) + '  ');
    expect(result.valid).toBe(true);
    expect(result.defect.description).toHaveLength(100);
  });

  test('101 characters with spaces around is invalid (spaces are removed first, then counted)', () => {
    const result = startedInspection().recordDefect('Minor', '  ' + 'a'.repeat(101) + '  ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Description must be 100 characters or fewer.');
  });

  test('spaces inside the text count: 100 is valid, 101 is invalid', () => {
    const inspection = startedInspection();
    expect(inspection.recordDefect('Minor', 'a' + ' '.repeat(98) + 'b').valid).toBe(true);
    expect(inspection.recordDefect('Minor', 'a' + ' '.repeat(99) + 'b').valid).toBe(false);
  });

  test('length is counted in UTF-16 units: one emoji counts as 2', () => {
    expect(EMOJI).toHaveLength(2);
    const result = startedInspection().recordDefect('Minor', EMOJI);
    expect(result.valid).toBe(true);
    expect(result.defect.description).toBe(EMOJI);
  });

  test('50 emoji (100 units) is valid, 51 emoji (102 units) is invalid', () => {
    const inspection = startedInspection();
    expect(inspection.recordDefect('Minor', EMOJI.repeat(50)).valid).toBe(true);
    const tooLong = inspection.recordDefect('Minor', EMOJI.repeat(51));
    expect(tooLong.valid).toBe(false);
    expect(tooLong.error).toBe('Description must be 100 characters or fewer.');
  });

  test('49 emoji + "ab" (100 units) is valid, 49 emoji + "abc" (101 units) is invalid', () => {
    const inspection = startedInspection();
    expect(inspection.recordDefect('Minor', EMOJI.repeat(49) + 'ab').valid).toBe(true);
    expect(inspection.recordDefect('Minor', EMOJI.repeat(49) + 'abc').valid).toBe(false);
  });

  test('emoji with spaces around: spaces are removed before counting', () => {
    const result = startedInspection().recordDefect('Minor', '  ' + EMOJI.repeat(50) + '  ');
    expect(result.valid).toBe(true);
    expect(result.defect.description).toBe(EMOJI.repeat(50));
  });
});

test.describe('Batch ID text that looks like a number or a command word', () => {
  test('"123" is a valid Batch ID and stays text', () => {
    const result = new Inspection().startInspection('123', 52);
    expect(result.valid).toBe(true);
    expect(result.batchId).toBe('123');
    expect(typeof result.batchId).toBe('string');
  });

  test('"cancel" is a valid Batch ID (cancel is special only for severity and description in the menu)', () => {
    const result = new Inspection().startInspection('cancel', 52);
    expect(result).toEqual({ valid: true, batchId: 'cancel', sampleSize: 52 });
  });

  test('" CANCEL " is a valid Batch ID and keeps its letters, only spaces are removed', () => {
    expect(new Inspection().startInspection(' CANCEL ', 52).batchId).toBe('CANCEL');
  });
});

test.describe('Severity with a space inside', () => {
  for (const text of ['Ma jor', ' Ma jor ', 'Cri tical', 'Mi nor']) {
    test(`"${text}" is invalid and nothing is saved`, () => {
      const inspection = startedInspection();
      const result = inspection.recordDefect(text, 'some description');
      expect(result).toEqual({
        valid: false,
        error: 'Severity must be Critical, Major or Minor.',
      });
      expect(inspection.listDefects().defects).toHaveLength(0);
    });
  }
});
