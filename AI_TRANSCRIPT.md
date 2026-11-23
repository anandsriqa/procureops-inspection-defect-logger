# Summary of AI-Assisted Work - Inspection Defect Logger

This file is a **summary** of the AI-assisted work on this project, written by the AI (Claude) while the work was done. It is **not** a word-for-word transcript of the conversation: prompts and replies are summarised, and the full text of the conversation is not part of this repository. The file name `AI_TRANSCRIPT.md` is kept because other project files refer to it.

How it was kept: entries were added while the work was done, up to Commit 6. The last two documentation steps (Step 9 and Step 10) and the final test result were added afterwards, in one correction, so they are shorter. The commit hashes, test counts and results written here were taken from real command output or from the Git history. `git log` is the authoritative record of what was committed.

---

## Step 1 - Project explanation and initialization

**User (summary of request):** Build the "Inspection Defect Logger" CLI app (Node.js + Playwright Test) step by step: start inspection, record defect, list defects, show verdict (ACCEPT/REJECT using the acceptance-limits table). Eight mandatory tests, README.md, DECISIONS.md, at least 5 Git commits, explanations in simple English/Hinglish. Start with Step 1 only.

**AI actions:**
- Checked tools: Node v24.22.1 and npm 11.19.1 found. **Git was NOT found** on the machine (not installed or not in PATH).
- Ran `npm init -y` -> created `package.json`.
- Created `.gitignore` (node_modules, test-results, playwright-report, .env).
- Created this transcript file.

**Open issue (resolved):** Git was not installed. User installed it; after an app restart `git --version` returned 2.56.1. Git identity was already configured globally.

**Commit 1:** `8d17723` - "chore: initialize Node.js project with package.json and .gitignore" (branch `main`). This commit was later replaced; see "Redo of Commit 1" below.

## Step 2 - Install dependencies

- Ran `npm install -D @playwright/test` -> Playwright Test 1.65.1 installed, 0 vulnerabilities. Browsers deliberately NOT downloaded (CLI app, no browser needed).
- Edited `package.json`: `main` -> `src/index.js`, scripts `start` = `node src/index.js`, `test` = `playwright test`, better description.
- Created `playwright.config.js` (testDir `./tests`, list reporter).
- Not yet run: no tests exist, so `npm test` was not executed.

---

Note: Git printed "LF will be replaced by CRLF" warnings. This is normal on Windows and harmless.

---

## Redo of Commit 1

**User:** Asked to redo Commit 1 from scratch, following the full assignment structure, and not to proceed to Commit 2.

**AI review of the original Commit 1 (`8d17723`) found these gaps (AI's own incompleteness):**
- No `src/` or `tests/` folders, no `README.md`, no `DECISIONS.md` (required structure incomplete).
- Package name was `inspection-defect-logger`, assignment says `procureops-inspection-logger`.
- `package.json` had empty author/keywords and `main` pointed to a non-existent `index.js`.
- No runnable entry file, so Commit 1 could not be verified manually.
- Playwright (original Commit 2) was already in history.

**AI actions:**
- Created branch `backup-before-redo` pointing at the old Commit 2 (`44099a8`) so nothing was lost.
- `git reset --hard 8d17723`, then rebuilt Commit 1 with the full structure (this commit replaces `8d17723`).
- Playwright install/config will be redone in Commit 2 later. The "Step 2" notes above record what was done earlier and are kept as a true history.

---

## Commit 2 - Playwright Test (redone after Commit 1 redo)

- Ran `npm install -D @playwright/test` (v1.65.1, 0 vulnerabilities), changed `test` script to `playwright test`, created `playwright.config.js`.
- Verified with a temporary smoke test (1 passed), then deleted it. Without any test files `npm test` prints "No tests found" (exit 1), which is expected.
- User reviewed 7 final checks, then confirmed. Committed as `c02ac80` "chore: add Playwright Test dependency and config".
- AI note: author email on Commit 2 differs from Commit 1 (Git identity changed outside the AI's actions). Left unchanged on user's request.

---

## Commit 3 - verdict logic (committed as 9acdc73)

- AI proposed `src/verdict.js` first. The first proposal IGNORED invalid severities silently, which could turn a REJECT into a wrong ACCEPT. The user pointed this out; the AI agreed it was a flaw in its proposal and changed the code so any invalid severity returns `valid: false` with an error and no verdict.
- Created `src/verdict.js` and `tests/verdict.spec.js` (36 tests: 8 mandatory, table check, boundary cases, multiple severities, invalid sample sizes, invalid severities). Removed `tests/.gitkeep` since the folder now has a real file.
- Actual run: `npm test` -> 36 passed (2.0s), exit code 0.

---

**Mutation check (requested by user, before Commit 3):** temporarily changed `major > limits.major` to `major >= limits.major` in `src/verdict.js`. Actual result: 8 failed, 28 passed (including mandatory tests 1 and 5), so the tests do catch this boundary bug. Original condition was restored (file hash identical) and `npm test` again showed 36 passed. Only the `major` condition was mutated; `minor` and `critical` conditions were not mutation-tested.

---

## Commit 4 - inspection state and validation (committed as b6148da)

- AI proposed `src/inspection.js` (class `Inspection` with start, record defect, list defects, get verdict) and showed the code and test list BEFORE creating files. User approved with clarifications: keep the 100-character description limit but document it in DECISIONS.md as an implementation assumption; invalid new inspection input must leave the existing inspection unchanged; errors returned clearly (`{ valid: false, error }`) so Commit 5 can display them; keep sample-size string parsing, severity normalization and defensive copies.
- Created `src/inspection.js` and `tests/inspection.spec.js`. Added the assumptions to DECISIONS.md section 3. Commits 1-3 code not changed.
- Test results: see the actual run below in the next transcript update.

---

**Commit 4 actual test run:** `npm test` -> 94 passed (3.2s), exit code 0 (36 existing verdict tests + 58 new inspection tests). This run was before the review; Commit 4 was later created as b6148da.

---

**Mutation check for Commit 4 (requested by user):** `src/inspection.js` was backed up, then the condition was temporarily changed from `number < 1` to `number <= 1`. Actual result: the test "sample size 1 is valid" failed as expected (1 failed, 57 passed in `inspection.spec.js`). The original file was restored from the backup and the SHA256 hashes matched (`DC10E0D0...B051DBC`). The complete suite then passed: 94 tests. Only the sample-size condition was mutation-tested.

---

Commit 4 was created as `b6148da` ("feat: add inspection state, input validation and tests") after the user reviewed the diff and the mutation check.

## Commit 5 - terminal menu (`src/index.js`)

- AI first read README.md, package.json, src/index.js, src/inspection.js, src/verdict.js, DECISIONS.md and AI_TRANSCRIPT.md, then proposed the architecture and code WITHOUT changing files. The AI noticed its own omission: README.md had become outdated (still said "setup OK") because it was not updated in Commits 3 and 4.
- User approved with decisions: create `tests/cli.spec.js`; invalid severity is asked again and the description is not asked until severity is valid; update README and DECISIONS; fix the old "in progress" wording in this transcript.
- AI ran a small experiment in the scratchpad (not in the project) to check an assumption about piped input. Result: plain `readline/promises` `question()` lost lines (only the first of 3 piped lines was answered, then the program silently stopped), while a line queue worked and returned `null` at real end of input. The AI's first EOF test (case C) was set up wrongly because PowerShell adds an extra newline to piped text; it was redone correctly (case D). Also found: PowerShell adds a hidden BOM character to the first piped line; `String.trim()` removes it.
- User added decisions: invalid description asks only the description again; typing `cancel` (any case, spaces ignored) at the severity or description questions returns to the menu without recording a defect.
- Implemented: `src/index.js` (menu, `run`, `createAsk` queue for piped input, `formatDefectList`, `formatVerdict`), `tests/cli.spec.js` (69 tests: menu, EOF, start, record, severity retry, description retry, cancel, list, verdict, repeated operations, the 8 mandatory scenarios through the menu, and the real program with piped input), updated README.md and DECISIONS.md.
- Not changed: `src/inspection.js`, `src/verdict.js`, `tests/verdict.spec.js`, `tests/inspection.spec.js`, `package.json`, `playwright.config.js` (SHA256 checked before and after).
- First run of `tests/cli.spec.js` alone: 69 passed (9.1s). The full-suite run is recorded by the commit step.

---

**Final mutation test for Commit 5 (requested by user):** `src/index.js` was backed up and five mutations were applied one at a time. Each mutation was caught by tests in `tests/cli.spec.js`:

| Mutation | Result |
|---|---|
| 1. Invalid-severity retry broken (any severity accepted) | 5 failed, 64 passed |
| 2. Invalid-description retry broken (returns to menu after the first error) | 4 failed, 65 passed |
| 3. Cancel handling broken (cancel never recognised) | 8 failed, 61 passed |
| 3b. Cancel no longer case-insensitive | 3 failed, 66 passed |
| 3c. Cancel no longer ignores surrounding spaces | 2 failed, 67 passed |

All 5 mutations were detected. After every mutation the original `src/index.js` was restored from the backup and its SHA256 matched the original (`1BB8631B...55F19EE`). The SHA256 of the protected files (`src/verdict.js`, `src/inspection.js`, `tests/verdict.spec.js`, `tests/inspection.spec.js`, `package.json`, `playwright.config.js`) also matched the values taken before the Commit 5 work.

Not mutation-tested: the "not changed" and "cleared" messages in the Start Inspection handler. Not checked by hand: Ctrl+Z then Enter in a real Windows console (piped end of input is covered by tests).

**Final result before Commit 5:** `npm test` -> 163 passed (36 verdict + 58 inspection + 69 cli), exit code 0, checked again right before the commit. Commit 5 is the commit "feat: add interactive terminal menu" (`49578fa`). No remote is configured and nothing was pushed.

---

## Commit 6 - review findings turned into tests and small fixes (committed as ff1e642)

- Step 8 review (BVA and equivalence partitioning) was done first with NO file changes. A read-only probe showed the code was correct at all 30 table-boundary checks, but the tests had gaps: Minor limits of rows 16-51 and 190-719 had no verdict tests, row-edge exact limits were missing, and several input classes were untested.
- The review also found problems that were the AI's own: (1) the oversized sample-size error said "must be a whole number" although the number is whole; (2) DECISIONS.md said "The CLI does not repeat any rules", but `index.js` prints a fixed `(limit 0)` for Critical; (3) the AI's file-writing tool turned the escape `\uFEFF` into an invisible literal character in `tests/cli.spec.js`, so the BOM test was fragile.
- User decisions: change only the oversized message to "Sample size must be a positive safe integer."; keep numeric text behaviour ("52", "007" valid; "52.0", "+52", "1e3" invalid) and document it; keep UTF-16 description length and document it; correct the DECISIONS.md statement; replace the invisible BOM with an explicit escape; add the listed tests.
- Implementation notes: the message fix needed one extra condition (`Number.isInteger(number) && !Number.isSafeInteger(number)`), because old tests still expect "whole number" for "abc", 5.5, NaN and Infinity and must not be weakened. Before/after snapshot of 55 inputs: same valid/invalid decision and same parsed value for all 55; only the message of 9 oversized inputs changed; `verdict.js` results identical.
- New fact found while checking: `verdict.js` called directly accepts a sample size of 2 to the power 53 (it checks `Number.isInteger` only), while `Inspection` rejects it. Not reachable through the menu. Left unchanged on purpose (user asked not to change verdict behaviour) and documented in DECISIONS.md.
- New tests: table-driven limit / limit+1 for all five rows at the smallest and largest sample size (including `Number.MAX_SAFE_INTEGER`), Major and Minor and Critical and combined (40 tests); omitted and null defects; `MAX_SAFE_INTEGER` and +1; numeric text formats; description length with spaces, inner spaces and emoji; Batch IDs "123" and "cancel"; severity "Ma jor"; menu inputs -1, 01, 10; oversized sample size through the menu; real-process mandatory scenarios 6 and 8. Emoji are written with `String.fromCodePoint` and the BOM as the explicit escape, so no invisible characters remain (0 non-ASCII characters in `src/` and `tests/`).
- Actual result: `npm test` -> 251 passed (80 verdict + 83 inspection + 88 cli), exit code 0, 0 failed. Before Commit 6 it was 163 passed.
- Mutation testing of the new tests was done afterwards, before the commit (see the note below).

---

**Mutation testing for Commit 6 (requested by user):** 15 mutations were tested on a separate scratch copy of the project, because 12 of them change the limits table in `src/verdict.js`, and `verdict.js` was not to be modified. 12 were requested: Minor limit of row 2 (4 to 5), row 4 (17 to 18), row 5 (32 to 33), row 1 (1 to 2) and row 3 (9 to 10); the oversized safe-integer condition (never fires, inverted, boundary off by one); the description-length condition (">" to ">=", limit 100 to 101, length counted before trimming spaces, length counted in symbols instead of UTF-16 units). 3 extra mutations were added by the AI: table intact, but the Minor comparison accepts one extra defect in one row only.

Results:
- All 15 mutations were detected by the new test suite (251 tests); in every case the relevant tests failed.
- Each mutation was restored in a `finally` block from a pristine backup and the SHA256 matched every time.
- The original project files remained unchanged: the SHA256 of 13 files was identical before and after, and the scratch copy was deleted afterwards.
- The old 163-test suite (from Commit 5) caught 9 of the 15 and missed 6 (oversized condition never fires, oversized boundary off by one, length counted before trimming, length counted in symbols, and the logic mutations for row 2 and row 4). The new tests close those gaps. NOTE: the instruction for this note said the old suite caught 6; the actual run output shows 6 missed and 9 caught, so the real numbers are recorded here. An earlier summary by the AI wrongly said "8"; that was also corrected.
- The 9 mutations caught by the old suite include all five table-value mutations. They were caught by the old test "table matches the assignment exactly", so the earlier Step 8 statement "Minor limits of rows 2 and 4 have no tests" was true for the verdict behaviour, but overstated for the table values.
- Not mutation-tested: the CLI-only tests added in this commit (Batch IDs "123" and "cancel", menu inputs -1, 01, 10, severity "Ma jor" through the menu).

---

## Step 9 - README finalization (committed as ee86c86)

- Before writing, the AI read `README.md`, `package.json`, `playwright.config.js`, the three source files and the test files, and checked the facts it would state: the installed Playwright Test 1.65.1 declares `node >= 20`, and the project was run with Node.js v24.22.1 and npm 11.19.1 on Windows 11.
- The AI checked the README commands on a fresh clone of the repository, in a scratch folder outside the project: `npm install` (3 packages, 0 vulnerabilities), `npm test` (251 passed), `npm start` with piped input, `npx playwright test -g "Mandatory"` (19 passed), and a PowerShell helper and a bash helper for the eight mandatory scenarios (8 of 8 matched in Windows PowerShell 5.1 and in Git Bash 5.3).
- The proposed README was shown first and edited only after approval. Decisions: make no claim about the keys Ctrl+Z, Ctrl+D or Ctrl+C (never tried in a real console); the Ctrl+Z / Ctrl+C sentence that Commit 5 had put in the README was removed. Keep "251 tests passed at the time of writing". Keep both helpers and say where each was tested. Keep "Node.js 20 or newer" as the Playwright Test requirement and say that the project itself was tested only with Node.js v24.22.1.
- Before committing, HEAD was checked (`ff1e642`), `npm test` was run (251 passed), and only `README.md` was staged. Commit `ee86c86` "docs: finalize README with install, run, test and verification steps" contains only `README.md`.

---

## Step 10 - DECISIONS.md completion (committed as 7e90b9e)

- The AI first did a read-only review of `DECISIONS.md`, this file, `README.md`, the source and test files and the Git history. It proposed the text for all four sections, with evidence for each claim and a list of claims that could not be verified.
- Two checks were run only to support the "could still go wrong" section: (1) the sample size typed with Devanagari, Arabic-Indic or full-width digits is rejected by the code; (2) when the output pipe closes early (`yes 3 | head -3000 | node src/index.js | head -1`), Node.js crashed with an unhandled EPIPE error and exit code 1. This was reproduced only in Git Bash on Windows with Node.js v24.22.1.
- Corrections from the candidate before editing: remove the item about the wrongly set up piped-input experiment (Section 1 keeps items 1 to 7); keep the exact mutation result (the old suite caught 9 and missed 6, the new suite detected all 15); in Section 2 do not claim a deliberate decision where the history does not show one; in Section 3 remove the unverified Ctrl+Z claim, do not say `0x10` and `1,000` are covered by tests, and explain the difference between the sample-size checks in `inspection.js` and `verdict.js`; in Section 4 keep exactly three risks (real keyboard, EPIPE, non-ASCII digits). After the edit, one more wording change was made in Section 1 item 5 ("mutations 5a and 5c" became "the 'never fires' and 'off by one' mutations").
- Before committing, HEAD was checked (`ee86c86`) and only `DECISIONS.md` was staged. Commit `7e90b9e` "docs: complete DECISIONS.md with AI mistakes, exclusions, assumptions and risks" contains only `DECISIONS.md`.

---

## Final test result

- `npm test` -> **251 passed** (80 verdict + 83 inspection + 88 cli), 0 failed. This result was seen right before the README commit (`ee86c86`) and again in a read-only final audit on a fresh clone of the last commit `7e90b9e`; the audit changed no file. `ee86c86` changed only `README.md` and `7e90b9e` changed only `DECISIONS.md`. No test was run as a separate step for the `DECISIONS.md` commit itself.

---
