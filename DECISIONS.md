# DECISIONS

> Placeholder. Each section is filled at the end of the project, using only things that actually happened.

## 1. Where AI got it wrong

_To be filled with real mistakes only._

## 2. What I chose not to build and why

_To be filled._

## 3. What was ambiguous and my assumptions

_Partly filled so far (Commit 4). More will be added at the end._

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
- **The CLI does not repeat any rules.** It shows the error text returned by the Inspection class. The only exception is the retry message for an invalid severity, which is built in the CLI from the shared severity list.

## 4. Three things that could still go wrong and are not covered by my tests

_To be filled._
