# AGENTS.md

This file provides guidance to AI coding agents (Antigravity, Claude Code, Cursor, Copilot, etc.) when working with code or files in this directory.

## Repository Overview

This repository contains packaged engineering skills and personas focused on repository governance, legal safety, regulatory compliance, testing scaffolding, and documentation automation.

## Skill-Driven Execution Model

This repository is designed to be consumed as a plugin. Agents must automatically map user requests to the appropriate skill located under `skills/`.

### Core Rules

1. **Mandatory Matching:** If the user's intent or request matches the purpose of any skill in this repository, you MUST view that skill's `SKILL.md` file first using your file-viewing tools and follow its process.
2. **Follow Instructions Exactly:** Do not partially apply or skip steps in a skill's process. The workflows are designed for complete safety audits.
3. **No Direct Overwrites:** Maintain existing comments and docstrings in target files unless specifically asked to edit them.
4. **Conventional Commits:** Always use the Conventional Commits style for writing git commit messages (e.g. `feat(api): ...`, `fix(embedded): ...`, `refactor(agents): ...`).

### Intent-to-Skill Mapping

Map user queries to skills according to this matrix:

- **Query / Intent:** Banned words check, legal liability scanning, phrasing checks for weather safety/fitness/finance, or running `/rw-legal-neutrality`.
  - **Skill:** [legal-neutrality-scanner](skills/legal-neutrality-scanner/SKILL.md)
- **Query / Intent:** Setting up testing, auditing code compliance, onboarding a repository, choosing linter configs, or running `/repo-wizard`.
  - **Skill:** `skills/repo-wizard/SKILL.md` *(under development)*
- **Query / Intent:** Auditing agent prompts, checking prompt consistency, configuring agent rubric evaluations, or running `/rw-agent-align`.
  - **Skill:** [agent-alignment-pilot](skills/agent-alignment-pilot/SKILL.md)

## Orchestration & Scanning Modes

This plugin supports both interactive local configuration and headless remote/local scanning modes:
* **Interactive Local Mode (`MODE=INTERACTIVE_LOCAL`):** Prompts the user through alignment questions, screens tools, and scaffolds configurations.
* **Headless Remote Mode (`MODE=HEADLESS_REMOTE`):** Evaluates a remote public repository URL. The orchestrator prompts the user for the scan approach (A or B), then completes a best-guess sweep without blocking for input.
* **Headless Local Mode (`MODE=HEADLESS_LOCAL`):** Non-blocking best-guess scan of the active local repository.

### Decoupled Subagent Relevance Sweep
Before running full sweeps, the Lead Agent dispatches a relevance check to each specialist. Specialists must evaluate the codebase metadata/clues and return a JSON verdict containing `relevance` (`High` | `Medium` | `Low`) and a brief `rationale`. Full sweeps are skipped for `Low` relevance subagents.

For details on the architecture, see the specifications in the [repo-wizard-planning/](repo-wizard-planning/) folder.

