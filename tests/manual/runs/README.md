# Manual Test Runs Logs

This folder is designed to hold your executed manual test logs. Keeping test execution records here allows you to trace which features were manually verified against which git commit.

---

## Step-by-Step Logging Workflow

When you sit down to perform manual QA:

1. **Create a Run Log File**:
   Copy the master test plan from the parent directory and name the new file with this convention:
   ```bash
   tests/manual/runs/run-YYYYMMDD-commit_hash.md
   ```
   *Example: `tests/manual/runs/run-20260624-18f0144.md`*

2. **Execute Tests & Mark Results**:
   As you go through each test, update the checkboxes:
   - Pass: Change `[ ]` to `[x]` (e.g., `- [x] **1.1 Prerequisite Setup Script**`).
   - Fail: Leave as `[ ]` and append `[FAILED: details of error]` (e.g., `- [ ] **3.1 API Server Dynamic Port Binding** [FAILED: EADDRINUSE errors on port 3000]`).

3. **Stage and Commit**:
   Once finished, commit the run log file to git. This binds your manual QA history directly to your codebase commits.

---

## How to Diff Execution History

Because test runs are written in standard Markdown checklists, you can easily audit test runs:

- **See if a test passed on a specific run**:
  Open the corresponding run markdown file.
- **Find when a test last failed or passed**:
  Run a standard git content search:
  ```bash
  # Find all runs where Level 3 Onboarding passed
  git grep -l "\[x\] \*\*3.3" -- tests/manual/runs/
  
  # Find all runs where Level 3 Onboarding was unchecked (failed/skipped)
  git grep -l "\[ \] \*\*3.3" -- tests/manual/runs/
  ```
