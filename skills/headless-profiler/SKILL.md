---
name: headless-profiler
description: Guides agents through headless codebase profiling on repositories, inferring project intent/audience from existing configurations, identifying missing tools, and generating observations, full technical, and executive summaries. Use when scanning a repository in headless mode.
---

## Overview
A specialized codebase profiling workflow designed to scan local workspaces in headless mode, infer compliance target requirements and engineering design goals from code clues, and compile detailed audits and summaries without blocking for developer interaction.

---

## When to Use

### Triggering Conditions
* Performing a fast, non-blocking check on the active workspace.
* Setting the execution parameter to `MODE=HEADLESS`.
* Invoked when parameter routing detects `/repo-wizard --headless`.

### When NOT to Use
* Running the wizard interactively on the local workspace where a dialogue with the developer is desired (`MODE=INTERACTIVE_LOCAL`).
* Implementing code configurations directly or running VCS package installations on the workspace.

---

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-headless-profiler.md` under Phase 3 / Phase 4.

### Phase 1: Parameter Routing & TOS Verification
1. **TOS Verification:** Search for `.tos_agreed` in `.repo-wizard/` or the workspace root. If missing, halt execution and present the Terms of Service & Developer Agreement. Once accepted by the operator, proceed.
2. **Mode Switch Check:**
    - If `--headless` is passed: Set `MODE=HEADLESS`.
    - Otherwise (even if other parameters like `--redact`, `--report-path`, or `--tos-path` are passed): Default to `MODE=INTERACTIVE_LOCAL`. CRITICAL: Do NOT run in headless mode or bypass the interactive interview questionnaire if `--headless` is NOT explicitly provided.

### Phase 2: Decoupled Relevance Sweeps
1. **Lightweight Relevance Query:** The orchestrator queries all 20+ specialized subagents.
2. **Relevance Verdict:** Each agent performs a fast metadata check and returns `relevance: 'High' | 'Medium' | 'Low'` and a `rationale`.
3. **Execution Filter:** The orchestrator ignores agents returning `Low` relevance to save tokens and execution time. You MUST update the status of all `Low` relevance agents to `completed` in the manifest on startup so they are not treated as pending.


### Phase 3: Headless Subagent Audit
1. **Non-blocking Run:** Relevant subagents run in headless mode (following Section 10 of the protocol), skipping interactive inputs and scaffolding/modifications.
2. **Observations Output:** Each subagent saves its observations report to `.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-<agent-name>.md`.
3. **Caching & Resumability:** If an agent's mini-report already exists from a previous run, reuse it to support resuming halted scans.
4. **Execution & Synchronization Rules**:
   - **Mock-CLI Default**: When running scans, you MUST default to `--mock-cli false` (or omit the parameter) to ensure a real scan is performed. NEVER pass `--mock-cli true` unless the user explicitly requested it in the prompt.
   - **Sync Gate**: You MUST wait for all background specialist subagents to complete their scans, report back, and write their observations and contract files to disk before executing the compilation utility (`reports-compile.js`). If you compile before they finish, Section 4 (Detailed Quality Pillars Analysis) of the Full Technical Report will be blank.
   - **Strict Target Directories**: All specialist observations MUST be written to `.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-<agent-name>.md` and all subagent contracts MUST be written to `.repo-wizard/reports/<repo-name-here>/contracts/<agent-name>-contract.json`. Do NOT place observations or contracts directly in the parent directory (`.repo-wizard/reports/<repo-name-here>/`).
   - **No Duplicate Spawning**: Never re-spawn or duplicate a subagent if it is already active. You MUST run the `manage_subagents` tool with `Action: 'list'` to check the list of currently executing subagents. If a subagent is in the list, it is still running, and you must go idle and wait. Only spawn a subagent if it is not in the active subagents list and has not written its observations report.
   - **Subagent Timeout & Triage**: Track the start timestamp of each spawned subagent in the session manifest. If a subagent has been running for longer than **10 minutes** (the fallback timeout), it is considered stuck. You MUST kill the stuck subagent using `manage_subagents` with `Action: 'kill'` and its `conversationId`, write a fallback skipped observation report noting the timeout, mark its status as `failed` in the manifest, and proceed with compiling the remaining reports.




### Phase 4: Report Amalgamation & Compilation
1. **Consolidate Observations:** The orchestrator reads all agent mini-reports and consolidates them into the final reports.
2. **Target File Outputs:** Generate the following files in the local `.repo-wizard/reports/<repo-name-here>/` directory:
   - `<repo-name-here>-observations.md` & `.html`
   - `<repo-name-here>-full-report.md` & `.html`
   - `<repo-name-here>-executive-summary.md` & `.html`
3. **Wording Hook Tweak:** If a weekend vibe project handles complex compliance/payment/sensitive operations, append the mismatch hook to the bottom of all reports:
   > *"To improve this repository in the direction of [Production Tool / Enterprise System] standard, copy this codebase locally and run /repo-wizard to begin an interactive step-by-step implementation plan."*
4. **Disclaimer**: Append the Developer Empowerment Disclaimer to the bottom of all generated reports.

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "We should write files to the active repository directory." | Headless mode is read-only. Report files must only be saved locally in the operator's workspace `.repo-wizard/` directory. |

---

## Red Flags
* Blocking the headless execution loop to ask the user standard interview questions.
* Writing configuration files or installing packages during a headless profiling run.
* Missing the Developer Empowerment Disclaimer at the bottom of the observations or executive summary reports.

---

## Verification
- [ ] Upgrade / improvement hook is correctly appended to reports with the updated wording (no "upgrade" word in command).
- [ ] Headless routing (`MODE=HEADLESS`) is triggered via `headless` or `--headless` options.
- [ ] Suffix `<repo-name-here>` is correctly derived and appended to reports and mini-reports.
- [ ] Decoupled relevance sweeps are run, skipping Low-relevance agents.
- [ ] Agent mini-reports are saved and can be read to resume execution.
