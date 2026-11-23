# Inspection Defect Logger

A command-line application (Node.js) that records the defects found during a product inspection and decides automatically whether the inspected batch is **ACCEPTED** or **REJECTED**. It was built for the ProcureOps India Pvt. Ltd. practical assignment.

## What it does

1. **Start Inspection** - asks for a Batch ID (text) and a sample size (whole number, 1 or more).
2. **Record Defect** - asks for a severity (`Critical`, `Major` or `Minor`) and a short description.
3. **List Defects** - shows all defects recorded for the current inspection.
4. **Show Verdict** - shows ACCEPT or REJECT, calculated from the sample size and the recorded defects.

Everything is kept in memory while the program runs. There is no database, login or web interface.

## Prerequisites

- **Node.js 20 or newer.** This is the requirement of Playwright Test 1.65.1 (the only dependency), which declares `node >= 20`. The project itself was developed and tested with **Node.js v24.22.1** on Windows 11. Other Node.js versions were not tested.
- **npm** (installed together with Node.js; tested with npm 11.19.1).
- No browser is needed. The tests do not open one.

Check your versions:

```
node --version
npm --version
```

## Installation

Run this in the project folder:

```
npm install
```

It installs Playwright Test, which is used only for the automated tests (it is the only dependency).

## Running the application

```
npm start
```

The program prints a menu and waits for your input. Type a number and press Enter:

```
1. Start Inspection
2. Record Defect
3. List Defects
4. Show Verdict
5. Exit
```

Choose `5` to quit.

## Using the menu

| Option | What it does |
|---|---|
| 1. Start Inspection | Asks for a Batch ID and a sample size. Starting again replaces the current inspection and clears its defects. If the new input is invalid, the current inspection stays unchanged. |
| 2. Record Defect | Asks for a severity, then for a description. Invalid input is asked again. Type `cancel` at either question to return to the menu without recording a defect. |
| 3. List Defects | Shows the defects of the current inspection in the order they were recorded, or "No defects recorded yet." |
| 4. Show Verdict | Shows Batch ID, sample size, defect counts with their limits, the verdict (ACCEPT or REJECT) and, for REJECT, the reasons. |
| 5. Exit | Closes the program. |

Options 2, 3 and 4 need an inspection to be started first. Otherwise the program says: `No inspection started yet. Choose option 1 first.`

Any other menu input (for example `6`, `0`, `-1`, `01` or text) shows `Invalid choice. Please type a number from 1 to 5.` and the menu again.

### Example session

(The menu is shown again before every "Choose an option" line. It is left out here to keep the example short.)

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

- **REJECT** if there is 1 or more Critical defect, or the Major defects are more than the Major limit, or the Minor defects are more than the Minor limit.
- Otherwise **ACCEPT**. Zero defects is ACCEPT. A number of defects equal to the limit is accepted; only more than the limit is rejected.
- A sample size below 1 is an error and no verdict is calculated.

## Running the automated tests

```
npm test
```

At the time of writing, 251 tests pass: the expected result is `251 passed` (80 verdict tests, 83 inspection tests and 88 menu tests). If tests are added later, this number will be higher.

| Test file | What it covers |
|---|---|
| `tests/verdict.spec.js` | Verdict rules, the limits table, boundary values for every table row, invalid input |
| `tests/inspection.spec.js` | Input validation (Batch ID, sample size, severity, description) and the state of an inspection |
| `tests/cli.spec.js` | The terminal menu, including tests that start the real program (`node src/index.js`) with piped input |

Useful variations:

```
npx playwright test tests/verdict.spec.js
npx playwright test -g "Mandatory"
```

The second command runs the 19 tests that cover the eight assignment scenarios (expected: `19 passed`).

## Manually verifying the 8 mandatory scenarios

| # | Sample size | Defects to record | Expected result |
|---|---|---|---|
| 1 | 52 | 4 Major | `Verdict     : ACCEPT` |
| 2 | 52 | 5 Major | `Verdict     : REJECT` |
| 3 | 51 | 4 Major | `Verdict     : REJECT` |
| 4 | 189 | 8 Major | `Verdict     : REJECT` |
| 5 | 190 | 8 Major | `Verdict     : ACCEPT` |
| 6 | 85 | 1 Critical | `Verdict     : REJECT` |
| 7 | 52 | none (zero defects) | `Verdict     : ACCEPT` |
| 8 | 0 | none | An error: `Sample size must be 1 or more (you entered 0).` No verdict is shown. |

### Option 1: type the answers

1. Run `npm start`.
2. Choose `1`, enter a Batch ID (for example `B-101`) and the sample size from the table.
3. Choose `2` once for every defect in the table: enter the severity and any short description.
4. Choose `4` and compare the `Verdict` line with the table.
5. Choose `5` to quit.

For scenario 8 the sample size `0` is rejected at step 2. Choosing `4` afterwards shows `No inspection started yet. Choose option 1 first.`

### Option 2: run a scenario with one command

These helpers type the answers for you and print only the verdict line (or the error line). Paste one into your terminal, from the project folder, after `npm install`. Each helper was tested on a fresh clone of the repository, and all eight scenarios gave the expected result:

- the PowerShell helper in **Windows PowerShell 5.1** on Windows 11;
- the bash helper in **Git Bash 5.3** on Windows 11.

The helpers were not tested in other shells or on macOS or Linux.

**Windows PowerShell (tested in Windows PowerShell 5.1):**

```powershell
function Invoke-Scenario {
  param([int]$Size, [int]$Critical = 0, [int]$Major = 0, [int]$Minor = 0)
  $lines = @('1', 'B-101', "$Size")
  foreach ($severity in 'Critical', 'Major', 'Minor') {
    $count = Get-Variable -Name $severity -ValueOnly
    for ($i = 1; $i -le $count; $i++) { $lines += @('2', $severity, "$severity defect $i") }
  }
  $lines += @('4', '5')
  $lines | npm start --silent |
    Select-String -Pattern 'Error: .*|Verdict\s+: \w+' -AllMatches |
    ForEach-Object { $_.Matches.Value }
}

Invoke-Scenario -Size 52 -Major 4        # scenario 1: ACCEPT
Invoke-Scenario -Size 52 -Major 5        # scenario 2: REJECT
Invoke-Scenario -Size 51 -Major 4        # scenario 3: REJECT
Invoke-Scenario -Size 189 -Major 8       # scenario 4: REJECT
Invoke-Scenario -Size 190 -Major 8       # scenario 5: ACCEPT
Invoke-Scenario -Size 85 -Critical 1     # scenario 6: REJECT
Invoke-Scenario -Size 52                 # scenario 7: ACCEPT
Invoke-Scenario -Size 0                  # scenario 8: error, no verdict
```

**bash (tested in Git Bash 5.3 on Windows):**

```bash
scenario() {
  # usage: scenario SIZE [CRITICAL] [MAJOR] [MINOR]
  {
    printf '%s\n' 1 B-101 "$1"
    for entry in "Critical:${2:-0}" "Major:${3:-0}" "Minor:${4:-0}"; do
      severity=${entry%%:*}
      count=${entry##*:}
      for ((i = 1; i <= count; i++)); do printf '%s\n' 2 "$severity" "$severity defect $i"; done
    done
    printf '%s\n' 4 5
  } | npm start --silent | grep -Eo 'Error: .*|Verdict +: [A-Z]+'
}

scenario 52 0 4      # scenario 1: ACCEPT
scenario 52 0 5      # scenario 2: REJECT
scenario 51 0 4      # scenario 3: REJECT
scenario 189 0 8     # scenario 4: REJECT
scenario 190 0 8     # scenario 5: ACCEPT
scenario 85 1        # scenario 6: REJECT
scenario 52          # scenario 7: ACCEPT
scenario 0           # scenario 8: error, no verdict
```

Each of the eight scenarios is also an automated test. They are listed under "Mandatory scenarios" in `tests/verdict.spec.js` and `tests/cli.spec.js`.

## Assumptions and limitations

These are the behaviours that are present in the code. Reasons and more detail are in `DECISIONS.md`.

- **Data is not saved.** An inspection lives only while the program runs. Only one inspection exists at a time. Defects cannot be edited or deleted after they are recorded; start a new inspection instead.
- **Batch ID:** any text that is not empty. Spaces at the start and end are removed. There is no length limit and no format rule.
- **Sample size:** digits only, with optional spaces around. `"007"` is accepted and becomes 7. `"52.0"`, `"+52"` and `"1e3"` are rejected. The largest accepted value is 9007199254740991; larger numbers are rejected with "Sample size must be a positive safe integer." The assignment gives no maximum, so this is a technical limit.
- **Severity:** `Critical`, `Major` or `Minor`, in any letter case. Anything else is asked again.
- **Description:** 1 to 100 characters after spaces at the start and end are removed. The limit of 100 is an assumption; the assignment only says "short". Characters are counted in JavaScript string units, so an emoji counts as 2. A description that is exactly `cancel` cannot be recorded, because `cancel` returns to the menu.
- **Menu:** only the numbers 1 to 5 are accepted; words such as `exit` are not.
- **Piped input:** the program also works with piped input. When the input runs out, it prints `Input ended. Goodbye!` and exits with code 0.
- **Tested on** Windows 11 with Node.js v24.22.1 and npm 11.19.1 only (Windows PowerShell 5.1 for the PowerShell helper, Git Bash 5.3 for the bash helper). Other operating systems and Node.js versions were not tested.

## Project structure

```
src/
  index.js        terminal menu (asks questions, shows answers)
  inspection.js   current inspection and input validation
  verdict.js      limits table and ACCEPT / REJECT calculation
tests/
  verdict.spec.js      verdict rules and boundaries
  inspection.spec.js   inspection state and validation
  cli.spec.js          terminal menu, including the real program with piped input
playwright.config.js   test settings
package.json           scripts (start, test) and the dependency
DECISIONS.md           design decisions, assumptions and AI notes
AI_TRANSCRIPT.md       record of the AI-assisted work
```
