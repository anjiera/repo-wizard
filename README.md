# Repo Wizard (`repo-wizard`)

Repo Wizard is a production-grade collection of governance, legal safety, regulatory compliance, testing, and documentation skills for AI coding agents (Antigravity, Claude Code, etc.). 

It packages instructions, checklists, and persona configurations that can be loaded into agents to automate complex repository auditing and scaffolding.

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
* **[hybrid-orchestration.md](docs/design/hybrid-orchestration.md)** — Architectural design of the manifest-driven hybrid runner and TTY execution model.
* **[passive-data-boundaries.md](docs/design/passive-data-boundaries.md)** — Security architecture detailing prompt injection mitigations and isolated data parsing.
* **[prompt-evaluations.md](docs/design/prompt-evaluations.md)** — Deep-dive on MLOps testing, rubric parity requirements, and the LLM-as-a-judge runner.
* **[zero-dependency-scripting.md](docs/design/zero-dependency-scripting.md)** — Engineering rationale for zero-npm dependency Node.js utility design.
* **[dashboard-architecture.md](docs/design/dashboard-architecture.md)** — Architectural layout of the local SPA client dashboard and Express backend.
* **[scaffolding-and-rollback-safety.md](docs/design/scaffolding-and-rollback-safety.md)** — Core setup presets and Git rollback safety mechanism design.
* **[meta-agent-alignment.md](docs/design/meta-agent-alignment.md)** — Meta-agent prompt auditing linter rules and self-linting pilot design.
* **[legal-consent-gate.md](docs/design/legal-consent-gate.md)** — Design of the Step 0 terms agreement checkpoint and liability disclaimers.

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
    Audit -->|4. Tool recommendations| Evaluator[tool-evaluator.agent]
    Evaluator -->|5. Tooling approval| Scaffolder[tool-scaffolder.agent]
    Scaffolder -->|6. Scaffold Configs| Files[(Workspace Files)]
    Orchestrator -->|7. Compile Reports| MD_HTML[Technical & Executive Reports]
```

---

## Features & Commands

### 1. Legal Neutrality Scanner (`/rw-legal-neutrality`)
* **Purpose:** Scans codebases for high-risk phrases, promises, or claims (e.g. guaranteeing security, offering unregulated fitness/health guidance) that expose the company to legal liability.
* **Specialist Agent:** `agents/legal-neutrality-agent.md`
* **Skill:** `skills/legal-neutrality-scanner/SKILL.md`
* **Reference Lookup:** [references/legal-phrasing-dictionary.md](references/legal-phrasing-dictionary.md)

### 2. Repo Wizard (`/repo-wizard`)
* **Purpose:** Runs an interactive onboarding interview with developers, dynamically recommends tailored QA, testing, security, accessibility, and compliance tools based on budget/stack constraints, and guides specialist subagents to scaffold them safely.
* **Orchestrator Specification:** Located in the [repo-wizard-planning/](repo-wizard-planning) directory.

### 3. Agent Alignment Pilot (`/rw-agent-align`)
* **Purpose:** Audits agent prompts, configurations, and workflows for consistency, style, formatting, and token limits, and scaffolds rubric-based evaluation suites and validation checks.
* **Specialist Agent:** `agents/agent-alignment-pilot-agent.md`
* **Skill:** `skills/agent-alignment-pilot/SKILL.md`

### 4. Helper & Validation Scripts
To verify repository quality and facilitate testing of AI agent workflows:
* **Markdown-to-HTML Compiler ([scripts/md-to-html.js](scripts/md-to-html.js)):** A zero-dependency utility that compiles standard markdown documentation into responsive, styled HTML pages with light/dark theme support.
* **Static Linters:** Scripts to validate agent formatting ([validate-agents.js](scripts/validate-agents.js)), command parity ([validate-commands.js](scripts/validate-commands.js)), and skill layouts ([validate-skills.js](scripts/validate-skills.js)).
* **Test Runners:** Integration, contract schema checking, subagent mocking, and sandbox E2E test suites.

---

## Directory Structure

```
repo-wizard/
├── .claude/commands/ # Claude Code slash command configurations
├── .gemini/commands/ # Gemini CLI slash command configurations
├── agents/           # Reusable agent persona instructions
├── commands/         # Antigravity CLI slash command configurations
├── docs/             # User-facing onboarding guides
├── references/       # Detailed checklists and dictionaries
└── skills/           # Core workflows (SKILL.md per folder)
```

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

