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

## 4. Three things that could still go wrong and are not covered by my tests

_To be filled._
