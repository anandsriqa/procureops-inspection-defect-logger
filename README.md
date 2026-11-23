# Inspection Defect Logger

A simple command-line app (Node.js) that records inspection defects and calculates an ACCEPT or REJECT verdict. Built for the ProcureOps India Pvt. Ltd. practical assignment.

> Work in progress. The app and its tests work. The final README (full installation notes) will be completed in a later step.

## Requirements

- Node.js (developed with v24)
- npm

## Install

```
npm install
```

## Run the app

```
npm start
```

You will see a menu:

```
1. Start Inspection
2. Record Defect
3. List Defects
4. Show Verdict
5. Exit
```

Type the option number and press Enter.

| Option | What it does |
|---|---|
| 1. Start Inspection | Asks for a Batch ID (text) and a Sample Size (whole number, 1 or more). Starting again replaces the current inspection and clears its defects. |
| 2. Record Defect | Asks for a severity (`Critical`, `Major` or `Minor`, any letter case) and a short description (1 to 100 characters). Wrong input is asked again. Type `cancel` to go back to the menu. |
| 3. List Defects | Shows all defects of the current inspection, in order. |
| 4. Show Verdict | Shows Batch ID, sample size, defect counts, limits and the final ACCEPT or REJECT. |
| 5. Exit | Closes the app. |

If the input ends suddenly, the app says goodbye and closes. On Windows press Ctrl+Z then Enter to end input. Ctrl+C stops the app at once.

### Example session

```
Choose an option (1-5): 1
Batch ID: B-101
Sample size (whole number, 1 or more): 52
Inspection started. Batch ID: B-101, Sample size: 52
Choose an option (1-5): 2
Severity (Critical / Major / Minor, or "cancel"): major
Short description (or "cancel"): Cracked seal
Defect #1 recorded: [Major] Cracked seal
Choose an option (1-5): 4
===== Inspection Verdict =====
Batch ID    : B-101
Sample size : 52
Critical    : 0 (limit 0)
Major       : 1 (limit 4)
Minor       : 0 (limit 9)
Verdict     : ACCEPT
```

## Verdict rules

The row with the largest "at least" value that is less than or equal to the sample size is used.

| Sample size at least | Major limit | Minor limit |
|---|---|---|
| 1 | 0 | 1 |
| 16 | 2 | 4 |
| 52 | 4 | 9 |
| 190 | 8 | 17 |
| 720 | 15 | 32 |

REJECT if there is 1 or more Critical defect, or Major defects are more than the Major limit, or Minor defects are more than the Minor limit. Otherwise ACCEPT. Zero defects is ACCEPT. A sample size below 1 is an error and no verdict is calculated.

## Run the tests

```
npm test
```

Tests use Playwright Test (no browser is needed).

## Project structure

```
src/
  index.js        terminal menu (asks questions, shows answers)
  inspection.js   current inspection, input validation
  verdict.js      limits table and ACCEPT / REJECT calculation
tests/
  verdict.spec.js      verdict rules and boundaries
  inspection.spec.js   inspection state and validation
  cli.spec.js          terminal menu, including the real program with piped input
playwright.config.js   test settings
README.md              this file
DECISIONS.md           design decisions and AI notes
AI_TRANSCRIPT.md       record of the AI conversation
```
