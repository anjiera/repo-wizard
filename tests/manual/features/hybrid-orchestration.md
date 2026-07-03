# Feature Test Plan: Hybrid Orchestration & Concurrency

This test plan defines the manual verification procedure for the **Hybrid Decoupled Runtime Orchestrator** and its concurrent spawning logic in `scripts/run-orchestration.js`.

---

## Prerequisite Setup
1. Ensure your local `repo-wizard` setup is complete.
2. Ensure you have a valid `.repo-wizard/manifest.json` file on disk. You can generate a mock one by running `node scripts/run-mock-harness.js` (which will write a manifest to `.repo-wizard/manifest.json`).

---

## Test Steps & Scenarios

### Scenario 1: CLI Detection & Path A Execution (Parallel Runs)
- [ ] **1. Run the orchestrator in TTY (terminal)**: Open your terminal and run:
  ```bash
  node scripts/run-orchestration.js
  ```
  - *Expected*:
    - The script detects your platform CLI (if installed).
    - It reads the manifest, runs `validate-contracts.js` checks, and starts spawning subagents in parallel.
    - **Progress Bar**: A live, animated progress bar updates smoothly on a single line:
      `Progress: [████░░░░░░] 40% (8/18) - running compliance-auditor`

### Scenario 2: Non-TTY Logging (CI / File Redirection)
- [ ] **2. Run with output redirection**: Redirect execution stdout to a file:
  ```bash
  node scripts/run-orchestration.js > run.log
  ```
- [ ] **3. Audit the log file**: Open `run.log` in your code editor.
  - *Expected*:
    - The log file contains clean, line-by-line logging milestones (no single-line progress updates or `\r` control characters that would clutter CI logs):
      ```text
      [INFO] Spawning compliance-auditor...
      [INFO] Spawning privacy-hardener...
      ```

### Scenario 3: Concurrency Limits
- [ ] **4. Check concurrent execution**: Open a task manager or process inspector while running the orchestrator.
  - *Expected*: No more than 4 specialist agent processes (`node` or CLI instances) run in parallel, confirming the concurrency limit of 4.

### Scenario 4: Path B Fallback (CLI Absent)
- [ ] **5. Disable CLI environment variable**: Run the orchestrator with the CLI disabled:
  - On PowerShell:
    ```powershell
    $env:DISABLE_CLI="true"
    node scripts/run-orchestration.js
    Remove-Item env:DISABLE_CLI
    ```
  - On Bash:
    ```bash
    DISABLE_CLI=true node scripts/run-orchestration.js
    ```
  - *Expected*:
    - The script prints a notice: `[WARN] CLI platform not found. Marking manifest for LLM sequential fallback.`
    - The script updates `.repo-wizard/manifest.json` status to `fallback_to_agent`.
    - Each contract status is updated to `pending_agent_fallback`.
    - Exits cleanly with code `0`.
- [ ] **6. Run sequential fallback**: Trigger the lead agent (`repo-wizard-agent.md`) using `agy run /repo-wizard`.
  - *Expected*: The lead agent reads the manifest, sees `fallback_to_agent`, and spawns the specialists sequentially using the `invoke_subagent` tool calls.
