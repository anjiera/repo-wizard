# Repo Wizard (`repo-wizard`)

Repo Wizard is a production-grade collection of governance, legal safety, regulatory compliance, testing, and documentation skills for AI coding agents (Antigravity, Claude Code, etc.). 

It packages instructions, checklists, and persona configurations that can be loaded into agents to automate complex repository auditing and scaffolding.

---

## Features & Commands

### 1. Legal Neutrality Scanner (`/legal-neutrality`)
* **Purpose:** Scans codebases for high-risk phrases, promises, or claims (e.g. guaranteeing security, offering unregulated fitness/health guidance) that expose the company to legal liability.
* **Specialist Agent:** `agents/legal-neutrality-agent.md`
* **Skill:** `skills/legal-neutrality-scanner/SKILL.md`
* **Reference Lookup:** [references/legal-phrasing-dictionary.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/legal-phrasing-dictionary.md)

### 2. Repo Wizard (`/repo-wizard`) *(Under Development)*
* **Purpose:** Runs an interactive onboarding interview with developers, dynamically recommends tailored QA, testing, security, accessibility, and compliance tools based on budget/stack constraints, and guides specialist subagents to scaffold them safely.
* **Orchestrator Specification:** Located in the [repo-wizard-planning/](file:///d:/DevSandbox/agy-projects/repo-wizard/repo-wizard-planning/) directory.

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
* [docs/getting-started.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/getting-started.md) — General overview.
* [docs/antigravity-setup.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/antigravity-setup.md) — Installing as an Antigravity plugin.
* [docs/claude-setup.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/claude-setup.md) — Loading into Claude Code.
* [docs/copilot-setup.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/copilot-setup.md) — Importing into GitHub Copilot.

---

## License

This project is licensed under the MIT License - see the [LICENSE](file:///d:/DevSandbox/agy-projects/repo-wizard/LICENSE) file for details.
