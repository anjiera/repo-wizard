# Feature Specifications - Repo Wizard Multi-Agent System (`repo-wizard`)

This document defines the functional requirements, architectural designs, data contract interfaces, and execution specifications for the **Repo Wizard** lead orchestrator and its network of specialized subagents.

---

## ️ 1. Lead Orchestrator (`repo-wizard.agent` / `/repo-wizard`)

The lead orchestrator acts as the customer-facing concierge and manager of the repository analysis and scaffolding lifecycle. It determines project scope, guides the developer through interactive alignment, audits candidate tools, and coordinates specialists.

### 1.1 Sizing & Analysis Phase
Before asking the questionnaire, the agent runs a token-efficient directory analysis to size the repository.
* **Requirements:**
 1. Detect the primary programming languages, build systems (npm/package.json, gradle/settings.gradle, cargo/Cargo.toml, maven/pom.xml, etc.), and folder structures.
 2. Count the number of files and estimate lines of code (LOC).
 3. Identify if the repository is a monorepo (multiple package files or Gradle modules) or a single-module project.
 4. If the codebase is larger than 10,000 LOC or contains multiple submodules, the agent must prompt the user with the **Incremental Adoption Question** (preventing token exhaustion and API cost overflow).

### 1.2 Interactive Alignment Questionnaire
The wizard guides the developer through a structured interactive questionnaire (detailed in [brainstorming_notes.md](brainstorming_notes.md)), covering:
1. *Context & Goals:* Refactoring vs Greenfield, Team Profile, Commercial Release target, Tooling Budget (Free vs Premium/Paid).
2. *Technical Stack & Runtime:* Target platforms (IoT, Desktop, Web, Mobile), runtime hardware constraints, and build configurations.
3. *Friction & Gates:* Testing preferences, coverage thresholds, git workflow restrictions, and execution environments (local, pre-commit, remote CI, background crons).
4. *Compliance Triggers:* Interactive questions that flag regulatory needs (HIPAA, SOC 2, ISO 27001, GDPR, DO-178C, ISO 26262, EU AI Act, GLI, etc.).

* **Section-Level Skip Controls:**
 * *Opt-In Verification:* At the beginning of each major section of the interview (e.g., Compliance Frameworks, Testing Suites, Documentation Pipeline), the wizard must ask the user: *"Would you like to configure tools and rules for [Section Name], or skip this section?"*
 * *Skip Action:* Selecting to skip will bypass all remaining questions and recommendations in that specific category, jumping immediately to the next section.
 * *State Recording:* The skipped category must be stored in `.repo-wizard/session.json` as `"[Section Name]": {"status": "skipped"}`.
 * *Audit Recording:* The final `.repo-wizard/audit-report.md` must explicitly document that the section was bypassed (e.g., `"Section [Section Name] was intentionally skipped by the developer"`), providing a record that the topic was addressed and omitted by choice.

### 1.3 Dynamic Recommendation Engine
* The orchestrator maps the questionnaire responses to a local lookup table of tooling types (e.g. *Static Application Security Testing*, *License Compliance Scanners*, *Traceability Matrices*, *Unit Test Runners*, *A11y Checkers*).
* Recommendations are generated as **abstract capabilities** first (e.g. "We need to set up static security analysis for your Node.js backend").
* The orchestrator matches these abstract capabilities against the developer's tech stack and budget, producing a list of candidate tools (e.g., SonarQube for paid/enterprise vs. Semgrep for free/OSS).

### 1.4 Session Persistence & State Management
To prevent developer questionnaire fatigue, the setup session must be fully resumable, editable, and version-tracked on disk.
* **Storage Location:** Session state is saved in the workspace root at `.repo-wizard/session.json`. (The `.repo-wizard/` directory must be automatically appended to the project's `.gitignore` or `.agentignore` on first analysis).
* **Completed Sessions:** If the wizard discovers a completed session (i.e., all tools are selected and scaffolding is done), the system must still allow the developer to run reports, revisit answers, or start fresh.
* **Resumability & Maintenance Logic:**
 1. *Discovery:* On startup, `/repo-wizard` checks if `.repo-wizard/session.json` exists.
 2. *User Prompts (Incomplete Session):* If an incomplete session is found, the agent displays: *"We found an active wizard session. Would you like to: [Resume, Revisit previous answers, Report selected choices, Start fresh]"*.
 3. *User Prompts (Completed Session):* If a completed session is found, the agent displays: *"We found a completed setup session. Would you like to: [Revisit previous answers, Report selected choices, Start fresh]"*.
 4. *Resume Behavior:* Skips all questions that already have recorded values in the session file, presenting only the remaining unanswered questions.
 5. *Revisit Behavior:* Presents a list of categories. Selecting a category allows the developer to modify answers, updating the session file in real-time.
 6. *Report Behavior:* Generates a quick, formatted summary list in the chat of all tool selections and gates they have chosen up to that point, and then returns to the prompt.
 7. *Start Fresh Behavior:* Clears the active session and begins the questionnaire from the first step.
* **Session Version Archiving:**
 * To prevent loss of configuration tracking and allow auditing of toolchain changes over time, the orchestrator **must archive** the active configuration before making any updates.
 * Whenever a user selects *Start Fresh* or completes modifications in *Revisit*, the current `session.json` and `.repo-wizard/audit-report.md` are copied into `.repo-wizard/history/` before being modified.
 * The archived files are renamed with timestamp suffixes:
 * `.repo-wizard/history/session_YYYYMMDD_HHMMSS.json`
 * `.repo-wizard/history/audit-report_YYYYMMDD_HHMMSS.md`
 * This allows the development team to audit historical decisions (e.g. verifying that the repository *used to* use Tool X, but migrated to Tool Y on a specific date).

### 1.5 Audit & Toolchain Reports
To provide absolute transparency and debug support for tool recommendations, the system generates two types of reports at the end of the alignment phase.

#### 1.5.1 The System Audit Trail (`.repo-wizard/audit-report.md`)
This is a comprehensive, developer-independent text report that documents the exact rationale behind the final configurations. It serves as a diagnostic record for agent developers when analyzing why specific tools were suggested, without recording conversational transcripts to preserve user privacy.
* **Structure & Data Points:**
 * **System Profile:** Target LOC, module layout, and detected language/build config.
 * **Capability Mapping:** The abstract capabilities required based on the questionnaire responses (e.g., "Static Application Security Testing").
 * **Screening Audits:** The full list of candidate tools passed to `tool-evaluator.agent` and the detailed CVE, activity, and license scan results returned (including rejected candidates).
 * **Selection Ledger:** A clear ledger documenting suggested candidates vs. final developer selections:
 * *Format:* `"For [Capability Y], the repo-wizard suggested [Tool A, Tool B, Tool C]. The developer selected [Tool B] [Reason: Developer provided summary rationale, if any]."`
 * *Note: No command installation logs or process output are captured.*

#### 1.5.2 Developer Toolchain Summary (`docs/TOOLCHAIN.md`)
A public-facing, well-formatted Markdown summary saved to the repository for the engineering team. It lists only the installed toolchain components without internal audit logs.
* **Structure:**
 * **Tool Name & Purpose:** The human-readable name of the tool and what it is responsible for in the repo (e.g. *Axe-core CLI - Automated Accessibility Checks*).
 * **Configuration Files:** Clickable links to the configuration files created/modified in the repo (e.g. [axe.config.json](../axe.config.json)).
 * **Audit Reference Links:** Clickable links to the tool's official documentation website or public repository (allowing the team to self-audit licenses, updates, or parameters).

### 1.6 Execution Order (Interview First, Scaffolding Second)
To optimize recommendations and prevent unnecessary tool duplication, the wizard must execute in a strict two-stage sequence.
1. **Stage 1: Complete Interview:** The entire questionnaire and candidate evaluation must run to completion *before* any installation or workspace modifications are proposed.
2. **Stage 2: Cross-Capability Optimization:** Once the interview is complete, the orchestrator audits the selected tool suite to identify if any single tool can cover multiple capabilities (e.g., configuring *ESLint* to handle general code formatting, accessibility checks, and internationalization checks simultaneously). This prevents duplicate tool clutter.
3. **Stage 3: Scaffolding Handoff:** The orchestrator compiles the final optimized list of tools and dispatches them sequentially to the specialists for configuration.

---

## ️ 2. Security Audit Gate (`tool-evaluator.agent`)

The `tool-evaluator` screens recommended tool options before they are presented to the user to prevent suggesting dead, unsupported, or compromised software.

### 2.1 Screening Protocol
For each recommended package/tool, the evaluator checks:
1. **Vulnerabilities:** Queries public CVE databases or package registries (e.g. `npm audit`, `cargo audit`, Snyk open-source database) to ensure the tool itself has no active critical CVEs.
2. **Activity & Maintenance:** Checks repository metrics:
 * Has there been a commit within the last 12 months?
 * Ratio of open to closed issues/PRs (detecting project abandonment).
 * Active maintainer count (avoiding single-maintainer supply chain risks).
3. **Reputation:** Verifies download volumes, stars, or community adoption.
4. **License Compliance:** Checks the tool's license against the project's commercial profile (e.g., flagging AGPL tools for closed-source B2B SaaS).

### 2.2 Output Schema
The `tool-evaluator` returns a structured report to the lead orchestrator:
```json
{
 "tool_name": "hot-new-linter",
 "status": "warning | discouraged | suggested",
 "flags": [
 {
 "severity": "high",
 "type": "abandonment",
 "message": "No commits have been made to this repository in 2.5 years."
 },
 {
 "severity": "medium",
 "type": "security",
 "message": "Contains 1 active medium-severity dependency CVE."
 }
 ]
}
```

---

## ️ 3. Unified Environment Configurer (`tool-scaffolder.agent`)

The `tool-scaffolder` is the environment executer. It acts purely on parameter contracts provided by the lead orchestrator, preventing prompt rot and decoupling the expert agents from hardcoded terminal syntax.

### 3.1 Operations
1. **Package Installation:** Runs package manager commands (e.g., `npm install -D [packages]`, `gradle dependencies`, `cargo add --dev [package]`) dynamically generated by the lead.
2. **Config File Merging:** Writes new configurations or parses and merges into existing files (such as `package.json`, `.gitignore`, `tsconfig.json`, or build scripts). It must use precise AST-based editing or specific code replacement tools to avoid breaking existing syntax.
3. **Build & Test Verification:** Runs a verify command (e.g. `npm run build`, `gradlew build`, `cargo check`) after installation to ensure the environment is healthy. If the compilation or existing tests break, it rolls back changes using Git.

---

## ‍ 4. Decoupled Specialist Subagents

Specialists review codebase files, generate config templates, write initial verification test skeletons, and customize CI/CD pipelines.

### 4.1 `compliance-pilot.agent` (Security Hardening & Certifications)
* **Objective:** Scaffold configurations for technical security certifications (FIPS, FedRAMP, SOC 2, ISO 27001, Cyber Essentials, MAS TRM, BSI).
* **Deliverables:** Scaffold IaC static analysis files (checkov, tfsec), generate FIPS boringSSL/OpenSSL bindings checks, configure signed commit pre-commit hooks, and create compliant AWS/GCP audit logging configuration drafts.

### 4.2 `privacy-guardian.agent` (Data Privacy & Consent)
* **Objective:** Implement data flow checks, GDPR/CCPA/LGPD/COPPA compliance hooks.
* **Deliverables:** Scaffold automated database schema audits (detecting unencrypted PII fields), generate utility functions for data anonymization/scrubbing in logging frameworks, and write route middleware skeletons for data portability and deletion ("Right to be Forgotten") requests.

### 4.3 `accessibility-auditor.agent` (A11y Standards & Reporting)
* **Objective:** Enforce WCAG 2.1/2.2 AA and EN 301 549 standards.
* **Deliverables:** Configure ESLint accessibility plug-ins, setup `axe-core` command-line test scripts running in chromium-headless environments, write screen-reader element validation skeletons, and configure accessibility report generators.

### 4.4 `supply-chain-scanner.agent` (Dependency Scan & SBOM)
* **Objective:** Audit active dependency vulnerability risk and license legality.
* **Deliverables:** Configure automated Software Bill of Materials (SBOM) generation (CycloneDX, SPDX) on release builds, integrate dependency vulnerability checkers (Snyk, Dependabot), and set up pre-commit/CI license auditing (FOSSA, License Finder) configured to block viral copyleft licenses.

### 4.5 `testing-pilot.agent` (Unit, E2E & Mock Scaffolding)
* **Objective:** Scaffold test runners, mocks, and coverage collection gates.
* **Deliverables:** Scaffold testing suite folders, configure testing runners (Jest, Vitest, PyTest, JUnit, Cargo test), set up API mocking layers (MSW, MockWebServer), and set up local code coverage gates (e.g. vitest coverage limits) matching the developer's requested coverage threshold.

### 4.6 `git-workflow-bot.agent` (Git Discipline & Local Automation)
* **Objective:** Automate formatting, styling, linting, and commit discipline.
* **Deliverables:** Configure Husky pre-commit hooks, set up `lint-staged` scripts, integrate Conventional Commits validation, and write scripts that scan and append licensing/copyright headers on new commits.

### 4.7 `technical-scribe.agent` (Docs, ADRs & Architecture Diagrams)
* **Objective:** Automate architectural decision tracking, documentation pipelines, and codebase diagrams.
* **Deliverables:** Scaffold Nygard-style ADR folders (`docs/decisions/`), write lightweight ADR creation CLI scripts, generate baseline architecture C4 Model diagrams using Mermaid, and write bug-fix retrospective templates (Root Cause, Prevention, Action Items) with PR checklist prompts.

---

## 5. Parameter Contract Interface Specification

To delegate tasks without hardcoding tool behavior into specialist prompts, the lead orchestrator passes a structured execution contract (JSON format) to the specialist subagent during spawning.

### 5.1 Invocation Contract Schema
```json
{
 "task_metadata": {
 "target_modules": ["/src/backend", "/src/frontend"],
 "language": "typescript",
 "build_system": "npm-vite",
 "budget_tier": "free | premium",
 "execution_environments": ["pre-commit", "CI"]
 },
 "compliance_targets": [
 {
 "standard": "GDPR",
 "focus_areas": ["PII logs scrubbing", "right-to-be-forgotten endpoint template"]
 },
 {
 "standard": "SOC2",
 "focus_areas": ["audit logs retention check", "access control checks"]
 }
 ],
 "tooling_specification": [
 {
 "capability": "Static Application Security Testing",
 "selected_tool": "Semgrep",
 "install_command": "npm install -D semgrep",
 "config_file": {
 "path": ".semgrep.yaml",
 "ruleset": "p/security-audit"
 }
 }
 ]
}
```

---

## 6. Rollback & Recovery Specification

When a specialist or scaffolder alters files and triggers a verification build that fails, they must auto-recover to prevent leaving the developer's repository in a broken state.

```
 ┌─────────────────────────┐
 │ Specialist files modified│
 └─────────────────────────┘
 │
 (Trigger Verification)
 ▼
 ┌───────────────────────┐
 │ Verification Build │
 └───────────────────────┘
 / \
 (Passes) (Fails)
 / \
 ┌──────────────────┐ ┌──────────────────────┐
 │ Finalize commit │ │ git checkout -- . │ (Rollback changes)
 │ & report success │ │ & report error │
 └──────────────────┘ └──────────────────────┘
```

### 6.1 Recovery Rules
1. **State Isolation:** Subagents must verify the working tree is clean using the command appropriate for the active VCS (e.g. `git status` for Git, `hg status` for Mercurial, or `p4 status` for Perforce) before starting.
2. **Build Safety Check:** If the verify script returns a non-zero exit code (compile error, TypeScript validation fail, or broken tests), notify the developer of the exact error and attempt to debug/resolve the failure first.
3. **Developer Consent & Rollback:** If debugging attempts fail, explain what was tried and ask the developer for explicit permission/consent before performing a VCS-specific rollback (such as `git checkout -- .` & `git clean -fd` for Git, `hg revert --all` & `hg purge` for Mercurial, or `p4 revert` for Perforce). Give the developer the opportunity to investigate and resolve it manually if preferred.
4. **Rollback Safety:** If a subagent's scaffolding breaks the build or fails unit tests and rollback is approved/executed, the lead orchestrator reports the exact failure and verifies the workspace is cleanly restored.

---

## ️ 7. Deliverable Artifact Layout & Checklist References

To ensure the agents perform at the highest industry standards, the project buildout must include the following file deliverables structured within the `repo-wizard/` directory.

### 7.1 Cross-Platform Slash Commands & Namespace Standard
To avoid colliding with standard client commands (such as `/test`, `/review`, or `/docs` in Claude Code/Copilot), all custom slash commands in this plugin must be prefixed with `rw-` (Repo Wizard), with the orchestrator accessible via `/repo-wizard` or `/rw`.

* **Slash Command Registry:**
 * **`/repo-wizard` (alias `/rw`):** The primary interactive questionnaire orchestrator.
 * **`/rw-legal`:** The Legal Neutrality Scanner (scanning for liability/claims phrasing).
 * **`/rw-compliance`:** The compliance hardening and technical certification planner.
 * **`/rw-privacy`:** The global privacy regulation auditor (PII logs, deletion).
 * **`/rw-accessibility`:** The WCAG & EN 301 549 scanner setup.
 * **`/rw-supply-chain`:** The lockfile security, dependency CVE, and license legality check.
 * **`/rw-testing`:** The test framework, TDD logic, mock database, and coverage gate setup.
 * **`/rw-git-workflow`:** Pre-commit hooks, commit validation, and copyright headers setup.
 * **`/rw-scribe`:** Nygard ADR, Mermaid C4 diagram, and post-mortem template setup.
 * **`/rw-performance`:** The performance benchmarking and load test runner configuration.
* **Commands Configuration:** Scaffold command integration configs for all supported AI client platforms:
 * Antigravity CLI commands under `commands/rw-*.toml` and `commands/repo-wizard.toml`.
 * Claude Code commands under `.claude/commands/rw-*.md` and `.claude/commands/repo-wizard.md`.
 * Gemini CLI commands under `.gemini/commands/rw-*.toml` and `.gemini/commands/repo-wizard.toml`.
* **Setup Guides:** Create step-by-step developer onboarding guides under `docs/` explaining setup, execution, and local overrides for each agent.


### 7.2 Core Agent Skills (`skills/`)
Each agent has a corresponding skill folder containing a YAML-frontmatter-driven `SKILL.md` specifying their core instructions, operational stages, and quality constraints:
* `skills/repo-wizard/SKILL.md` (The questionnaire coordinator)
* `skills/compliance-pilot/SKILL.md` (Hardening and audits)
* `skills/privacy-guardian/SKILL.md` (PII and consent controls)
* `skills/accessibility-auditor/SKILL.md` (A11y automated sweeps)
* `skills/supply-chain-scanner/SKILL.md` (SBOM and licenses)
* `skills/testing-pilot/SKILL.md` (Test framework & mocks setup)
* `skills/technical-scribe/SKILL.md` (Docs, ADRs, and diagrams)

### 7.3 High-Density Checklist References (`references/`)
Specialist agents require access to exhaustive, high-density checklists to prevent human-style memory lapses and ensure thorough audits. The following markdown checklists will be compiled inside `references/`:
1. **`references/security-hardening-checklist.md`:** Comprehensive controls for ISO 27001, FedRAMP, SOC 2, and FIPS cryptographic provider rules.
2. **`references/safety-of-life-checklist.md`:** Verification steps for DO-178C (DAL A-E), ISO 26262 (MISRA static analysis limits), and IEC 62304 medical device classifications.
3. **`references/data-privacy-checklist.md`:** Rules mapping GDPR, CCPA, LGPD, COPPA, and PIPEDA controls to logging, encryption, and deletion actions.
4. **`references/accessibility-checklist.md`:** Step-by-step checklist of WCAG 2.1/2.2 AA and EN 301 549 requirements.
5. **`references/testing-patterns.md`:** Patterns for TDD implementation, mocking layers (MSW), coverage gates, and MC/DC (Modified Condition/Decision Coverage) setup.
6. **`references/document-standards.md`:** Layout definitions for Michael Nygard ADR files, C4 model architecture diagrams, Mermaid charts, and bug post-mortem retrospective forms.
7. **`references/ai-safety-checklist.md`:** Validation checksheets for the EU AI Act, OWASP LLM Top 10, LLM guardrails, and model bias auditing.
8. **`references/supply-chain-audit-checklist.md`:** Audit checklists for lockfile integrity, dependency vulnerability scanning (Snyk/Dependabot configs), Software Bill of Materials (SBOM) structures, and licensing compliance (GPL/AGPL vs. MIT/Apache copyleft 

### 7.4 Agent Evaluation & Testing
To ensure the reliability, compliance, and formatting correctness of all agents, a dynamic LLM-as-a-Judge evaluation suite is configured in the repository.
* **Rubric Parity Rule:** Whenever a new agent persona (e.g., `agents/*-agent.md`) is introduced, corresponding evaluation test cases and validation rubrics must be added to `scripts/run-evals.js`.
* **CI Validation:** The static validation suite (`scripts/validate-agents.js`) will block pull requests if any agent persona is missing evaluation rubrics or test cases.

