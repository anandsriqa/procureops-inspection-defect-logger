const path = require('path');
const { spawnSync } = require('child_process');
const { test, expect } = require('@playwright/test');
const { run, formatDefectList, formatVerdict } = require('../src/index');

// ---------- Helpers ----------

// Runs the menu with a list of typed lines. No real keyboard needed.
// After the lines are used up, ask() gives null (= input ended).
async function runScripted(lines) {
  const remaining = [...lines];
  const printed = [];
  const prompts = [];

  const ask = async (question) => {
    prompts.push(question);
    printed.push(question);
    return remaining.length > 0 ? remaining.shift() : null;
  };
  const print = (text) => printed.push(text);

  await run(ask, print);
  return { output: printed.join('\n'), prompts, unused: remaining };
}

function count(text, part) {
  return text.split(part).length - 1;
}

function verdictOf(output) {
  const match = output.match(/Verdict\s+: (ACCEPT|REJECT)/);
  return match ? match[1] : null;
}

// Typed lines for one full inspection: start, record defects, show verdict, exit.
function fullInspection(sampleSize, defects) {
  const lines = ['1', 'B-101', String(sampleSize)];
  let n = 0;
  for (const [severity, howMany] of defects) {
    for (let i = 0; i < howMany; i++) {
      n++;
      lines.push('2', severity, `${severity} defect ${n}`);
    }
  }
  lines.push('4', '5');
  return lines;
}

// Runs the real program (node src/index.js) with piped input, like npm start.
function runProcess(input) {
  return spawnSync(process.execPath, ['src/index.js'], {
    cwd: path.join(__dirname, '..'),
    input,
    encoding: 'utf8',
    timeout: 10000,
  });
}

// ---------- Menu ----------

test.describe('Menu', () => {
  test('welcome text and all 5 options are shown', async () => {
    const { output } = await runScripted(['5']);
    expect(output).toContain('Welcome to the Inspection Defect Logger.');
    for (const option of ['1. Start Inspection', '2. Record Defect', '3. List Defects', '4. Show Verdict', '5. Exit']) {
      expect(output).toContain(option);
    }
  });

  const badChoices = [['6', '6'], ['0', '0'], ['empty line', ''], ['text "abc"', 'abc'], ['"1.5"', '1.5']];
  for (const [name, value] of badChoices) {
    test(`invalid choice ${name} shows a message and the menu again`, async () => {
      const { output, unused } = await runScripted([value, '5']);
      expect(output).toContain('Invalid choice. Please type a number from 1 to 5.');
      expect(count(output, '===== Inspection Defect Logger =====')).toBe(2);
      expect(output).toContain('Goodbye!');
      expect(unused).toEqual([]);
    });
  }

  test('spaces around the choice are ignored', async () => {
    const { output } = await runScripted(['  3  ', '5']);
    expect(output).toContain('No inspection started yet. Choose option 1 first.');
    expect(output).not.toContain('Invalid choice');
  });

  test('option 5 says Goodbye and ends without reading more lines', async () => {
    const { output, unused } = await runScripted(['5', '1', 'ignored']);
    expect(output).toContain('Goodbye!');
    expect(unused).toEqual(['1', 'ignored']);
  });
});

// ---------- Input ending (EOF) ----------

test.describe('Input ends unexpectedly (like Ctrl+D / Ctrl+Z)', () => {
  test('at the main menu', async () => {
    const { output } = await runScripted([]);
    expect(output).toContain('Input ended. Goodbye!');
  });

  test('after the Batch ID', async () => {
    const { output } = await runScripted(['1', 'B-1']);
    expect(output).toContain('Input ended. Goodbye!');
    expect(output).not.toContain('Inspection started');
  });

  test('at the severity question', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2']);
    expect(output).toContain('Input ended. Goodbye!');
  });

  test('in the middle of severity retry', async () => {
    const { output, prompts } = await runScripted(['1', 'B-1', '52', '2', 'Mjor']);
    expect(output).toContain('Invalid severity "Mjor"');
    expect(output).toContain('Input ended. Goodbye!');
    expect(prompts.some((p) => p.startsWith('Short description'))).toBe(false);
  });

  test('in the middle of description retry', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Major', '']);
    expect(output).toContain('Description must not be empty.');
    expect(output).toContain('Input ended. Goodbye!');
  });
});

// ---------- Start Inspection ----------

test.describe('Start Inspection', () => {
  test('valid input starts the inspection', async () => {
    const { output } = await runScripted(['1', '  B-101  ', '52', '5']);
    expect(output).toContain('Inspection started. Batch ID: B-101, Sample size: 52');
  });

  test('sample size 1 is valid', async () => {
    const { output } = await runScripted(['1', 'B-1', '1', '5']);
    expect(output).toContain('Inspection started. Batch ID: B-1, Sample size: 1');
  });

  const badStarts = [
    ['empty Batch ID', '', '52', 'Batch ID must not be empty.'],
    ['Batch ID with only spaces', '   ', '52', 'Batch ID must not be empty.'],
    ['sample size "abc"', 'B-1', 'abc', 'Sample size must be a whole number'],
    ['sample size "5.5"', 'B-1', '5.5', 'Sample size must be a whole number'],
    ['empty sample size', 'B-1', '', 'Sample size must be a whole number'],
    ['sample size 0', 'B-1', '0', 'Sample size must be 1 or more (you entered 0).'],
    ['sample size -3', 'B-1', '-3', 'Sample size must be 1 or more (you entered -3).'],
  ];
  for (const [name, batchId, size, expected] of badStarts) {
    test(`${name} shows a clear error`, async () => {
      const { output } = await runScripted(['1', batchId, size, '5']);
      expect(output).toContain(`Error: ${expected}`);
      expect(output).not.toContain('Inspection started');
    });
  }

  test('a failed start leaves no inspection behind', async () => {
    const { output } = await runScripted(['1', 'B-1', '0', '2', '3', '4', '5']);
    expect(count(output, 'No inspection started yet. Choose option 1 first.')).toBe(3);
  });

  test('starting again replaces the old inspection and clears its defects', async () => {
    const { output } = await runScripted([
      '1', 'B-1', '52', '2', 'Major', 'old defect',
      '1', 'B-2', '16', '3', '5',
    ]);
    expect(output).toContain('(The previous inspection and its defects were cleared.)');
    expect(output).toContain('Inspection started. Batch ID: B-2, Sample size: 16');
    expect(output.split('Inspection started. Batch ID: B-2')[1]).toContain('No defects recorded yet.');
  });

  test('a failed restart keeps the current inspection and its defects', async () => {
    const { output } = await runScripted([
      '1', 'B-1', '52', '2', 'Major', 'old defect',
      '1', 'B-2', '0', '3', '5',
    ]);
    expect(output).toContain('Your current inspection was not changed.');
    expect(output.split('Your current inspection was not changed.')[1]).toContain('1. [Major] old defect');
  });
});

// ---------- Record Defect ----------

test.describe('Record Defect', () => {
  test('before starting an inspection: message and no questions asked', async () => {
    const { output, prompts } = await runScripted(['2', '5']);
    expect(output).toContain('No inspection started yet. Choose option 1 first.');
    expect(prompts.some((p) => p.startsWith('Severity'))).toBe(false);
    expect(prompts.some((p) => p.startsWith('Short description'))).toBe(false);
  });

  test('valid defect is recorded and shown', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Major', 'Cracked seal', '5']);
    expect(output).toContain('Defect #1 recorded: [Major] Cracked seal');
  });

  test('severity in lowercase and with spaces is accepted', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', ' critical ', 'Leak', '5']);
    expect(output).toContain('Defect #1 recorded: [Critical] Leak');
  });

  test('description of exactly 100 characters is accepted', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Minor', 'a'.repeat(100), '5']);
    expect(output).toContain('Defect #1 recorded: [Minor]');
  });
});

// ---------- Invalid severity retry ----------

test.describe('Invalid severity: ask again, no description yet', () => {
  test('asks for severity again until it is valid, then asks for the description once', async () => {
    const { output, prompts, unused } = await runScripted([
      '1', 'B-1', '52',
      '2', 'Mjor', 'Urgent', 'major', 'Cracked seal',
      '5',
    ]);
    expect(output).toContain('Invalid severity "Mjor". Please enter one of: Critical, Major, Minor (or "cancel").');
    expect(output).toContain('Invalid severity "Urgent".');
    expect(output).toContain('Defect #1 recorded: [Major] Cracked seal');

    const severityPrompts = prompts.filter((p) => p.startsWith('Severity')).length;
    const descriptionPrompts = prompts.filter((p) => p.startsWith('Short description')).length;
    expect(severityPrompts).toBe(3);
    expect(descriptionPrompts).toBe(1);

    // The description question came only after the last severity question.
    const lastSeverity = prompts.map((p, i) => (p.startsWith('Severity') ? i : -1)).reduce((a, b) => Math.max(a, b));
    const firstDescription = prompts.findIndex((p) => p.startsWith('Short description'));
    expect(firstDescription).toBeGreaterThan(lastSeverity);
    expect(unused).toEqual([]);
  });

  test('empty severity is also asked again', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', '', '  ', 'Minor', 'Scratch', '5']);
    expect(count(output, 'Invalid severity')).toBe(2);
    expect(output).toContain('Defect #1 recorded: [Minor] Scratch');
  });

  test('a wrong severity never saves a defect', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Mjor', 'cancel', '3', '5']);
    expect(output).toContain('No defects recorded yet.');
  });
});

// ---------- Invalid description retry ----------

test.describe('Invalid description: ask only the description again', () => {
  test('empty, spaces-only and 101-character descriptions are asked again', async () => {
    const { output, prompts, unused } = await runScripted([
      '1', 'B-1', '52',
      '2', 'Minor', '', '   ', 'x'.repeat(101), 'Loose screw',
      '5',
    ]);
    expect(count(output, 'Error: Description must not be empty.')).toBe(2);
    expect(output).toContain('Error: Description must be 100 characters or fewer.');
    expect(output).toContain('Defect #1 recorded: [Minor] Loose screw');

    expect(prompts.filter((p) => p.startsWith('Severity')).length).toBe(1);
    expect(prompts.filter((p) => p.startsWith('Short description')).length).toBe(4);
    expect(unused).toEqual([]);
  });

  test('only one defect is saved after retries', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Major', '', 'real one', '3', '5']);
    expect(output).toContain('Defects (1):');
    expect(output).toContain('1. [Major] real one');
  });
});

// ---------- Cancel ----------

test.describe('Cancel', () => {
  test('cancel at the first severity question', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'cancel', '3', '5']);
    expect(output).toContain('Cancelled. No defect was recorded.');
    expect(output).toContain('No defects recorded yet.');
  });

  test('cancel is case-insensitive and ignores spaces', async () => {
    for (const word of ['CANCEL', 'Cancel', '  cancel  ', ' CaNcEl ']) {
      const { output } = await runScripted(['1', 'B-1', '52', '2', word, '5']);
      expect(output).toContain('Cancelled. No defect was recorded.');
    }
  });

  test('cancel in the middle of severity retry', async () => {
    const { output, prompts } = await runScripted(['1', 'B-1', '52', '2', 'Mjor', ' Cancel ', '5']);
    expect(output).toContain('Invalid severity "Mjor"');
    expect(output).toContain('Cancelled. No defect was recorded.');
    expect(prompts.some((p) => p.startsWith('Short description'))).toBe(false);
  });

  test('cancel at the first description question: no defect is recorded', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Major', 'cancel', '3', '5']);
    expect(output).toContain('Cancelled. No defect was recorded.');
    expect(output).toContain('No defects recorded yet.');
  });

  test('cancel in the middle of description retry', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Major', '', 'CANCEL', '3', '5']);
    expect(output).toContain('Error: Description must not be empty.');
    expect(output).toContain('Cancelled. No defect was recorded.');
    expect(output).toContain('No defects recorded yet.');
  });

  test('after cancel we are back at the main menu and the next option works', async () => {
    const { output, unused } = await runScripted([
      '1', 'B-1', '52', '2', 'cancel',
      '2', 'Minor', 'Scratch',
      '3', '5',
    ]);
    expect(output).toContain('Defect #1 recorded: [Minor] Scratch');
    expect(output).toContain('Defects (1):');
    expect(unused).toEqual([]);
  });

  test('the word cancel is not saved as a defect', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Major', 'cancel', '3', '5']);
    expect(output).not.toContain('[Major] cancel');
  });
});

// ---------- List Defects ----------

test.describe('List Defects', () => {
  test('before starting an inspection', async () => {
    const { output } = await runScripted(['3', '5']);
    expect(output).toContain('No inspection started yet. Choose option 1 first.');
  });

  test('inspection started but no defects', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '3', '5']);
    expect(output).toContain('No defects recorded yet.');
  });

  test('defects are listed in the order they were recorded', async () => {
    const { output } = await runScripted([
      '1', 'B-1', '52',
      '2', 'Major', 'first',
      '2', 'Minor', 'second',
      '2', 'Critical', 'third',
      '3', '5',
    ]);
    expect(output).toContain('Defects (3):');
    const a = output.indexOf('1. [Major] first');
    const b = output.indexOf('2. [Minor] second');
    const c = output.indexOf('3. [Critical] third');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

// ---------- Show Verdict ----------

test.describe('Show Verdict', () => {
  test('before starting an inspection', async () => {
    const { output } = await runScripted(['4', '5']);
    expect(output).toContain('No inspection started yet. Choose option 1 first.');
    expect(verdictOf(output)).toBeNull();
  });

  test('shows Batch ID, sample size, counts, limits and verdict', async () => {
    const { output } = await runScripted(fullInspection(52, [['Major', 2], ['Minor', 3]]));
    expect(output).toContain('Batch ID    : B-101');
    expect(output).toContain('Sample size : 52');
    expect(output).toContain('Critical    : 0 (limit 0)');
    expect(output).toContain('Major       : 2 (limit 4)');
    expect(output).toContain('Minor       : 3 (limit 9)');
    expect(verdictOf(output)).toBe('ACCEPT');
    expect(output).not.toContain('Reasons:');
  });

  test('REJECT shows the reasons', async () => {
    const { output } = await runScripted(fullInspection(52, [['Critical', 1], ['Major', 5]]));
    expect(verdictOf(output)).toBe('REJECT');
    expect(output).toContain('Reasons:');
    expect(output).toContain('  - Critical defects: 1 (must be 0)');
    expect(output).toContain('  - Major defects: 5 (limit 4)');
  });
});

// ---------- Repeated operations ----------

test.describe('Repeated menu operations in one session', () => {
  test('state is kept and the verdict changes automatically', async () => {
    const { output, unused } = await runScripted([
      '1', 'B-7', '52',
      '4',                                  // zero defects -> ACCEPT
      '2', 'Major', 'd1', '2', 'Major', 'd2', '2', 'Major', 'd3', '2', 'Major', 'd4',
      '3', '3',                             // list twice, same result
      '4',                                  // 4 major -> ACCEPT
      '2', 'Major', 'd5',
      '4',                                  // 5 major -> REJECT
      '1', 'B-8', '16',                     // restart
      '3', '4',                             // empty list, ACCEPT again
      '5',
    ]);
    const verdicts = [...output.matchAll(/Verdict\s+: (ACCEPT|REJECT)/g)].map((m) => m[1]);
    expect(verdicts).toEqual(['ACCEPT', 'ACCEPT', 'REJECT', 'ACCEPT']);
    expect(count(output, 'Defects (4):')).toBe(2);
    expect(output).toContain('Defect #5 recorded: [Major] d5');
    expect(output).toContain('Batch ID    : B-8');
    expect(unused).toEqual([]);
  });

  test('the menu is shown again after every operation', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '3', '4', '5']);
    expect(count(output, '===== Inspection Defect Logger =====')).toBe(4);
  });
});

// ---------- The 8 mandatory assignment scenarios, through the menu ----------

test.describe('Mandatory scenarios through the terminal menu', () => {
  test('1. sample 52, 4 major defects = ACCEPT', async () => {
    const { output } = await runScripted(fullInspection(52, [['Major', 4]]));
    expect(verdictOf(output)).toBe('ACCEPT');
  });

  test('2. sample 52, 5 major defects = REJECT', async () => {
    const { output } = await runScripted(fullInspection(52, [['Major', 5]]));
    expect(verdictOf(output)).toBe('REJECT');
  });

  test('3. sample 51, 4 major defects = REJECT', async () => {
    const { output } = await runScripted(fullInspection(51, [['Major', 4]]));
    expect(verdictOf(output)).toBe('REJECT');
  });

  test('4. sample 189, 8 major defects = REJECT', async () => {
    const { output } = await runScripted(fullInspection(189, [['Major', 8]]));
    expect(verdictOf(output)).toBe('REJECT');
  });

  test('5. sample 190, 8 major defects = ACCEPT', async () => {
    const { output } = await runScripted(fullInspection(190, [['Major', 8]]));
    expect(verdictOf(output)).toBe('ACCEPT');
  });

  test('6. sample 85, 1 critical defect = REJECT', async () => {
    const { output } = await runScripted(fullInspection(85, [['Critical', 1]]));
    expect(verdictOf(output)).toBe('REJECT');
  });

  test('7. sample 52, zero defects = ACCEPT', async () => {
    const { output } = await runScripted(fullInspection(52, []));
    expect(verdictOf(output)).toBe('ACCEPT');
  });

  test('8. sample 0 = clear validation error and no verdict', async () => {
    const { output } = await runScripted(['1', 'B-101', '0', '4', '5']);
    expect(output).toContain('Error: Sample size must be 1 or more (you entered 0).');
    expect(output).toContain('No inspection started yet. Choose option 1 first.');
    expect(verdictOf(output)).toBeNull();
  });
});

// ---------- Text helpers ----------

test.describe('formatDefectList and formatVerdict', () => {
  test('formatDefectList with no defects', () => {
    expect(formatDefectList([])).toBe('No defects recorded yet.');
  });

  test('formatDefectList with defects', () => {
    const text = formatDefectList([
      { number: 1, severity: 'Major', description: 'a' },
      { number: 2, severity: 'Minor', description: 'b' },
    ]);
    expect(text).toBe('Defects (2):\n1. [Major] a\n2. [Minor] b');
  });

  test('formatVerdict ACCEPT has no reasons', () => {
    const text = formatVerdict({
      batchId: 'B-1', sampleSize: 52, verdict: 'ACCEPT', reasons: [],
      counts: { critical: 0, major: 1, minor: 2 }, limits: { major: 4, minor: 9 },
    });
    expect(text).toContain('Verdict     : ACCEPT');
    expect(text).not.toContain('Reasons:');
  });

  test('formatVerdict REJECT lists the reasons', () => {
    const text = formatVerdict({
      batchId: 'B-1', sampleSize: 52, verdict: 'REJECT', reasons: ['Major defects: 5 (limit 4)'],
      counts: { critical: 0, major: 5, minor: 0 }, limits: { major: 4, minor: 9 },
    });
    expect(text).toContain('Verdict     : REJECT');
    expect(text).toContain('Reasons:\n  - Major defects: 5 (limit 4)');
  });
});

// ---------- The real program with piped input (like npm start) ----------

test.describe('Real program: node src/index.js with piped input', () => {
  test('option 5 exits cleanly with exit code 0', () => {
    const result = runProcess('5\n');
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('===== Inspection Defect Logger =====');
    expect(result.stdout).toContain('Goodbye!');
  });

  test('a full session with many lines piped at once gives the right verdict', () => {
    const lines = fullInspection(52, [['Major', 4]]).join('\n') + '\n';
    const result = runProcess(lines);
    expect(result.status).toBe(0);
    expect(verdictOf(result.stdout)).toBe('ACCEPT');
    expect(result.stdout).toContain('Defect #4 recorded: [Major] Major defect 4');
  });

  test('REJECT through the real program (sample 52, 5 major)', () => {
    const result = runProcess(fullInspection(52, [['Major', 5]]).join('\n') + '\n');
    expect(result.status).toBe(0);
    expect(verdictOf(result.stdout)).toBe('REJECT');
  });

  test('input that ends without option 5 does not hang and exits with code 0', () => {
    const result = runProcess('1\nB-1\n');
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Input ended. Goodbye!');
  });

  test('completely empty input does not hang and exits with code 0', () => {
    const result = runProcess('');
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Input ended. Goodbye!');
  });

  test('Windows-style line endings (CRLF) work', () => {
    const lines = fullInspection(52, [['Major', 1]]).join('\r\n') + '\r\n';
    const result = runProcess(lines);
    expect(result.status).toBe(0);
    expect(verdictOf(result.stdout)).toBe('ACCEPT');
  });

  test('a hidden BOM character at the start (PowerShell pipe) is ignored', () => {
    const result = runProcess('\uFEFF1\nB-1\n52\n4\n5\n');
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('Invalid choice');
    expect(verdictOf(result.stdout)).toBe('ACCEPT');
  });

  test('invalid severity retry and cancel work through the real program', () => {
    const result = runProcess('1\nB-1\n52\n2\nMjor\nmajor\n\nreal defect\n2\nMinor\ncancel\n3\n5\n');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Invalid severity "Mjor"');
    expect(result.stdout).toContain('Error: Description must not be empty.');
    expect(result.stdout).toContain('Defect #1 recorded: [Major] real defect');
    expect(result.stdout).toContain('Cancelled. No defect was recorded.');
    expect(result.stdout).toContain('Defects (1):');
  });
});


// ---------------------------------------------------------------------------
// Commit 6: more menu inputs and real-process scenarios.
// ---------------------------------------------------------------------------

const EMOJI = String.fromCodePoint(0x1f600);

test.describe('More invalid menu choices', () => {
  const moreBadChoices = [['"-1"', '-1'], ['"01" (leading zero)', '01'], ['"10"', '10']];
  for (const [name, value] of moreBadChoices) {
    test(`invalid choice ${name} shows a message and the menu again`, async () => {
      const { output, unused } = await runScripted([value, '5']);
      expect(output).toContain('Invalid choice. Please type a number from 1 to 5.');
      expect(count(output, '===== Inspection Defect Logger =====')).toBe(2);
      expect(output).toContain('Goodbye!');
      expect(unused).toEqual([]);
    });
  }
});

test.describe('Sample size formats and limits through the menu', () => {
  test('"52" is valid', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '5']);
    expect(output).toContain('Inspection started. Batch ID: B-1, Sample size: 52');
  });

  test('"007" is valid and shown as 7', async () => {
    const { output } = await runScripted(['1', 'B-1', '007', '5']);
    expect(output).toContain('Inspection started. Batch ID: B-1, Sample size: 7');
  });

  for (const text of ['52.0', '+52', '1e3']) {
    test(`"${text}" shows the "whole number" error`, async () => {
      const { output } = await runScripted(['1', 'B-1', text, '5']);
      expect(output).toContain('Error: Sample size must be a whole number, for example 52.');
      expect(output).not.toContain('Inspection started');
    });
  }

  test('9007199254740991 (largest safe whole number) is valid', async () => {
    const { output } = await runScripted(['1', 'B-1', '9007199254740991', '5']);
    expect(output).toContain('Inspection started. Batch ID: B-1, Sample size: 9007199254740991');
  });

  test('9007199254740992 shows the "positive safe integer" error', async () => {
    const { output } = await runScripted(['1', 'B-1', '9007199254740992', '4', '5']);
    expect(output).toContain('Error: Sample size must be a positive safe integer.');
    expect(output).not.toContain('Inspection started');
    expect(verdictOf(output)).toBeNull();
  });
});

test.describe('Batch IDs "123" and "cancel" through the menu', () => {
  test('"123" is a normal Batch ID', async () => {
    const { output } = await runScripted(['1', '123', '52', '5']);
    expect(output).toContain('Inspection started. Batch ID: 123, Sample size: 52');
  });

  test('"cancel" is a normal Batch ID (not a command at the Batch ID question)', async () => {
    const { output, unused } = await runScripted(['1', 'cancel', '52', '5']);
    expect(output).toContain('Inspection started. Batch ID: cancel, Sample size: 52');
    expect(unused).toEqual([]);
  });

  test('" Cancel " is a Batch ID too, spaces removed', async () => {
    const { output } = await runScripted(['1', ' Cancel ', '52', '5']);
    expect(output).toContain('Inspection started. Batch ID: Cancel, Sample size: 52');
  });

  test('with Batch ID "cancel", typing cancel at the severity question still cancels', async () => {
    const { output } = await runScripted(['1', 'cancel', '52', '2', 'cancel', '3', '5']);
    expect(output).toContain('Cancelled. No defect was recorded.');
    expect(output).toContain('No defects recorded yet.');
  });
});

test.describe('Severity "Ma jor" through the menu', () => {
  test('is asked again, then the description is asked once', async () => {
    const { output, prompts, unused } = await runScripted([
      '1', 'B-1', '52',
      '2', 'Ma jor', 'Major', 'Loose part',
      '5',
    ]);
    expect(output).toContain('Invalid severity "Ma jor". Please enter one of: Critical, Major, Minor (or "cancel").');
    expect(output).toContain('Defect #1 recorded: [Major] Loose part');
    expect(prompts.filter((p) => p.startsWith('Severity')).length).toBe(2);
    expect(prompts.filter((p) => p.startsWith('Short description')).length).toBe(1);
    expect(unused).toEqual([]);
  });
});

test.describe('Description with emoji and spaces through the menu', () => {
  test('51 emoji is asked again, then 50 emoji is recorded', async () => {
    const { output, prompts } = await runScripted([
      '1', 'B-1', '52',
      '2', 'Minor', EMOJI.repeat(51), EMOJI.repeat(50),
      '3', '5',
    ]);
    expect(output).toContain('Error: Description must be 100 characters or fewer.');
    expect(output).toContain('Defect #1 recorded: [Minor] ' + EMOJI.repeat(50));
    expect(prompts.filter((p) => p.startsWith('Severity')).length).toBe(1);
    expect(prompts.filter((p) => p.startsWith('Short description')).length).toBe(2);
  });

  test('100 characters with spaces around is recorded', async () => {
    const { output } = await runScripted(['1', 'B-1', '52', '2', 'Minor', '  ' + 'a'.repeat(100) + '  ', '5']);
    expect(output).toContain('Defect #1 recorded: [Minor] ' + 'a'.repeat(100));
  });
});

test.describe('Real program: mandatory scenarios 6 and 8', () => {
  test('6. sample 85, 1 critical defect = REJECT through the real program', () => {
    const result = runProcess(fullInspection(85, [['Critical', 1]]).join('\n') + '\n');
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(verdictOf(result.stdout)).toBe('REJECT');
    expect(result.stdout).toContain('Sample size : 85');
    expect(result.stdout).toContain('Critical    : 1 (limit 0)');
    expect(result.stdout).toContain('  - Critical defects: 1 (must be 0)');
  });

  test('8. sample 0 = clear validation error and no verdict through the real program', () => {
    const result = runProcess('1\nB-101\n0\n4\n5\n');
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Error: Sample size must be 1 or more (you entered 0).');
    expect(result.stdout).toContain('No inspection started yet. Choose option 1 first.');
    expect(verdictOf(result.stdout)).toBeNull();
    expect(result.stdout).not.toContain('Inspection started');
  });
});
