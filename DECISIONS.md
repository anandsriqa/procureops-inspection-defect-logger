# DECISIONS

This file records the decisions behind the Inspection Defect Logger: where the AI (Claude) made mistakes, what I did not build, what the assignment left open, and what my tests still do not cover. Commit hashes and test names are given so that each statement can be checked. `AI_TRANSCRIPT.md` is the log of the AI-assisted work.

## 1. Where AI got it wrong

These are real mistakes made by the AI while building this project. They are taken from `AI_TRANSCRIPT.md` and checked against the Git history.

- **Caught before it was committed:** item 2.
- **Already committed, and fixed later:** items 1, 3, 4, 5 and 6.
- **Wrong statements in the AI's reports, not in the code:** item 7.

**1. The first Commit 1 was incomplete.**
- *Status:* Already committed (`8d17723`), later replaced by a rebuilt Commit 1 (`593c36f`). The old commit is kept on the branch `backup-before-redo`.
- *What was wrong:* The assignment asked for a structure with `src/`, `tests/`, `README.md` and `DECISIONS.md` and the package name `procureops-inspection-logger`. The first Commit 1 only ran `npm init` and added `.gitignore` and the transcript. There was no `src/`, `tests/`, README or DECISIONS file, the package name was `inspection-defect-logger`, and `main` pointed to a file that did not exist.
- *How it was found:* When I asked for Commit 1 to be redone against the full requirements, the AI's own review listed these gaps.
- *How it was fixed:* A backup branch was created, then Commit 1 was rebuilt with the full structure and a runnable `npm start` (`593c36f`).
- *Evidence:* `git show --stat 8d17723` (3 files, old package name); `git log backup-before-redo` still shows it; "Redo of Commit 1" in `AI_TRANSCRIPT.md`.

**2. The first verdict design ignored invalid severities.**
- *Status:* Caught before it was committed. The faulty version was never committed.
- *What was wrong:* In the AI's first proposal for `verdict.js`, a defect with an unknown severity (for example `Mjor`) was simply not counted. Four valid Major defects plus one misspelled defect could silently give ACCEPT.
- *How it was found:* I pointed it out while reviewing the proposal, before the code was written.
- *How it was fixed:* Any invalid severity now returns an error and no verdict (`src/verdict.js`, lines 53-63).
- *Evidence:* the test group "Invalid severity must never give a silent ACCEPT" (6 tests) and the test "4 valid major + 1 invalid defect does NOT become ACCEPT" in `tests/verdict.spec.js`; "Commit 3" in `AI_TRANSCRIPT.md`.

**3. The README was out of date, and one sentence about keyboard keys was never verified.**
- *Status:* Already committed. The stale README text was in `593c36f` and stayed until `49578fa`, because `9acdc73` and `b6148da` did not change the README. The unverified sentence was committed in `49578fa` in both `README.md` and this file. It was removed from `README.md` in `ee86c86` and is removed from this file in this version.
- *What was wrong:* The README still said `setup OK` and "inspection.js and verdict.js to come" after both files existed. Then the README in `49578fa` said "On Windows press Ctrl+Z then Enter to end input. Ctrl+C stops the app at once.", and this file said the same about Ctrl+Z. Nobody had tried these keys in a real console. The README also said "1 to 100 characters", although the code counts UTF-16 units.
- *How it was found:* The AI noticed the stale README while planning the terminal menu. The unverified keyboard sentence was found in Step 9 (README), when every README claim was checked against the code, the tests and a run on a fresh clone.
- *How it was fixed:* The README was rewritten in `49578fa`, the keyboard sentence was removed from it in `ee86c86`, and it is no longer in this file.
- *Evidence:* `git show b6148da:README.md` (stale text); `git diff 49578fa ee86c86 -- README.md`; `git show ee86c86:DECISIONS.md` (the sentence was still here); "Commit 5" in `AI_TRANSCRIPT.md`.

**4. This file wrongly said that the menu code repeats no rules.**
- *Status:* Already committed (`49578fa`), fixed in `ff1e642`.
- *What was wrong:* This file said "The CLI does not repeat any rules". But `src/index.js` prints a fixed `(limit 0)` for Critical, which repeats the rule "1 or more Critical defects = REJECT", and it builds its own retry message for an invalid severity.
- *How it was found:* In Step 8 (code review), by comparing the written decisions with the code.
- *How it was fixed:* The statement was rewritten in `ff1e642` and named both exceptions.
- *Evidence:* `src/index.js` line 38 and lines 90-93; the `DECISIONS.md` change in `ff1e642`.

**5. A misleading error message for very large sample sizes.**
- *Status:* Already committed (`49578fa`), fixed in `ff1e642`.
- *What was wrong:* A sample size such as `9007199254740992` was rejected with "Sample size must be a whole number", although it is a whole number. It is only too big to be handled exactly.
- *How it was found:* In Step 8, with a read-only probe of boundary inputs.
- *How it was fixed:* One extra condition gives the message "Sample size must be a positive safe integer." for these numbers only (`src/inspection.js`, lines 25-27). A before/after comparison of 55 inputs showed the same valid/invalid decision and the same parsed value for all 55; only the message of 9 oversized inputs changed.
- *Evidence:* the tests "Number.MAX_SAFE_INTEGER + 1 gives the \"positive safe integer\" error" and "too big as text (\"9007199254740992\" and 20 nines) gives the same error" in `tests/inspection.spec.js`, and "9007199254740992 shows the \"positive safe integer\" error" in `tests/cli.spec.js`. In the mutation test, the old 163 tests did not detect two broken versions of this condition (the 'never fires' and 'off by one' mutations); the new tests did.

**6. An invisible character in a test file.**
- *Status:* Already committed (`49578fa`), fixed in `ff1e642`.
- *What was wrong:* In `tests/cli.spec.js` the AI wrote the escape for the byte-order-mark character, but its file-writing tool saved an invisible character instead, and the AI did not look at the written file. The test passed, but its source was unreadable and fragile.
- *How it was found:* In Step 8, by searching the test source for that character.
- *How it was fixed:* The line now uses the explicit escape `'\uFEFF'`, the emoji in the new tests are built with `String.fromCodePoint`, and there are now no non-ASCII characters in `src/` or `tests/`.
- *Evidence:* `git show 49578fa:tests/cli.spec.js` contains one literal U+FEFF character and `HEAD` contains none; the test "a hidden BOM character at the start (PowerShell pipe) is ignored".

**7. Wrong numbers and an overstatement in the AI's own reports.**
- *Status:* Not a code mistake. These were wrong statements in the AI's reports, corrected in the transcript before it was committed (`ff1e642`).
- *What was wrong:* (a) The Step 8 review said that the Minor limits of the rows for sample sizes 16-51 and 190-719 had "no test". Mutation testing showed that typos in those table values were already caught by the old test "table matches the assignment exactly"; the statement was only true for the verdict behaviour. (b) In one summary the AI said the old tests missed 8 of 15 mutations. The real result of the mutation test was: **the old 163-test suite caught 9 of the 15 mutations and missed 6; the new 251-test suite detected all 15.**
- *How it was found:* By reading the raw mutation output instead of the summary.
- *How it was fixed:* Both corrections are written in the transcript.
- *Evidence:* "Mutation testing for Commit 6" in `AI_TRANSCRIPT.md`.

What I take from this: the AI's statements were only trustworthy after I checked them against raw output: a mutation run, a fresh clone, or the Git history.

## 2. What I chose not to build and why

The assignment asks for four features (start an inspection, record a defect, list defects, show the verdict) in a command-line application.

**Excluded by the assignment itself**

- **Login, database, deployment and UI styling.** The assignment says not to add "unnecessary features such as login, database, deployment or UI styling".
- **A web interface.** The assignment asks for a command-line application, not a web application.

**Not implemented because they were outside the required scope**

For these I did not make a separate decision against them. They are simply not part of the four required features.

- **Saving data between runs.** An inspection lives only in memory while the program runs. The assignment rules out a database and does not ask for saved data. The README states this.
- **More than one inspection at the same time.** Only one inspection exists at a time, and starting a new one replaces the current one. This was part of the design I approved for the inspection logic. More than one at a time is not required.
- **Editing or deleting a recorded defect.** The assignment asks only to record and list defects.
- **Extra rules for the Batch ID and for description text.** There is no format or length rule for the Batch ID, and there is no filtering of special characters or new lines in descriptions. The assignment says only "text" and "short". These points were listed as not covered when I approved the design of the inspection logic.
- **Terminal extras such as command history, line editing or colours.** The menu uses only the built-in `readline` module. The task said to use Node.js built-in functionality where possible and to avoid unnecessary dependencies. Playwright Test is the only dependency, and it is used only for the tests.
- **Browser tests.** There is no web interface, so Playwright is used only as a test runner, without a browser.

**Reviewed and decided**

These two were explicitly reviewed and approved when the tests were extended.

- **Counting the description length in visible symbols.** I kept the simple JavaScript length (UTF-16 units) and added boundary tests that pin it (see section 3).
- **Lenient number parsing.** `"52.0"`, `"+52"` and `"1e3"` stay rejected as sample sizes, so that "whole number" stays simple and predictable.

## 3. What was ambiguous and my assumptions

**Where the assignment's wording was open**

- **"Short defect description".** No number is given. I accept 1 to 100 characters after removing spaces at the start and end. The limit of 100 is my assumption, not an assignment requirement. Empty or spaces-only descriptions are rejected. Length is counted in UTF-16 units, so an emoji counts as 2 and at most 50 emoji fit. A description that is exactly `cancel` cannot be recorded, because `cancel` returns to the menu.
- **Batch ID "as text".** Any text that is not empty is accepted, with spaces at the start and end removed. There is no length or format rule. `123` and `cancel` are valid Batch IDs.
- **Sample size "as a whole number".** From a command line the input is text, so the text is converted. Only the digits 0 to 9 are accepted, with optional spaces around and an optional leading minus sign (which then fails the "1 or more" rule). `"52"`, `" 52 "` and `"007"` (which becomes 7) are valid. `"52.0"`, `"+52"` and `"1e3"` are invalid, and these formats are covered by tests. `"0x10"` and `"1,000"` are also invalid because of the same digits-only rule, but I only checked that by running the code. No test covers them. Treating `"52.0"` as invalid is my assumption. A sample size below 1 gets "Sample size must be 1 or more (you entered N)."; anything that is not a whole number gets "Sample size must be a whole number, for example 52."
- **Upper limit of the sample size.** The assignment gives none. The technical limit is 9007199254740991 (`Number.MAX_SAFE_INTEGER`); larger numbers are rejected with "Sample size must be a positive safe integer."
- **Sample-size checking in `inspection.js` and in `verdict.js` is not the same.**
  - `inspection.js` (`parseSampleSize`, lines 15-37) accepts a number or digits-only text, converts the text to a number, requires a safe integer, and requires 1 or more.
  - `verdict.js` (`isValidSampleSize`, line 19) accepts only a real number that is a whole number and at least 1. It does not accept text (the test "text "52" gives an error and no verdict" covers this), and it has no safe-integer limit, so called directly it would also accept for example 2 to the power 53. I found this by running the code, and no test covers it.
  - In the menu, `Inspection` checks the input first and passes only a valid number on, so the check in `verdict.js` is a second safety net and the larger numbers cannot reach it. I left `verdict.js` unchanged on purpose.
- **Severity.** `Critical`, `Major` or `Minor`, in any letter case, stored in the correct spelling. Anything else is an error. The verdict code itself stays strict and never ignores an unknown severity.
- **"Automatically calculate the verdict".** I read this as: the verdict is calculated again from the current defects every time the user chooses Show Verdict. It is never stored, and it is not printed after each defect.

**Behaviour the assignment does not describe (menu)**

- **One inspection at a time.** Starting a new inspection replaces the old one and clears its defects. If the new input is invalid, the current inspection stays unchanged.
- **Record Defect, List Defects and Show Verdict before an inspection has started** print "No inspection started yet. Choose option 1 first." Record Defect does not ask any questions first.
- **Start Inspection does not ask again after an error.** After an invalid Batch ID or sample size, the program shows the error and returns to the main menu. Only the severity and the description are asked again.
- **Menu choices** are the numbers 1 to 5 only, with spaces around ignored. Words such as `exit` and inputs such as `01`, `-1` or `10` show "Invalid choice" and the menu again.
- **Retry and `cancel`.** An invalid severity is asked again until it is valid. An invalid description is asked again without asking for the severity again. At either question the user can type `cancel` (any letter case, spaces ignored) to return to the menu without recording a defect. `cancel` is not special at the Batch ID or sample size questions.
- **Input that runs out** (for example piped input) is treated like Exit: the program prints "Input ended. Goodbye!" and exits with code 0, instead of waiting forever. Piped input is supported so that the program can be tested automatically. How the program reacts to the keys of a real keyboard is not verified (see section 4).
- **The menu code reuses the rules instead of writing them again,** with two small exceptions that copy text, not logic: the retry message for an invalid severity is built in `index.js` from the shared severity list, and the verdict screen prints `Critical : N (limit 0)` with a fixed `0`. If the Critical rule ever changes, `index.js` must be changed as well.

## 4. Three things that could still go wrong and are not covered by my tests

**1. Real keyboard use in a terminal.**
- *What could go wrong:* Typing, Backspace, the end-of-input keys (Ctrl+Z then Enter on Windows, Ctrl+D on other systems) and Ctrl+C might behave differently from what I expect in a real console, for example text displayed badly or the program not ending cleanly. I have not verified any of this, which is why the README makes no claim about these keys.
- *Gap in the tests:* Every menu test either calls `run()` with a scripted `ask` function or starts `node src/index.js` with text piped in (`spawnSync` with `input`, `tests/cli.spec.js`, line 51). Neither uses a real terminal.
- *How to cover it:* Write a short manual checklist and run it once on each operating system: a full session typed by hand, Backspace while typing, the end-of-input key, and Ctrl+C. An automated test would need a pseudo-terminal library, which would be a new dependency.

**2. The output closing early (EPIPE).**
- *What could go wrong:* If the output goes to a program that stops reading, the app crashes with a raw Node.js error instead of ending quietly. **I reproduced this only in Git Bash on Windows with Node.js v24.22.1.** The command `yes 3 | head -3000 | node src/index.js | head -1` printed `Error: EPIPE: broken pipe, write` with "Unhandled 'error' event" and Node.js exited with code 1. The same input with the output fully read exited with code 0. I did not test other shells or systems.
- *Gap in the tests:* The tests always read all of the output. The only error handler in `main()` (`.catch`, `src/index.js`, lines 221-224) catches errors from the menu loop, not errors of the output stream, and no test checks that path: there are no tests that mention "Unexpected error" or a non-zero exit code.
- *How to cover it:* Handle the `error` event of the output stream (ignore EPIPE and end quietly), and add a test that starts the program with piped output, closes the output after the first chunk, and checks that no stack trace is printed and that the exit code is defined.

**3. Digits from other writing systems.**
- *What could go wrong:* A user who types or pastes the sample size with other digits (for example Devanagari digits U+096B U+0968, Arabic-Indic digits U+0665 U+0662 or full-width digits U+FF15 U+FF12) gets "Sample size must be a whole number, for example 52." That looks wrong to the person typing, because the number looks like a whole number. I checked all three by running the code: they are rejected, because the check accepts only the digits 0 to 9 (`src/inspection.js`, line 19). ASCII `52` is accepted.
- *Gap in the tests:* All my sample-size tests use the digits 0 to 9, so this input class is not tested, and I have not made a decision about it.
- *How to cover it:* Decide the behaviour first. Either keep rejecting these digits and add a test that pins the rejection (maybe with a clearer message), or convert them to 0-9 before checking and test the conversion.
