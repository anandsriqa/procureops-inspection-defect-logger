# DECISIONS

> Placeholder. Each section is filled at the end of the project, using only things that actually happened.

## 1. Where AI got it wrong

_To be filled with real mistakes only._

## 2. What I chose not to build and why

_To be filled._

## 3. What was ambiguous and my assumptions

_Partly filled so far (Commits 4 to 6). More will be added at the end._

- **Description length limit of 100 characters is an implementation assumption, not an explicit assignment requirement.** The assignment only says "short defect description" without a number. I chose 1 to 100 characters (after removing spaces at the start and end). Empty or spaces-only descriptions are rejected.
- **Batch ID:** the assignment says "text". I accept any non-blank text (spaces at the start and end are removed). There is no length limit and no format rule.
- **Sample size typed as text:** a command line gives text, so text like `"52"` is converted to the number 52. Decimals (`5.5`), words and empty input are rejected as "not a whole number". `0` and negative numbers are rejected with a separate "1 or more" message.
- **Severity input is case-insensitive** (`major`, ` MAJOR `) and is converted to `Critical`, `Major` or `Minor`. Anything else is an error. The verdict code itself stays strict.
- **One inspection at a time:** starting a new inspection replaces the old one and clears its defects. If the new start has invalid input, the existing inspection is left unchanged.

CLI design assumptions (Commit 5):

- **Menu choices are the numbers 1 to 5 only.** Words like "start" or "exit" are not accepted. Spaces around the number are ignored. Anything else shows "Invalid choice" and the menu again.
- **Invalid severity is asked again** until it is valid, the user types `cancel`, or the input ends. The description is not asked until the severity is valid.
- **Invalid description (empty, spaces only, over 100 characters) is asked again** without asking for the severity again.
- **`cancel` (any letter case, spaces ignored) works at the severity and description questions** and returns to the menu without recording a defect. Because of this, a defect description of exactly "cancel" cannot be recorded. `cancel` is not a special word at the Batch ID or Sample Size questions, so "cancel" is a valid Batch ID.
- **Input ending is treated like Exit.** If the input ends (Ctrl+Z then Enter on Windows, or piped input running out), the app prints a goodbye message and closes with exit code 0 instead of waiting forever.
- **Piped input is supported** (for automated tests and scripts). Lines are queued so none are lost when many lines arrive at once.
- **The CLI reuses the rules instead of writing them again, with two small exceptions that copy text, not logic.** (1) The retry message for an invalid severity is built in `index.js` from the shared `VALID_SEVERITIES` list and `normalizeSeverity`. (2) The verdict screen prints `Critical : N (limit 0)`. That fixed `0` is typed in `index.js` and repeats the rule "1 or more Critical defects = REJECT". If that rule ever changes, `index.js` must be changed as well. An earlier version of this file said the CLI repeats no rules at all; that was not fully correct.

Sample size and description details (Commit 6):

- **Numeric text accepted or rejected as sample size.** Only digits (with optional spaces around, and an optional minus sign that then fails the "1 or more" rule) are accepted. `"52"` is valid, `" 52 "` is valid, `"007"` is valid and becomes 7. `"52.0"` is invalid (decimal point), `"+52"` is invalid (plus sign), `"1e3"` is invalid (scientific notation); also `"0x10"` and `"1,000"` are invalid. The assignment only says "whole number", so treating `"52.0"` as invalid is my assumption. These formats are pinned by tests, so changing them later is a deliberate decision.
- **Upper limit of the sample size.** The assignment gives no maximum. The technical limit is `Number.MAX_SAFE_INTEGER` (9007199254740991): this value is valid, anything above is rejected with "Sample size must be a positive safe integer." Before Commit 6 these numbers got the message "must be a whole number", which was misleading because they are whole numbers; only the message was changed, not which inputs are valid.
- **The two layers do not have the same upper limit.** `Inspection` (and so the menu) rejects sample sizes above `Number.MAX_SAFE_INTEGER`. `verdict.js` called directly only checks "whole number, 1 or more", so it also accepts for example 2 to the power 53. The menu cannot reach this case. I left `verdict.js` unchanged on purpose.
- **Description length is counted in UTF-16 units, after removing spaces at the start and end.** The limit is 100 units. Most characters count as 1, but an emoji counts as 2, so at most 50 emoji fit. "100 characters" therefore means 100 JavaScript string units, not 100 symbols that a person sees. I kept this simple behaviour and added boundary tests for it (spaces around, spaces inside, emoji).

## 4. Three things that could still go wrong and are not covered by my tests

_To be filled._
