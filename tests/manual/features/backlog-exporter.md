# Feature Test Plan: Backlog Exporter & Deliverables Validation

This test plan defines the manual verification procedure for **Backlog CSV Exporting** and generated summaries.

---

## Test Steps & Scenarios

### Scenario 1: Backlog CSV Generation
- [ ] **1. Run a scan in Backlog Mode**: Run `repo-wizard` in backlog mode on a local directory.
- [ ] **2. Verify output file exists**: Check `.repo-wizard/backlog.csv` (or the customized output path).
  - *Expected*: The CSV file is created.
- [ ] **3. Inspect CSV columns**: Open the CSV file in a text editor or spreadsheet viewer.
  - *Expected*: The CSV contains headers: `ID`, `Priority`, `Standard`, `Agent`, `File/Path`, `Friction`, `Recommendation`, `Status`.
  - All recommendations are filled out, and no columns are empty.

### Scenario 2: Deliverables Linter Gate
- [ ] **4. Run validation on generated summaries**: Run the deliverables linter script:
  ```bash
  node scripts/validate-deliverables.js
  ```
  - *Expected*:
    - Checks that the Executive Summary is under the word-count budget.
    - Checks that all reports include the required developer disclaimers.
    - Prints `✓ Deliverables validation passed.`
- [ ] **5. Test linter failure recovery**: Edit a report to remove the disclaimer block at the bottom, then run `node scripts/validate-deliverables.js` again.
  - *Expected*:
    - The linter exits with code `1`.
    - It prints a validation error: `[ERROR] Missing mandatory developer disclaimer in report...`
  - Re-add the disclaimer to restore compliance.
