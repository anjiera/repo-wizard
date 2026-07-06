# Feature Test Plan: Tooling Engine & VCS Rollbacks

This test plan defines the manual verification procedure for the **Repo Wizard Tooling Engine** (`tooling-engineer`) and its git-rollback safety mechanism.

---

## Prerequisite Setup
1. Ensure your local git repository is clean (`git status` shows nothing to commit).

---

## Test Steps & Scenarios

### Scenario 1: Dirty Repository Guard
- [ ] **1. Create a dirty state**: Edit any tracked file (e.g. add a dummy comment to `README.md`) but do not stage or commit it.
- [ ] **2. Run a tooling task**: Trigger the scaffolder agent or run a CLI scan.
  - *Expected*:
    - The scaffolder run halts immediately.
    - It prints a validation warning: `[ERROR] Git working tree is dirty. Please commit or stash changes before writing configurations.`
- [ ] **3. Restore clean state**: Discard your changes:
  ```bash
  git restore README.md
  ```

### Scenario 2: Successful Tooling & Configuration Presets
- [ ] **4. Run a valid tool run**: Trigger tooling for one of the presets (e.g. React Router or Zustand).
  - *Expected*:
    - The engine writes config files to the workspace.
    - It executes the build compilation check (`npm run build` or similar validation commands).
    - If the build passes, it automatically commits the changes using Conventional Commits format (e.g., `feat(tooling): configure zustand presets`).

### Scenario 3: Automated VCS Rollback on Compilation Failures
- [ ] **5. Inject a broken configuration**: Run a tooling step, but intentionally inject a syntax error into a generated configuration file (e.g., write a malformed JSON file or JavaScript file with a syntax error).
- [ ] **6. Trigger validation check**: Run the scaffolder’s verification command.
  - *Expected*:
    - The build/compilation check fails (exits with code `1`).
    - The scaffolder prints an audit error detailing the compile/linter failure.
    - **Automated Rollback**: The scaffolder executes `git reset --hard HEAD` and `git clean -fd`.
- [ ] **7. Verify workspace restoration**: Run `git status` in your terminal.
  - *Expected*:
    - The working directory is completely clean.
    - The broken configuration file has been deleted, and no partial files remain on disk, proving the rollback successfully protected your workspace.
