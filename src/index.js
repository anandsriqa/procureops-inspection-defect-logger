// index.js - the terminal menu of the Inspection Defect Logger.
// This file only asks questions and shows answers.
// All checking (validation) and the verdict calculation are done by
// inspection.js and verdict.js. We reuse them and do not copy their rules.

const readline = require('readline');
const { Inspection, normalizeSeverity } = require('./inspection');
const { VALID_SEVERITIES } = require('./verdict');

const MENU = [
  '',
  '===== Inspection Defect Logger =====',
  '1. Start Inspection',
  '2. Record Defect',
  '3. List Defects',
  '4. Show Verdict',
  '5. Exit',
].join('\n');

const NOT_STARTED_MESSAGE = 'No inspection started yet. Choose option 1 first.';
const CANCEL_MESSAGE = 'Cancelled. No defect was recorded.';

// ---------- Small helpers that only build text ----------

function formatDefectList(defects) {
  if (defects.length === 0) {
    return 'No defects recorded yet.';
  }
  const lines = defects.map((d) => `${d.number}. [${d.severity}] ${d.description}`);
  return [`Defects (${defects.length}):`, ...lines].join('\n');
}

function formatVerdict(result) {
  const lines = [
    '===== Inspection Verdict =====',
    `Batch ID    : ${result.batchId}`,
    `Sample size : ${result.sampleSize}`,
    `Critical    : ${result.counts.critical} (limit 0)`,
    `Major       : ${result.counts.major} (limit ${result.limits.major})`,
    `Minor       : ${result.counts.minor} (limit ${result.limits.minor})`,
    `Verdict     : ${result.verdict}`,
  ];
  if (result.reasons.length > 0) {
    lines.push('Reasons:');
    for (const reason of result.reasons) {
      lines.push(`  - ${reason}`);
    }
  }
  return lines.join('\n');
}

// "cancel", " CANCEL ", "Cancel" all mean cancel.
function isCancel(input) {
  return input.trim().toLowerCase() === 'cancel';
}

// ---------- One function for each menu option ----------
// ask(question) gives the typed text, or null when the input has ended.
// print(text) shows text on the screen.

async function handleStart(inspection, ask, print) {
  const batchId = await ask('Batch ID: ');
  if (batchId === null) return;
  const sampleSize = await ask('Sample size (whole number, 1 or more): ');
  if (sampleSize === null) return;

  const hadInspection = inspection.isStarted();
  const result = inspection.startInspection(batchId, sampleSize);
  if (!result.valid) {
    print(`Error: ${result.error}`);
    if (hadInspection) {
      print('Your current inspection was not changed.');
    }
    return;
  }
  print(`Inspection started. Batch ID: ${result.batchId}, Sample size: ${result.sampleSize}`);
  if (hadInspection) {
    print('(The previous inspection and its defects were cleared.)');
  }
}

// Keeps asking until the severity is valid, the user types cancel, or input ends.
// Returns { status: 'ok', text } or { status: 'cancel' } or { status: 'end' }.
async function askSeverity(ask, print) {
  while (true) {
    const input = await ask('Severity (Critical / Major / Minor, or "cancel"): ');
    if (input === null) return { status: 'end' };
    if (isCancel(input)) return { status: 'cancel' };
    if (normalizeSeverity(input) !== null) return { status: 'ok', text: input };
    print(
      `Invalid severity "${input.trim()}". Please enter one of: ` +
        `${VALID_SEVERITIES.join(', ')} (or "cancel").`
    );
  }
}

async function handleRecord(inspection, ask, print) {
  if (!inspection.isStarted()) {
    print(NOT_STARTED_MESSAGE);
    return;
  }

  // Step 1: severity. We do not ask for the description until this is valid.
  const severity = await askSeverity(ask, print);
  if (severity.status === 'end') return;
  if (severity.status === 'cancel') {
    print(CANCEL_MESSAGE);
    return;
  }

  // Step 2: description. Only the description is asked again if it is invalid.
  // The severity is already valid here, so any error from recordDefect
  // can only be about the description.
  while (true) {
    const description = await ask('Short description (or "cancel"): ');
    if (description === null) return;
    if (isCancel(description)) {
      print(CANCEL_MESSAGE);
      return;
    }

    const result = inspection.recordDefect(severity.text, description);
    if (result.valid) {
      print(
        `Defect #${result.defect.number} recorded: ` +
          `[${result.defect.severity}] ${result.defect.description}`
      );
      return;
    }
    print(`Error: ${result.error}`);
  }
}

function handleList(inspection, print) {
  const result = inspection.listDefects();
  print(result.valid ? formatDefectList(result.defects) : NOT_STARTED_MESSAGE);
}

function handleVerdict(inspection, print) {
  if (!inspection.isStarted()) {
    print(NOT_STARTED_MESSAGE);
    return;
  }
  const result = inspection.getVerdict();
  print(result.valid ? formatVerdict(result) : `Error: ${result.error}`);
}

// ---------- The menu loop ----------

async function run(ask, print) {
  const inspection = new Inspection(); // one inspection for the whole session
  print('Welcome to the Inspection Defect Logger.');

  while (true) {
    print(MENU);
    const choice = await ask('Choose an option (1-5): ');
    if (choice === null) {
      print('\nInput ended. Goodbye!');
      return;
    }

    switch (choice.trim()) {
      case '1':
        await handleStart(inspection, ask, print);
        break;
      case '2':
        await handleRecord(inspection, ask, print);
        break;
      case '3':
        handleList(inspection, print);
        break;
      case '4':
        handleVerdict(inspection, print);
        break;
      case '5':
        print('Goodbye!');
        return;
      default:
        print('Invalid choice. Please type a number from 1 to 5.');
    }
  }
}

// ---------- Reading from the keyboard or from piped input ----------
// With piped input all lines arrive at once. We save them in a queue and
// hand them out one by one. When the input ends, ask() gives null.

function createAsk(rl, output) {
  const savedLines = [];
  const waiting = [];
  let closed = false;

  rl.on('line', (line) => {
    if (waiting.length > 0) {
      waiting.shift()(line);
    } else {
      savedLines.push(line);
    }
  });

  rl.on('close', () => {
    closed = true;
    while (waiting.length > 0) {
      waiting.shift()(null);
    }
  });

  return function ask(question) {
    output.write(question);
    if (savedLines.length > 0) return Promise.resolve(savedLines.shift());
    if (closed) return Promise.resolve(null);
    return new Promise((resolve) => waiting.push(resolve));
  };
}

function main() {
  const rl = readline.createInterface({ input: process.stdin });
  const ask = createAsk(rl, process.stdout);

  run(ask, console.log)
    .catch((error) => {
      console.error(`Unexpected error: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => rl.close()); // lets the program end by itself
}

// Start the app only when this file is run directly (npm start).
// When the tests require() this file, nothing starts.
if (require.main === module) {
  main();
}

module.exports = { run, formatDefectList, formatVerdict };
