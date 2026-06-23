# Repo Wizard (`repo-wizard`)

Repo Wizard is a production-grade collection of governance, legal safety, regulatory compliance, testing, and documentation skills for AI coding agents (Antigravity, Claude Code, etc.). 

It packages instructions, checklists, and persona configurations that can be loaded into agents to automate complex repository auditing and scaffolding.

---

## Features & Commands

### 1. Legal Neutrality Scanner (`/rw-legal-neutrality`)
* **Purpose:** Scans codebases for high-risk phrases, promises, or claims (e.g. guaranteeing security, offering unregulated fitness/health guidance) that expose the company to legal liability.
* **Specialist Agent:** `agents/legal-neutrality-agent.md`
* **Skill:** `skills/legal-neutrality-scanner/SKILL.md`
* **Reference Lookup:** [references/legal-phrasing-dictionary.md](references/legal-phrasing-dictionary.md)

### 2. Repo Wizard (`/repo-wizard`) *(Under Development)*
* **Purpose:** Runs an interactive onboarding interview with developers, dynamically recommends tailored QA, testing, security, accessibility, and compliance tools based on budget/stack constraints, and guides specialist subagents to scaffold them safely.
* **Orchestrator Specification:** Located in the [repo-wizard-planning/](repo-wizard-planning/) directory.

### 3. Agent Alignment Pilot (`/rw-agent-align`)
* **Purpose:** Audits agent prompts, configurations, and workflows for consistency, style, formatting, and token limits, and scaffolds rubric-based evaluation suites and validation checks.
* **Specialist Agent:** `agents/agent-alignment-pilot-agent.md`
* **Skill:** `skills/agent-alignment-pilot/SKILL.md`

### 4. Helper & Validation Scripts
To verify repository quality and facilitate testing of AI agent workflows:
* **Markdown-to-HTML Compiler ([scripts/md-to-html.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/md-to-html.js)):** A zero-dependency utility that compiles standard markdown documentation into responsive, styled HTML pages with light/dark theme support.
* **Static Linters:** Scripts to validate agent formatting ([validate-agents.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-agents.js)), command parity ([validate-commands.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-commands.js)), and skill layouts ([validate-skills.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-skills.js)).
* **Test Runners:** Integration, contract schema checking, subagent mocking, and sandbox E2E test suites ([test-helpers.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/test-helpers.js), [validate-contracts.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-contracts.js), [run-mock-harness.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/run-mock-harness.js), and [run-e2e-tests.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/run-e2e-tests.js)).

---

## Directory Structure


```
repo-wizard/
├── .claude/commands/ # Claude Code slash command configurations
├── .gemini/commands/ # Gemini CLI slash command configurations
├── agents/ # Reusable agent persona instructions
├── commands/ # Antigravity CLI slash command configurations
├── docs/ # User-facing onboarding guides
├── references/ # Detailed checklists and dictionaries
└── skills/ # Core workflows (SKILL.md per folder)
```

---

## Installation & Setup

For detailed setup instructions on different client environments, see:
* [docs/getting-started.md](docs/getting-started.md) — General overview.
* [docs/antigravity-setup.md](docs/antigravity-setup.md) — Installing as an Antigravity plugin.
* [docs/claude-setup.md](docs/claude-setup.md) — Loading into Claude Code.
* [docs/copilot-setup.md](docs/copilot-setup.md) — Importing into GitHub Copilot.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
