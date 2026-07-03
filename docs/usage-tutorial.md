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

### Mode 1: Interactive Local Mode (`MODE=INTERACTIVE_LOCAL`)
Recommended for local developer onboarding and interactive configuration.
* **Command:** `/repo-wizard` (or `agy run repo-wizard` depending on agent env).
* **Process:**
  1. **TOS Gate:** Prompts you to accept the Terms of Service.
  2. **Opt-In Categories:** At the start of each section (Testing, Compliance, etc.), it asks if you want to configure tools or skip that category entirely.
  3. **Screening Ledgers:** Screens candidate tools via `tool-auditor` and prompts you to select preferred tools.
  4. **Scaffolding/Backlog Handoff:** Installs tools and generates reports.

### Mode 2: Headless Local Mode (`MODE=HEADLESS_LOCAL`)
A non-blocking scan of the active local repository, ideal for scripts or background sweeps.
* **Command:** `/repo-wizard --headless`
* **Process:**
  - Bypasses interactive prompts.
  - Detects tech stack and applies **best-guess heuristics** to determine recommendations.
  - Automatically runs a subagent relevance sweep, audits tools, and outputs report files directly.

### Mode 3: Headless Remote Mode (`MODE=HEADLESS_REMOTE`)
Used to scan a remote public Git repository.
* **Command:** `/repo-wizard <github-url>` (e.g., `/repo-wizard https://github.com/user/my-library`)
* **Process:**
  - Clones the repository to a temporary directory.
  - Conducts a decoupled subagent relevance sweep.
  - Performs best-guess recommendations based on codebase heuristics.
  - Compiles the full technical report and executive summary.

---

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
* **Low Relevance:** Bypassed completely. For example, if no Python files or notebooks exist, the `notebook-auditor-agent` returns `Low` relevance, and its checklist is skipped.

---

## 4. How to Interact with the Onboarding Questionnaire

When running in **Interactive Local Mode**, `repo-wizard` prints the alignment questionnaire and asks you to reply with adjustments or say "Proceed". Depending on how you invoke the agent, your interaction flow will differ:

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

### Option C: Via the Local Dashboard UI
If you prefer a visual web interface:
1. Run the local dashboard server:
   ```bash
   node scripts/dashboard-server.js
   ```
2. Open `http://localhost:3000` in your browser.
3. You can review compiled reports, view active manifests, and manage your backlog configuration presets interactively.

### Option D: Relocating Output Paths (Advanced Settings)
By default, the wizard creates a `.repo-wizard/` folder in the root of the targeted repository to store manifests, sessions, observations, and compiled deliverables, and looks for `.tos_agreed` in the tool's installation root. You can customize these locations using the following parameters:

#### `--report-path <path>`
Relocates all generated reports, manifest parameters, and session JSON files for the current analysis to the specified custom parent directory.
* **CLI / Chat usage**:
  ```bash
  /repo-wizard --report-path D:\DevSandbox\custom_reports
  ```
* **Dashboard UI**: Expand the **Advanced Settings** accordion on the codebase selector page to configure the custom parent path.

#### `--tos-path <path>`
Relocates the `.tos_agreed` Terms of Service signature validation file to the specified custom directory.
* **CLI / Chat usage**:
  ```bash
  /repo-wizard --tos-path D:\DevSandbox\custom_tos
  ```
* **Dashboard UI**: Expand the **Advanced Settings** accordion on the codebase selector page to customize the TOS validation path.

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
* *Total word count is restricted to under 450 words total across all sections.*

### 3. Tabular Backlog CSV (`backlog.csv` - Backlog Mode Only)
A CSV backlog formatted for bulk-importing into task managers (Jira, ClickUp, Azure DevOps). Each row includes the user story, impact area, action items, recommending subagent attribution, and the mandatory **Developer Empowerment Disclaimer**.

### 4. Developer Toolchain Summary (`docs/TOOLCHAIN.md` - Scaffolding Mode Only)
Saved to your public documentation folder to onboard new developers, containing configuration file paths and official documentation links for the active tools.

---

## ⚠️ Disclaimer & Legal Safety

> [!IMPORTANT]
> **No Advice Provided:** The tools, checklists, and scanning outputs generated by `repo-wizard` are educational references and engineering starting points. They do not constitute legal, financial, compliance, regulatory, or safety advice. Developers must perform their own review of recommendations, configurations, and licenses to ensure compatibility with their organizational standards and local laws.
