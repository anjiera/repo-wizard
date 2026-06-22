# Getting Started with Repo Wizard

Welcome to **Repo Wizard** (`repo-wizard`)! 

This repository contains specialized, production-grade agent workflows, personas, and custom slash commands designed to help solo developers and small teams configure their repositories with enterprise-level engineering standards, liability protection, and QA guardrails.

---

## What is a Skill?

Each skill is a structured markdown file (`SKILL.md`) located in the `skills/` directory. Rather than being simple reference documentation, skills define step-by-step processes for AI coding agents (such as Google Antigravity, Claude Code, or GitHub Copilot) to follow. 

Every skill includes:
* **Overview & Trigger Conditions**: Dictates *what* the skill is and *when* the agent should dynamically activate it.
* **Process Steps**: Practical, tool-agnostic stages to complete the task.
* **Common Rationalizations**: Rebuttals to combat common excuses AI agents make to skip steps (e.g. "I'll do verification later").
* **Red Flags**: Symptoms indicating that the workflow is being violated.
* **Verification Checklist**: Exit criteria that require hard evidence (tests, outputs, screenshots) before marking the task complete.

---

## Active Skills & Personas

Currently, the suite includes:

### 1. Legal Neutrality Scanner
* **Skill**: [skills/legal-neutrality-scanner/SKILL.md](../skills/legal-neutrality-scanner/SKILL.md)
* **Auditor Persona**: [agents/legal-neutrality-agent.md](../agents/legal-neutrality-agent.md)
* **Goal**: Scans user-facing UI labels, notifications, errors, and terminal scripts for high-liability phrases (e.g. verging on medical/health/financial advice) and suggests legally neutral, comfort-based alternatives without editing source files directly.
* **Reference Guide**: [references/legal-phrasing-dictionary.md](../references/legal-phrasing-dictionary.md)

---

## Quick Start: Loading Skills

Since the repository is built on standard markdown files, you can use these skills in any agent environment:

1. **System Prompts**: Paste the contents of `agents/legal-neutrality-agent.md` directly into your ChatGPT, Claude, or Copilot chat.
2. **Rules Files**: Copy the skill and persona contents into your project's rules file (e.g., `.cursorrules`, `CLAUDE.md`, or `.agents/AGENTS.md`) for persistent execution.
3. **Dedicated Tool Integrations**: Read the setup guides below for native slash command and plugin setups:
   - [Google Antigravity Setup](antigravity-setup.md)
   - [Claude Code Setup](claude-setup.md)
   - [GitHub Copilot Setup](copilot-setup.md)
