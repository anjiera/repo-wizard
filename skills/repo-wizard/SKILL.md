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

### Phase 1: Codebase Sizing & Analysis
Before displaying the questionnaire, size the repository to prevent API token exhaustion and cost issues:
1. **Repository Sweep**: Detect primary languages, build configurations (e.g., `package.json`, `build.gradle.kts`, `Cargo.toml`), and folder structures.
2. **Metrics Collection**: Estimate lines of code (LOC), count files, and identify monorepo/single-module layouts.
3. **Incremental Adoption Gate**: If the codebase contains multiple submodules or is larger than **10,000 LOC**, you **MUST** prompt the user:
   > *"This repository appears to be a large codebase ([count] lines). To prevent running out of AI tokens and to minimize API costs, should we scaffold your unit tests and QA configurations incrementally (e.g. library-by-library or module-by-module) rather than auditing the entire project at once?"*
4. **Gitignore Verification**: Automatically append the `.repo-wizard/` directory to the repository's `.gitignore` or `.agentignore` files to prevent tracking local alignment states.

### Phase 2: Resumability & Session State Check
On startup, verify the existence of a prior wizard session:
1. **State Directory**: Check for `.repo-wizard/session.json`.
2. **If Incomplete Session is Found**: Display:
   > *"We found an active wizard session. Would you like to: [Resume, Revisit previous answers, Report selected choices, Start Fresh]"*
3. **If Completed Session is Found**: Display:
   > *"We found a completed setup session. Would you like to: [Revisit previous answers, Report selected choices, Start Fresh]"*
4. **Action Handlers**:
   - **Resume**: Skip answered questions, proceeding to the next unanswered question.
   - **Revisit**: Show a list of categories to let the developer modify their previous answers.
   - **Report**: Display a formatted markdown summary in the chat of all tool selections and gates selected so far, then return to the prompt.
   - **Start Fresh**: Archive the current setup and begin from the first question.
5. **Session Archiving**: Before clearing the state or modifying answers during *Revisit*, copy the active `session.json` and `.repo-wizard/audit-report.md` into `.repo-wizard/history/` using timestamp suffixes:
   - `session_YYYYMMDD_HHMMSS.json`
   - `audit-report_YYYYMMDD_HHMMSS.md`

### Phase 3: Interactive Alignment Questionnaire
Present the questionnaire sequentially. Present a clear disclaimer at the start:
> *Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.*

For each of the major sections (1. Context & Goals, 2. Compliance & Regulations, 3. Stack & Performance, 4. Friction & Quality), implement **Section-Level Skip Controls**:
1. **Opt-In Verification**: Before starting a category (e.g. *Regulatory & Compliance*), ask:
   > *"Would you like to configure tools and rules for [Section Name], or skip this section?"*
2. **Skip Action**: If skipped, bypass all questions in that category. Store `"[Section Name]": {"status": "skipped"}` in `.repo-wizard/session.json`, and note the omission in `.repo-wizard/audit-report.md`.
3. **Developer-Owned Thresholds**: Let the user decide thresholds (e.g. choosing 50% vs 90% test coverage) and gate strictness (e.g., soft local format check vs. build-blocking pre-commit git hooks).

### Phase 4: Dynamic Screening & Tool Selection
For each capability needed (e.g. *Vulnerability Scanning*, *A11y Testing*), recommend tools based on stack/budget:
1. **Tool Screening Protocol**: Screen candidate tools dynamically using a security auditor (`tool-evaluator.agent`) to verify:
   - **Vulnerabilities**: Ensure no active critical CVEs in public registries.
   - **Maintenance**: Check that a commit was made in the last 12 months, open-to-closed issues ratio is healthy, and there are multiple active maintainers.
   - **License legality**: Flag copyleft conflicts (e.g., AGPL in a commercial closed-source SaaS).
2. **Warning Ledger**: Flag flagged or borderline tools in the chat layout before final selection.

### Phase 5: Optimization & Handoff
Perform execution in a strict sequence:
1. **Stage 1 (Complete Interview)**: Finish all questions and candidate screening before scaffolding or editing files.
2. **Stage 2 (Deduplication)**: Audit selected tools to see if a single tool covers multiple capabilities (e.g., configuring *ESLint* to handle formatting, accessibility rules, and translation limits).
3. **Stage 3 (Handoff)**: Dispatch execution contracts containing paths, install commands, and config contents to specialized installer subagents (e.g. `tool-scaffolder.agent`).
4. **Rollback & Verification**: Run build tests after each specialist installation. If the build breaks, run rollback commands (`git checkout -- .`, `git clean -fd`) and report the logs to the orchestrator.

### Phase 6: Reporting
Upon completion, write two reports:
1. **Audit Report (`.repo-wizard/audit-report.md`)**:
   - System Profile (LOC, language structure).
   - Capability mapping & screening logs (including rejected tools and skip notes).
   - Selection Ledger: `"For [Capability Y], the repo-wizard suggested [Tools]. The developer selected [Tool B] [Reason: Rationales]."`
2. **Developer Toolchain Summary (`docs/TOOLCHAIN.md`)**:
   - Name and purpose of each configured tool.
   - Clickable links to the configuration files in the repo (e.g. [eslint.config.js](file:///d:/DevSandbox/agy-projects/repo-wizard/eslint.config.js)).
   - Link references to the tools' official docs.

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
* Capturing user conversations or terminal install logs in `audit-report.md`.

---

## Verification
- [ ] Codebase size is estimated, monorepo state detected, and Incremental Adoption prompted if LOC > 10,000.
- [ ] Active session is checked on startup, prompting Resume/Revisit/Report/Start Fresh.
- [ ] Prior configs/session files are archived with YYYYMMDD_HHMMSS timestamp suffixes in `.repo-wizard/history/` before overwrites.
- [ ] Opt-in/Skip questions are asked at the beginning of each category.
- [ ] Tool recommendations are dynamically audited by `tool-evaluator.agent`.
- [ ] Final configurations are optimized for overlapping capabilities (deduplicated).
- [ ] Scaffolding is delegated via parameters contract with rollback safety checks.
- [ ] Both `.repo-wizard/audit-report.md` and [docs/TOOLCHAIN.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/TOOLCHAIN.md) are generated with absolute `file://` links.
