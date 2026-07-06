# Repo Wizard (`repo-wizard`)

Repo Wizard is a production-grade collection of governance, legal safety, regulatory compliance, testing, and documentation skills for AI coding agents (Antigravity, Claude Code, etc.). 

It packages instructions, checklists, and persona configurations that can be loaded into agents to automate complex repository auditing and tooling.

---

## Documentation & Navigation Map

To help you get started quickly, please refer to the following guides:
* **[AGENT_MATRIX.md](docs/AGENT_MATRIX.md)** — The multi-agent taxonomy matrix mapping personas, skills, commands, and standards.
* **[getting-started.md](docs/getting-started.md)** — Core concepts and cybersecurity color-wheel categorization.
* **[GLOSSARY.md](docs/GLOSSARY.md)** — Definitions for compliance frameworks, software engineering, and AI agent terms.
* **[scripts-guide.md](docs/scripts-guide.md)** — Detailed manual for helper, compilation, and testing scripts.
* **[TESTING.md](docs/TESTING.md)** — Testing philosophy, LLM-as-a-judge evals, and troubleshooting guide.
* **[usage-tutorial.md](docs/usage-tutorial.md)** — Scenario guides for Greenfield vs. Brownfield repos, and interactive vs. headless execution.
* **[references/README.md](references/README.md)** — Alphabetized and domain-mapped catalog of the 23 checklist and pattern standards.
* **[hybrid-orchestration.md](docs/design/hybrid-orchestration.md)** — Architectural design of the manifest-driven hybrid runner and ADK execution model.
* **[adk-orchestration.md](docs/design/adk-orchestration.md)** — Integration design of the Google ADK InMemoryRunner to manage LlmAgent lifecycle and pipeline execution.
* **[passive-data-boundaries.md](docs/design/passive-data-boundaries.md)** — Security architecture detailing prompt injection mitigations and isolated data parsing.
* **[prompt-evaluations.md](docs/design/prompt-evaluations.md)** — Deep-dive on MLOps testing, rubric parity requirements, and the LLM-as-a-judge runner.
* **[zero-dependency-scripting.md](solo-dev-toolkit/docs/design/zero-dependency-scripting.md)** — Engineering rationale for zero-npm dependency Node.js utility design.
* **[tooling-and-rollback-safety.md](docs/design/tooling-and-rollback-safety.md)** — Core setup presets and Git rollback safety mechanism design.
* **[meta-agent-alignment.md](docs/design/meta-agent-alignment.md)** — Meta-agent prompt auditing linter rules and self-linting pilot design.
* **[legal-consent-gate.md](docs/design/legal-consent-gate.md)** — Design of the Step 0 terms agreement checkpoint and liability disclaimers.
* **[decoupled-orchestration.md](docs/design/decoupled-orchestration.md)** — Architectural design and lifecycle of the contract-based decoupled agent orchestration system.
* **[session-resumability.md](docs/design/session-resumability.md)** — Design and state structures of the session recovery system and subagent manifest contracts.
* **[papercut-tracking.md](solo-dev-toolkit/docs/design/papercut-tracking.md)** — Design of the subagent papercut logging and frequency tracking system.
* **[phase-splitting-tooling.md](docs/design/phase-splitting-tooling.md)** — Architectural design of the phase-splitting execution boundary and versioned JSON tooling contracts.
* **[zero-dependency-json-validation.md](docs/design/zero-dependency-json-validation.md)** — Design of the zero-dependency schema-based validation for plugin and agent configurations.
* **[markdown-duplication-validator.md](docs/design/markdown-duplication-validator.md)** — Design and processing pipeline of the DRY compliance checker for documentation and prompts.
* **[quality-pillars-framework.md](docs/design/quality-pillars-framework.md)** — Structural design of quality pillars grouping specialist agent personas.
* **[report-redaction-pipeline.md](docs/design/report-redaction-pipeline.md)** — Anonymization pipeline architecture for Git URLs, workspace paths, and repository names.
* **[pillar-concurrency-limits.md](docs/design/pillar-concurrency-limits.md)** — Resource control design for concurrency limits and sequential batching of subagent execution.
* **[repo-sizing-relevance-refactoring.md](docs/design/repo-sizing-relevance-refactoring.md)** — Technical design for proportional report requirements and setup-phase relevance checks.
* **[questionnaire-spec.md](docs/design/questionnaire-spec.md)** — Formal specification schema and validator for onboarding questionnaire structures.

---

## Architecture & Orchestration Flow

Repo Wizard utilizes a multi-agent orchestration pattern where a lead orchestrator handles user onboarding and sizing checks, and coordinates specialist subagents using parameter contract validations.

```mermaid
graph TD
    User([Developer]) -->|Run Command /repo-wizard| Orchestrator[Lead Orchestrator]
    Orchestrator -->|1. Size Codebase| Sizer[Sizer & Language Detector]
    Orchestrator -->|2. Interactive Interview / Headless Heuristics| Config[session.json]
    Orchestrator -->|3. Subagent Relevance Sweep| Specialists[Specialist Agents network]
    Specialists -->|Relevance High/Medium| Audit[Run Checklist]
    Specialists -->|Relevance Low| Skip[Bypassed]
    Audit -->|4. Tool recommendations| Evaluator[tool-auditor]
    Evaluator -->|5. Tooling approval| Scaffolder[tooling-engineer]
    Scaffolder -->|6. Tool Configs| Files[(Workspace Files)]
    Orchestrator -->|7. Compile Reports| MD_HTML[Technical & Executive Reports]
```

---

## Features & Commands

### 1. Repo Wizard (`/repo-wizard`)
* **Purpose:** Runs an interactive onboarding interview with developers, dynamically recommends tailored QA, testing, security, accessibility, and compliance tools based on budget/stack constraints, and guides specialist subagents to tool them safely.
* **Orchestrator Specification:** Located in the [repo-wizard-planning/](repo-wizard-planning) directory.

### 2. Agent Alignment Auditor (`/rw-agent-alignment-auditor`)
* **Purpose:** Audits agent prompts, configurations, and workflows for consistency, style, formatting, and token limits, and configures rubric-based evaluation suites and validation checks.
* **Specialist Agent:** `agents/agent-alignment-auditor.md`
* **Skill:** `skills/agent-alignment-auditor/SKILL.md`

> [!NOTE]
> For the full list of all 27 specialized quality, performance, compliance, and security agents, please refer to the comprehensive taxonomy in [AGENT_MATRIX.md](docs/AGENT_MATRIX.md).

### 3. Helper & Validation Scripts
For a complete guide to all available helper, validation, and test runner scripts, please refer to [scripts-guide.md](docs/scripts-guide.md). 
To verify repository quality and facilitate testing of AI agent workflows:
* **Markdown-to-HTML Compiler ([solo-dev-toolkit/scripts/md-to-html.js](solo-dev-toolkit/scripts/md-to-html.js)):** A zero-dependency utility that compiles standard markdown documentation into responsive, styled HTML pages with light/dark theme support.
* **Static Linters:** Scripts to validate agent formatting ([validate-agents.js](scripts/validate-agents.js)), command parity ([validate-commands.js](scripts/validate-commands.js)), and skill layouts ([validate-skills.js](scripts/validate-skills.js)).
* **Test Runners:** Integration, contract schema checking, subagent mocking, and sandbox E2E test suites.

---

## Directory Structure

To keep the repository modular, the files are separated into the **Product Plugin** (what the end-user runs) and the **Developer Infrastructure** (the Builder tools used to write and validate the project):

### 1. Product Plugin (The Runtime)
These folders contain the code, configurations, and skills packaged and shipped as the `repo-wizard` tool:
*   `skills/` — The core audit and tooling workflows (copied into user codebases).
*   `agents/` — Reusable agent persona instructions (used during scans).
*   `commands/`, `.claude/`, `.gemini/` — CLI slash command configurations for different client environments.

### 2. Developer Infrastructure (The Builder)
These folders and files are used locally by developers and AI coding assistants to build, test, and maintain `repo-wizard`:
*   `scripts/` — Local setup, orchestration, E2E tests, and validation scripts.
*   `solo-dev-toolkit/scripts/` — Reusable, decoupled developer tools (markdown compiler and commit message validator).
*   `evals/` — LLM-as-a-judge prompt evaluation configurations.
*   [AGENTS.md](AGENTS.md) / `CLAUDE.md` — Workflow rules instructing coding assistants.
*   `docs/` — Onboarding, testing, glossary, and design specifications.

---

## Installation & Setup

To automatically configure your local environment, install pre-commit git hooks, and verify code integrity:

```bash
# On Linux / macOS / Git Bash
./setup.sh

# On Windows (PowerShell)
.\setup.ps1
```

For detailed setup instructions on different client environments, see:
* [getting-started.md](docs/getting-started.md) — General overview.
* [antigravity-setup.md](docs/antigravity-setup.md) — Installing as an Antigravity plugin.
* [claude-setup.md](docs/claude-setup.md) — Loading into Claude Code.
* [copilot-setup.md](docs/copilot-setup.md) — Importing into GitHub Copilot.

---

## Disclaimer & Legal Safety

> [!IMPORTANT]
> **No Advice Provided:** The tools, checklists, and scanning outputs generated by `repo-wizard` are educational references and engineering starting points. They do not constitute legal, financial, compliance, regulatory, or safety advice. Developers must perform their own review of recommendations, configurations, and licenses to ensure compatibility with their organizational standards and local laws.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

