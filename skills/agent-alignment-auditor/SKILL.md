---
name: agent-alignment-auditor
description: Suggests tweaks to AI agent prompts to help save tokens and keep them on-script.
---

# Agent Alignment Auditor (`agent-alignment-auditor`)

## Overview
A specialized internal governance workflow designed to audit AI agent personas, prompt files, and configurations for style, formatting, and structural compliance. It helps developers enforce consistency and establish robust, rubric-based evaluation suites and validation checks to prevent prompt regression.

## When to Use
Use this skill when:
- Designing or adding a new agent persona (markdown configuration) to the codebase.
- Auditing existing agent system prompts for token budget, structural consistency, and clarity.
- Integrating agent testing frameworks, LLM-as-a-Judge evaluations, or pre-commit/CI validation checks.
- Running checks internally via `agent-alignment-auditor.agent`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-agent-alignment-auditor.md` under Phase 3 / Phase 4.

### Phase 1: Input Analysis
Accept the parameters contract containing:
1. **Target Agent Files:** Path to agent configuration files (e.g. `agents/*.md`).
2. **Quality Profile:** Prompt size limits, required section templates, and consistency rules.
3. **Tooling & Hooks:** Choice of pre-commit hooks, CI/CD runners, and LLM-as-a-Judge validation runners.

### Phase 2: Metadata & Persona Audit
Evaluate target agent configurations:
1. **Metadata Consistency:** Check for YAML frontmatter matching (`name` matches filename, `description` exists and is under character limits).
2. **Structural Completeness:** Verify that the agent uses the delegator pattern, containing the 'Core Execution & Auditing Directive' (or Core Execution & Handoff Directive for the orchestrator) and relative links to its paired 'skills/<agent-name>/SKILL.md' file, alongside standard 'Handoff & Sandbox Constraints'.
3. **Composition Integrity:** Verify the persona contains a Composition block or constraints defining invoke conditions and limits.
4. **Token Footprint:** Audit prompt size. If the file is >150 lines or contains large checklists/dictionaries, recommend moving them to the `references/` directory.

### Phase 3: Validation & Test Tooling
Configure quality gates for the agent files:
1. **LLM-as-a-Judge Rubric Suite:** Tool a rubric evaluation suite (`../../evals/<agent-name>.js`) containing concrete test cases and verification rubrics.
2. **Structural Validators:** Add structural validators (e.g., extending `validate-agents.js`) to check prompt syntax and required headers.
3. **CI/CD Hook Integration:** Configure hooks to run validation and evaluations on pre-commit or CI pipelines, integrating VCS rollback mechanisms.

## Common Rationalizations
- *"Prompt testing is useless because LLM outputs are non-deterministic."* - Rubric-based LLM-as-a-Judge evaluations offer high correlation with quality and prevent regressions in specific constraints.
- *"We can just put all guidelines in one huge prompt file."* - Overly long prompts pollute the session's context window, increasing cost and reducing attention. Split reference details into `references/`.
- *"A router agent is clean for dispatching commands."* - Orchestration belongs in the CLI/command layer, not inside individual persona prompts. Personas should remain single-perspective.

## Red Flags
- Creating a new agent file without a corresponding evaluation suite in `../../evals/`.
- Introducing a persona that acts as a router/meta-orchestrator (Composition violation).
- Leaving out standard safety disclaimers or rollback procedures for execution agents.
- Modifying prompt files without running validation tests to verify no regressions occur.

## Verification
Confirm that:
- [ ] Frontmatter matches filename and directory limits.
- [ ] Core delegator directive and handoff/sandbox constraints are defined, with correct relative links to its paired skill file.
- [ ] Composition or constraints block is defined.
- [ ] Large checklists are separated into `references/`.
- [ ] Rubric evaluation suite is created and registered.
- [ ] Validation scripts and pre-commit checks run and exit with 0.
