# Repo Wizard Usage Tutorial

This tutorial guides you through analyzing, auditing, and scaffolding tooling in your repositories using `repo-wizard`. 

Whether you are starting a new project (Greenfield) or auditing an existing codebase (Brownfield), this guide explains how the orchestrator and specialized subagents analyze your stack and deliver recommendations.

---

## 1. Greenfield vs. Brownfield Scenarios

### Greenfield Repositories (New Projects)
When initialized in a clean or newly created workspace, `repo-wizard` acts as a repository bootstrapper:
1. It gathers your target tech stack, budget, and compliance needs via the questionnaire.
2. It screens tools and scaffolds configuration files (e.g., `.eslintrc.json`, `axe.config.json`, Git pre-commit hooks) from scratch.
3. It creates a developer summary guide in `docs/TOOLCHAIN.md` detailing the newly installed tools.

### Brownfield Repositories (Existing or Legacy Projects)
For established codebases, `repo-wizard` acts as an audit and gap-analysis assistant:
1. **Current Tooling Sizing:** The orchestrator performs a token-efficient pre-scan. It analyzes your active dependencies, files structure, lint configs, and build scripts to build a ledger of your *existing* tools.
2. **Gap Analysis & Recommendations:** It identifies security, compliance, accessibility, or testing gaps. It then recommends a tailored list of **additional** tools and rules.
3. **Trigger Heuristics:** These recommendations are determined based on:
   - **Interactive Developer Interview:** Your answers to compliance and tooling questionnaires.
   - **Best-Guess Heuristics (Headless Mode):** The agent's automated inference of tech stack constraints (e.g., if React is detected without accessibility testing, it flags JSX-a11y and Axe-core).

---

## 2. Execution Modes

### Mode 1: Interactive Mode (`MODE=INTERACTIVE_LOCAL`)
Recommended for developer onboarding and interactive configuration.
* **Command:** `/repo-wizard` (or `agy run repo-wizard` depending on agent env).
* **Process:**
  1. **TOS Gate:** Prompts you to accept the Terms of Service.
  2. **Opt-In Categories:** At the start of each section (Testing, Compliance, etc.), it asks if you want to configure tools or skip that category entirely.
  3. **Screening Ledgers:** Screens candidate tools via `tool-auditor` and prompts you to select preferred tools.
  4. **Scaffolding/Backlog Handoff:** Installs tools and generates reports.

### Mode 2: Headless Mode (`MODE=HEADLESS`)
A non-blocking scan of the active repository, ideal for scripts or background sweeps.
* **Command:** `/repo-wizard --headless`
* **CLI Execution (via `agy` CLI):**
  If running the command via the `agy` CLI's print mode (`-p` / `--print`), it may exceed the default 5-minute CLI timeout. To prevent this, increase the timeout or run interactively (`-i` / `--prompt-interactive`) to see live progress:
  - **Option A (Increased print timeout):**
    ```bash
    agy --dangerously-skip-permissions --print-timeout 10m -p "/repo-wizard --headless"
    ```
  - **Option B (Interactive live output):**
    ```bash
    agy --dangerously-skip-permissions -i "/repo-wizard --headless"
    ```
* **Process:**
  - Bypasses interactive prompts.
  - Detects tech stack and applies **best-guess heuristics** to determine recommendations.
  - Automatically runs a subagent relevance sweep, audits tools, and outputs report files directly.



## 3. Decoupled Subagent Relevance Sweep

To optimize token usage and avoid redundant analyses on large codebases, the lead orchestrator runs a **Decoupled Subagent Relevance Sweep** before starting a deep audit:

```
                  ┌──────────────────────┐
                  │   Lead Orchestrator  │
                  └──────────┬───────────┘
                             │ Dispatches metadata check
                             ▼
               ┌───────────────────────────┐
               │  Specialist Specialist... │
               └─────────────┬─────────────┘
                             │ Returns JSON verdict
                             ▼
              { "relevance": "High|Medium|Low", 
                "rationale": "Explanation" }
```

* **High / Medium Relevance:** The specialist agent is queued to run its full check.
* **Low Relevance:** Bypassed completely. For example, if no Python files or notebooks exist, the `notebook-auditor` returns `Low` relevance, and its checklist is skipped.

---

## 4. Staged Sweeps (Pillar Filters) & Sweep Warning Gates

Auditing large or complex codebases can consume significant AI tokens. To mitigate this risk, `repo-wizard` supports **Staged Sweeps** (also known as Quality Pillar Sweeps) and enforces warning gates during headless scans.

### 4.1 Staged Sweep Routing (`--pillar`)
Instead of running all 27 specialized agents concurrently, you can restrict audits to a specific Quality Pillar by passing the `--pillar` command-line parameter. If this parameter is omitted, it defaults to executing a full sweep of all relevant quality pillars. Valid options are:
*   `SECURITY` (e.g. Rate limiting, API hardening, CORS policies)
*   `PERFORMANCE` (e.g. Memory leaks, async race conditions, render cycles)
*   `ARCHITECTURE` (e.g. OpenAPI schemas, compiled toolchains, formal proofs)
*   `QUALITY` (e.g. Accessibility WCAG compliance, unit testing, git hook setups)
*   `ALL` (Bypasses staging gates to sweep all relevant pillars simultaneously)

**Example Staging Commands:**
```bash
# 1. Run only the security pillar
node scripts/initial-codebase-scan.js --pillar SECURITY
node scripts/run-fallback-sequential-orchestration.js

# 2. Run performance audits incrementally on top of security results
node scripts/initial-codebase-scan.js --pillar PERFORMANCE
node scripts/run-fallback-sequential-orchestration.js
```

### 4.2 State Merging & Incremental Archiving
Staged sweeps leverage two safety features to prevent data loss:
1.  **Incremental State Merging**: Subsequent setup scans automatically read the existing manifest and preserve the `completed` status of other pillars. For example, running the `PERFORMANCE` setup scan will keep prior `SECURITY` audit results marked as `completed` rather than overwriting them.
2.  **Incremental Archiving**: The cleanup engine automatically target-prunes only observation and contract files in the `agents/` and `contracts/` folders belonging to the active `--pillar` stage. Other pillars' observations are left untouched, enabling the compiler to compile a single comprehensive document when all stages are complete.

### 4.3 High Agent Count Warning Gate
To mitigate token consumption during headless scans:
*   If the relevance sweep identifies **more than 6 active relevant specialists** for a codebase, and no `--pillar` parameter is specified, the setup scan fails fast and **exits with code 2**.
*   The terminal output will display instructions on how to stage your sweep by pillar, or how to bypass the warning by passing `--pillar ALL`.

---

## 5. How to Interact with the Onboarding Questionnaire

When running in **Interactive Mode**, `repo-wizard` prints the alignment questionnaire and asks you to reply with adjustments or say "Proceed". Depending on how you invoke the agent, your interaction flow will differ:

### Option A: Via the Editor's IDE Chat Sidebar (Recommended)
If you run `/repo-wizard` inside the editor's Antigravity chat panel/sidebar GUI:
* The conversation session remains alive and continuous.
* You can simply type "Proceed" or your adjustments directly into the chat input, and the agent will receive it immediately and continue without restarting.

### Option B: Via the Terminal CLI
If you run `agy --dangerously-skip-permissions -p "/repo-wizard ..."` on the command line:
* `agy` runs in single-shot mode. It prints the questionnaire, saves the session state to `.repo-wizard/session.json` and the active session pointer to `.repo-wizard/last_session_path.json`, and then exits back to your terminal prompt.
* **To reply and resume the session from the terminal**, run another single-shot command passing your reply as the prompt:
  ```bash
  agy --dangerously-skip-permissions -p "/repo-wizard Proceed"
  ```
  The agent will automatically read your saved session, apply your response, and continue the execution.

### Option C: Relocating Output Paths (Advanced Settings)
By default, the wizard creates a `.repo-wizard/` folder in the root of the targeted repository (the active workspace directory) to store manifests, sessions, observations, and compiled deliverables, and looks for `.tos_agreed` inside that same `.repo-wizard/` folder. You can customize these locations using the following parameters:

#### `--report-path <path>`
Relocates all generated reports, manifest parameters, and session JSON files for the current analysis to the specified custom parent directory.
* **CLI / Chat usage**:
  ```bash
  /repo-wizard --report-path D:\DevSandbox\custom_reports
  ```

#### `--tos-path <path>`
Relocates the `.tos_agreed` Terms of Service signature validation file to the specified custom directory.
* **CLI / Chat usage**:
  ```bash
  /repo-wizard --tos-path D:\DevSandbox\custom_tos
  ```

#### `--redact`
Generates redacted copies of the final reports (`redacted-executive-summary.md` and `redacted-<repo-name>-full-report.md` alongside their HTML versions) in the same reports directory. This allows sharing the reports with external parties without exposing sensitive git URLs, repository names, or local file system paths. You can also retroactively compile redacted reports on a completed scan:
* **CLI / Chat usage**:
  ```bash
  /repo-wizard --redact
  ```
* **Retroactive Compilation**:
  ```bash
  node scripts/reports-compile.js --redact
  ```

---

## 5. Understanding Deliverables

Every successful scan compiles deliverables under the `.repo-wizard/reports/<repo-name>/` directory (automatically added to your gitignore):

### 1. Full Technical Report (`<repo-name>-full-report.md` & `.html`)
A comprehensive audit log detailing detected stack size, candidate tools evaluated, final selections, and detailed implementation rationales.

### 2. Executive Summary (`<repo-name>-executive-summary.md` & `.html`)
A high-level summary designed for engineering leads and stakeholders. It follows a strict layout:
* **Section 1: Codebase Health & Strengths:** Positively frames clean patterns already present in the codebase.
* **Section 2: Tooling & Compliance Opportunities:** Suggests constructive additions (e.g. CCPA data purging) in a neutral, non-blaming tone.
* **Section 3: Rollout Roadmap:** Describes how to distribute the recommended tasks across standard sprints.
* *Each section's paragraph and word count limits align dynamically with the target limits for the active codebase sizing tier defined in report-constants.js.*

### 3. Tabular Backlog CSV (`backlog.csv` - "Generate Reports & Backlog" Mode Only)
A CSV backlog formatted for bulk-importing into task managers (Jira, ClickUp, Azure DevOps). Each row includes the user story, impact area, action items, recommending subagent attribution, and the mandatory **Developer Empowerment Disclaimer**.

### 4. Developer Toolchain Summary (`docs/TOOLCHAIN.md` - "Generate Reports" Mode Only)
Saved to your public documentation folder to onboard new developers, containing configuration file paths and official documentation links for the active tools.

### 5. Redacted Reports (`redacted-executive-summary.md` and `redacted-<repo-name>-full-report.md` along with `.html` versions)
Generated alongside the unredacted reports when `--redact` is active. They contain the identical recommendations, timelines, and backlog items but with sensitive repository names, file system paths, and git clone URLs fully anonymized to generic placeholders.

---

## ⚠️ Disclaimer & Legal Safety

> [!IMPORTANT]
> **No Advice Provided:** The tools, checklists, and scanning outputs generated by `repo-wizard` are educational references and engineering starting points. They do not constitute legal, financial, compliance, regulatory, or safety advice. Developers must perform their own review of recommendations, configurations, and licenses to ensure compatibility with their organizational standards and local laws.
