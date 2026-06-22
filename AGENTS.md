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

### Intent-to-Skill Mapping

Map user queries to skills according to this matrix:

- **Query / Intent:** Banned words check, legal liability scanning, phrasing checks for weather safety/fitness/finance, or running `/rw-legal-neutrality`.
  - **Skill:** [legal-neutrality-scanner](skills/legal-neutrality-scanner/SKILL.md)
- **Query / Intent:** Setting up testing, auditing code compliance, onboarding a repository, choosing linter configs, or running `/repo-wizard`.
  - **Skill:** `skills/repo-wizard/SKILL.md` *(under development)*

## Orchestration Patterns

This plugin uses a **decoupled specialist handoff** pattern:
* **The Lead Agent (`repo-wizard`)** is responsible for user profiling, stack evaluation, and dispatching.
* **Specialist Agents** are independent and should not spawn other agents. They execute specific, narrow parameter contracts (e.g. configuring accessibility tools or writing mock data) and report back.

For details on the architecture, see the specifications in the [repo-wizard-planning/](repo-wizard-planning/) folder.
