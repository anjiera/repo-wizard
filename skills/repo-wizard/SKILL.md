---
name: repo-wizard
description: Orchestrates the repository onboarding checklist and QA setup. Use when a developer wants to audit their repository and scaffold tailored testing suites, compliance engines, git hooks, documentation tools, and linting configurations.
---

# Repo Wizard

## Overview
An interactive orchestrator workflow designed to analyze a codebase, guide developers through a structured compliance and tooling alignment questionnaire, dynamically screen tools, optimize/deduplicate recommendations, and coordinate specialist subagents to scaffold configurations.

---

## When to Use

### Triggering Conditions
* Starting a new repository setup or onboarding an existing codebase.
* Configuring repository-wide code quality, linting, or formatting rules.
* Integrating testing frameworks (unit, integration, mock databases, E2E).
* Adding regulatory, privacy, accessibility, security compliance tools or certifications.
* Setting up git automation hooks, commit discipline, or licensing/documentation pipelines.
* Explicit user command invocation: `/repo-wizard`, `/rw`, or `/rw-setup`.

### When NOT to Use
* Implementing specific feature logic or writing business code files.
* Debugging compiler/runtime errors unrelated to general infrastructure configurations.
* Running ad-hoc codebase reviews that do not aim to configure tools or project rules.

---

## Core Process

### Legal Terms, Parameter Routing & Consent Gate
Before performing codebase analysis, sizing, or session resume operations:
1. **Parameter Routing Check**: Parse the command parameters and enforce their default values:
   - **Mode Defaults**:
     - If `--headless` is passed: Set `MODE=HEADLESS_LOCAL`.
     - Otherwise (even if other parameters like `--redact`, `--report-path`, or `--tos-path` are passed): Default to `MODE=INTERACTIVE_LOCAL`. CRITICAL: Do NOT run in headless mode or bypass the interactive interview questionnaire if `--headless` is NOT explicitly provided.
   - **Parameter Default Values**:
     - `--mock-cli`: Defaults to `false`. Perform real scans unless explicitly set to `true`.
     - `--redact`: Defaults to `false`. Do not redact reports unless `--redact` or `--redact true` is passed.
     - `--report-path`: Defaults to the workspace root directory.
     - `--tos-path`: Defaults to `<reportRoot>/.repo-wizard/` (i.e. `<workspace-root>/.repo-wizard/`).
   - **Parameter Parsing**:
     - If `--report-path <path>` is passed: Parse the custom parent directory for reports (setting `reportRoot = <path>`). All output paths under `.repo-wizard/` will reside under `reportRoot`.
     - If `--tos-path <path>` is passed: Parse the custom directory for `.tos_agreed` (setting `tosPath = <path>`).
2. **Check Agreement File**: Search for a local hidden state file `.tos_agreed` inside the custom TOS directory (setting `tosPath = <path>`) if `--tos-path <path>` is configured, or inside `<reportRoot>/.repo-wizard/` (i.e. `<reportRoot>/.repo-wizard/.tos_agreed`). There is no global or tool-installation-root fallback: `reportRoot` always resolves to the active workspace root (`process.cwd()`) when no `--report-path` is provided.
3. **Present Disclaimer if Missing**: If this file is missing, do NOT proceed with codebase profiling or setup questions. Instead, immediately output the exact **Terms of Service & Developer Agreement** (disclaimer) in the chat window by reading the canonical text in `references/terms-of-service.md` (located in the `repo-wizard` installation root). Do not run dynamic shell/powershell commands or search the target codebase to locate this text. Ask the user to reply 'y' or 'yes' to agree. Do not perform any further steps until they agree.
4. **Save Agreement**: If accepted:
   - Ensure the parent directory (either `tosPath` or `<reportRoot>/.repo-wizard/`) is created recursively first.
   - Write a JSON file to the resolved `.tos_agreed` path containing:
     - `agreed_by`: The user's login name (retrieved from environment variables like `USERNAME`, `USER`, `LOGNAME`, or by running `whoami`).
     - `timestamp`: The current timestamp in ISO format.
5. **Refuse if Declined**: If declined, stop execution, state that the agent cannot proceed without agreement, and do not write the file.
6. **Proceed**: If the agreement exists, read it and proceed to Codebase Sizing & Analysis.

### Codebase Sizing & Analysis
1. **Target Path Verification Check**: Verify that the active directory `process.cwd()` is valid and readable. If the folder is not readable, halt execution, explain that permissions are missing, and ask the user to fix workspace access.
2. **Unified Pre-Scan Analysis**: Before launching the orchestrator or questionnaire, you MUST execute the unified scan script: `node scripts/initial-codebase-scan.js --report-path <resolved_report_path>`. You must verify the command exited with `0` (success) before proceeding:
   - **General Setup Failure (Exit Code 1)**: If the pre-scan setup command exits with code `1` (e.g. read/write permission errors or directory problems), you MUST halt execution immediately, print the failure details to stdout/stderr (or directly to the user if in chat), and do not invoke any subagents or run any orchestrator script. Even in headless mode, execution must still be strictly halted.
   - **High Sweep Warning Gate (Exit Code 2)**: If the pre-scan command exits with code `2` (the High Sweep Warning), you MUST halt execution immediately. If in interactive mode, display the warning and list of pillars to the user and prompt them to select a specific quality pillar (`SECURITY`, `PERFORMANCE`, `ARCHITECTURE`, `QUALITY`) or rerun with `--pillar ALL` to proceed. If in headless mode, write the warning and quality pillar instructions to stdout/stderr logs and halt. Do NOT invoke any specialist subagents or run the orchestrator script if code `2` is returned.
   - **Other Non-Zero Exit Codes**: If the pre-scan command returns any other non-zero exit code, you MUST immediately halt execution, write the exit code and stderr logs to stdout/stderr, and do not proceed. Even in headless mode where no user is present to respond to prompts, execution must still be strictly halted. Never guess or bypass warning outputs on a non-zero exit code.
3. **Metrics & Sizing Evaluation**: Read the generated `session.json` to extract `totalLOC`, `totalFiles`, and check if `exceedsAdoptionThreshold: true`.
4. **Incremental Adoption Gate**: If `exceedsAdoptionThreshold` is `true`, prompt the user (in interactive mode). Frame the warning professionally, stating that running a full sweep of all specialists and scaffolding configurations simultaneously can lead to exceeding requests-per-minute (RPM) rate limits, provider execution constraints, and other complications.
5. **Gitignore Verification**: Automatically append the `.repo-wizard/` directory to the repository's `.gitignore` or `.agentignore` files.

### Resumability & Session State Check
1. **Interactive Mode**: Check for `<reportRoot>/.repo-wizard/session.json`. Prompt the developer to Resume, Revisit, Report, or Start Fresh. Before overwriting, run the utility script `node scripts/reports-archive.js` to backup all prior configurations and reports (including `session.json`, `manifest.json`, and all compiled markdown/HTML reports under `<reportRoot>/.repo-wizard/reports/<repo-name-here>/`) into `<reportRoot>/.repo-wizard/reports/history/<repo-name-here>/<timestamp>/`, suffixing each archived file with `_YYYYMMDD_HHMMSS` based on the original file's last modified/edited date to preserve accurate age.
2. **Headless Mode**: Check for cached subagent mini-reports (observations) under `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-<agent-name>.md` to allow resuming halted scans.
3. **On-demand Redaction Check**: In both modes, if the user specifies the `--redact` flag and unredacted reports (e.g. `<repo-name-here>-full-report.md`) are already present on disk alongside observations, bypass all sizing steps, questionnaire prompts, and subagent scan runs. Instead, directly compile the redacted reports using the compilation utility `node scripts/reports-compile.js --redact` (writing to `redacted-executive-summary.md` and `redacted-<repo-name-here>-full-report.md` alongside unredacted files), output the generated report URLs, and exit.

---

### Core Profiling & Alignment
1. **Local Interactive Mode**: Present the alignment questionnaire sequentially with section skip controls. Promote user-owned thresholds and select "Generate Reports" mode (generating reports and proposed configuration contracts for the developer's review) vs "Generate Reports & Backlog" mode (generating reports and a prioritized task backlog CSV for project management tools). Avoid naming specific commercial products (e.g. Jira, ClickUp, Trello) and instead refer to them generally as "project management tools".
    - **Review & Confirmation Gate**: Immediately after the user answers the final question, DO NOT proceed to execution. Present a formatted summary of the user's answers and list ONLY the selected sub-agents (do NOT list any skipped or irrelevant sub-agents) along with a 1-sentence description of what each sub-agent does. Prompt the user to review/update their answers or proceed. Only dispatch parameters contracts to specialists and call `run-fallback-sequential-orchestration.js` (or invoke natively in chat) in Optimization & Handoff after the user explicitly confirms they want to proceed.
2. **Headless Mode**: Bypass the questionnaire and live alignment:
   - **Decoupled Relevance Sweep**: Query each subagent with a fast, non-blocking check. Subagents return `relevance: 'High' | 'Medium' | 'Low'` and a `rationale`. Skip full analysis for subagents returning `Low`, and immediately update their status in the manifest to `completed` so they are not treated as pending.
     - **Coordinate Headless Scans**: Write all selected parameter contracts to `<reportRoot>/.repo-wizard/manifest.json`. You **MUST** read [validate-contracts.js](../../scripts/validate-contracts.js) to inspect the validation rules and structure of `CONTRACT_TEMPLATE`. Ensure every contract object inside the `contracts` array contains a valid `task_metadata` block matching the structure of `CONTRACT_TEMPLATE` (setting `target_modules: ["<targetPath>"]`, `language`, `build_system`, `budget_tier`, `execution_environments`, and `execution_mode`). Run `node scripts/run-fallback-sequential-orchestration.js` forwarding `--report-path <reportRoot>` (and other parameters like `--report-style <reportStyle>`, `--mock-cli <isMock>`, and `--redact` if configured) to execute the scans.
     - **Collect Observations**: Subagents execute their scans and save findings directly as mini-reports at `.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-<agent-name>.md`.


### Dynamic Screening & Tool Selection
For each capability needed, recommend candidate tools dynamically after screening them via `tool-auditor.agent` to check vulnerabilities, activity/maintenance, and license compliance.

### Optimization & Handoff
1. **Local Interactive Mode**: Finish the interview first, deduplicate candidates. If running inside the Antigravity chat session, natively invoke the specialist subagents in parallel using the `invoke_subagent` tool (passing custom path parameters and redaction/anonymization instructions directly in the prompt), bypassing the CLI runner. You MUST apply the **Pillar Concurrency & Batching Rule** to partition subagents of the same pillar category into batches of at most 6, waiting for the active batch to complete before starting the next batch. Run verification and VCS rollback on failure.
2. **Headless Mode**: Do NOT make any package installations or write files in the targeted repository. Read and consolidate all subagents' mini-reports from `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-<agent-name>.md`.
3. **Execution & Synchronization Rules**:
   - **Native Override Check**: Do not run or spawn `run-fallback-sequential-orchestration.js` when executing natively inside an Antigravity chat session; instead, proceed directly to parallel native subagent invocation under the Pillar Concurrency & Batching Rule (maximum 6 concurrent subagents per quality pillar category).
   - **Mock-CLI Default**: When spawning `run-fallback-sequential-orchestration.js` (CLI Fallback Mode Only), you MUST default to `--mock-cli false` (or omit the parameter) to ensure a real scan is performed. NEVER pass `--mock-cli true` unless the user explicitly requested it in the prompt.
   - **Enforce Explicit Parameters**: When spawning `run-fallback-sequential-orchestration.js` (CLI Fallback Mode Only), you MUST explicitly pass the configured parameters (such as `--report-path <reportRoot>`, `--report-style <reportStyle>`, `--mock-cli <isMock>`, and `--redact` if configured).
   - **Sync Gate**: You MUST wait for all background specialist subagents to complete their scans, report back, and write their observations and contract files to disk before executing the compilation utility (`reports-compile.js`). If you compile before they finish, Section 4 (Detailed Quality Pillars Analysis) of the Full Technical Report will be blank.
   - **Strict Target Directories**: All specialist observations MUST be written to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-<agent-name>.md` and all subagent contracts MUST be written to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/contracts/<agent-name>-contract.json`. Do NOT place observations or contracts directly in the parent directory (`<reportRoot>/.repo-wizard/reports/<repo-name-here>/`).
   - **No Duplicate Spawning**: Never re-spawn or duplicate a subagent if it is already active. You MUST run the `manage_subagents` tool with `Action: 'list'` to check the list of currently executing subagents. If a subagent is in the list, it is still running, and you must go idle and wait. Only spawn a subagent if it is not in the active subagents list and has not written its observations report.
   - **Subagent Timeout & Triage**: Track the start timestamp of each spawned subagent in the session manifest. If a subagent has been running for longer than **10 minutes** (the fallback timeout), it is considered stuck. You MUST kill the stuck subagent using `manage_subagents` with `Action: 'kill'` and its `conversationId`, write a fallback skipped observation report noting the timeout, mark its status as `failed` in the manifest, and proceed with compiling the remaining reports.
   - **History Directory Isolation**: The archived history folder (`<reportRoot>/.repo-wizard/reports/history/`) is strictly write-only for the archiving script. Under no circumstances should you browse, search, or read files inside the `history/` directory to restore state, parse past sessions, or infer configurations.
   - **No Parameter Invariant Drift from Conversation History**: Never use descriptions, metadata, or execution modes mentioned in the system-provided chat "Conversation History" or "<conversation_summaries>" to determine or override the parameters/mode of the current session. You must only configure the session based on the explicit parameters typed by the user in their current prompt/command.

### Reports & Deliverables Compilation
Generate the deliverables upon scan completion, ensuring all Markdown/HTML reports append the standardized **Developer Empowerment Disclaimer** blockquote (or styled equivalent) to the bottom. Extract `<repo-name-here>` from the URL (for remote) or local directory folder name (for local):

* **Redacted Mode Validation**: If Redacted/Anonymized Mode is active (`isRedact = true` / `--redact true`), you must strictly ensure that when synthesizing report sections, Maturity Model guidance, backlog stories, and conclusion text, you NEVER output the actual repository name, target path, organization name, developer credentials, or project-specific branding. Instead, write neutrally and refer to the project generically (e.g. as 'the target repository', 'the target codebase', 'the workspace', or 'the codebase').

1. **Observations Summary (`<reportRoot>/.repo-wizard/reports/<repo-name-here>/<repo-name-here>-observations.md` & `.html` - Headless Modes Only)**:
  - Document assumptions about what toolchain clues currently exist in the codebase.
  - Highlight guesses about what kinds of compliance standards may or may not be involved.
  - Detail suggested linter, config tweaks, or pre-commit hooks to improve codebase robustness.
2. **The Full Technical Report (`<reportRoot>/.repo-wizard/reports/<repo-name-here>/<repo-name-here>-full-report.md` & `.html`)**:
  - Profile the codebase (LOC, file counts, structure).
  - Log capability mappings, evaluator screening outputs, and the selection ledger (using default recommendations in headless mode).
  - In backlog mode, append a high-level summary of the generated issues and recommending agents.
3. **The Executive Summary (`<reportRoot>/.repo-wizard/reports/<repo-name-here>/<repo-name-here>-executive-summary.md` & `.html`)**:
  - Write a constructive, positive high-level overview in Markdown and HTML.
  - Structure strictly into 3 sections, with the paragraph and word counts of each section aligning with the target limits for the active codebase sizing tier defined in scripts/report-constants.js: Section 1 (Codebase Health & Strengths), Section 2 (Tooling & Compliance Opportunities), and Section 3 (Rollout Roadmap).
4. **Upgrade Mismatch Hook**: If a weekend vibe project handles complex compliance/payment/sensitive operations, append the mismatch hook to the bottom of all reports:
  > *"To improve this repository in the direction of [Production Tool / Enterprise System] standard, copy this codebase locally and run /repo-wizard to begin an interactive step-by-step implementation plan."*
5. **Backlog CSV & Toolchain Summary**:
  - Write JIRA backlog CSV (`<reportRoot>/.repo-wizard/backlog.csv` - Backlog Mode only).
  - Write toolchain doc (`docs/TOOLCHAIN.md` - "Generate Reports" Mode only).
6. **Post-Execution Output Summary**:
  - Upon successfully compiling all reports and deliverables, output a clear, friendly summary message to the developer in the chat window.
  - List each generated file with clickable absolute file URLs (using the file scheme with forward slashes, e.g. formatting the absolute path to the report as a file URL: [Executive Summary]\(file:///path/to/repo-wizard-executive-summary.md\) using an escaped parenthesis).
  - Provide a brief 1-sentence explanation of what each report contains and what the developer's next step should be with it (e.g. reviewing recommendations, importing backlog tickets, or verifying configurations).
  - Include an explicit line documenting the status of the `--mock-cli` flag evaluated during the scan (stating whether it was executed in MOCK mode or REAL mode).



---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "I should write the config files as soon as the user selects the tool." | You must complete the entire interview first to optimize and deduplicate dependencies across categories. |
| "I don't need to ask permission for each category if the user ran /repo-wizard." | Section skip checks are mandatory to prevent questionnaire fatigue and configure only what is relevant. |
| "It's fine to overwrite existing tool configurations." | You must merge configurations or parse ASTs to protect existing configurations, rolling back via Git if verification fails. |
| "We don't need historical versions of the setup session." | Archiving previous sessions in `history/` is crucial for auditing infrastructure changes over time. |

---

## Red Flags
* Scaffolding tool files or running installation commands mid-interview before completing all questions.
* Overwriting `.gitignore` without adding `.repo-wizard/` to the ignore list on startup.
* Proposing unsupported/outdated tools without running them through the evaluator.
* Leaving the codebase in a broken compilation state after a verification build fail.
* Capturing user conversations or terminal install logs in `repo-wizard-full-report.md`.

---

## Verification
- [ ] Check for `.tos_agreed` (with username and timestamp) is performed before codebase sizing and session checks.
- [ ] Codebase size is estimated, monorepo state detected, and Incremental Adoption prompted if LOC > threshold configured in report-constants.js.
- [ ] Active session is checked on startup, prompting Resume/Revisit/Report/Start Fresh.
- [ ] Prior configs/session files are archived with YYYYMMDD_HHMMSS timestamp suffixes in `.repo-wizard/history/` before overwrites.
- [ ] Opt-in/Skip questions are asked at the beginning of each category.
- [ ] Tool recommendations are dynamically audited by `tool-auditor.agent`.
- [ ] Final configurations are optimized for overlapping capabilities (deduplicated).
- [ ] Scaffolding is delegated via parameters contract with rollback verification checks.
- [ ] Headless observations `.repo-wizard/reports/<repo-name-here>/<repo-name-here>-observations.md` & `.html` are generated (in headless modes).
- [ ] Full Technical Report `.repo-wizard/reports/<repo-name-here>/<repo-name-here>-full-report.md` & `.html` are generated with relative links and default tool recommendation rationale (in headless mode).
- [ ] Constructive `.repo-wizard/reports/<repo-name-here>/<repo-name-here>-executive-summary.md` & `.html` are generated (3 sections, with paragraphs and words aligning with report-constants.js thresholds).
- [ ] Mismatch hook with updated wording (no "upgrade" command) is appended to all generated reports when a weekend vibe project style handles complex sensitive/compliance operations.
- [ ] All Markdown and HTML reports have the Developer Empowerment Disclaimer blockquote appended.
