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
