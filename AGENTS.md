# AGENTS.md

This file provides guidance to AI coding agents (Antigravity, Claude Code, Cursor, Copilot, etc.) when working with code or files in this directory.

## Repository Overview

This repository contains packaged engineering skills and personas focused on repository governance, legal safety, regulatory compliance, testing scaffolding, and documentation automation.

## Skill-Driven Execution Model

This repository is designed to be consumed as a plugin. Agents must automatically map user requests to the appropriate skill located under `skills/`.

### Core Rules

1. **Mandatory Matching:** If the user's intent or request matches the purpose of any skill in this repository, you MUST view that skill's `SKILL.md` file first using your file-viewing tools and follow its process.
2. **Follow Instructions Exactly:** Do not partially apply or skip steps in a skill's process. The workflows are designed for complete safety audits.
3. **Conventional Commits:** Always use the Conventional Commits style for writing git commit messages (e.g. `feat(api): ...`, `fix(embedded): ...`, `refactor(agents): ...`).
4. **Mandatory Design Documentation**: When implementing an interesting, novel, or complex system feature (such as custom orchestration runners, parsing/AST layers, evaluation loops, or zero-dependency CLI utilities), you must write a dedicated technical design document under the `docs/design/` directory using lowercase-hyphenated naming (e.g., `docs/design/hybrid-orchestration.md`).
5. **Design Approval Gate**: All draft design documents must be presented to the user first for explicit review and approval (e.g., via implementation plans or feedback prompts) before staging or committing them.
6. **Design Document Legal Neutrality Check**: Anytime you create or edit a design document, you must perform a self-audit against the [legal-neutrality-auditor](skills/legal-neutrality-auditor/SKILL.md) checklist to make all terminology legally neutral (avoiding absolute claims or guarantees like 'ensure', 'prevent', 'guarantee', and 'safety' in favor of mitigation, verification, or threshold-based phrasing) before presenting it to the user for review.
7. **Colorized CLI Output:** Standard CLI scripts and validator utilities must use cross-platform ANSI color escape codes (e.g. green checkmarks `✓`, red cross marks `✗`, blue step banners `==>`) to enhance readability in terminal environments, while maintaining strict zero-dependency execution.
8. **Explicit CLI Parameters Enforced:** The CLI orchestrator (`run-fallback-sequential-orchestration.js`) must strictly enforce explicit command-line parameters (specifically `--target-path`). Positional parameters for target paths must NOT be supported. If the `--target-path` flag is missing, the orchestrator must throw an error and exit with a non-zero code. This is an intentional design decision to prevent implicit cwd fallback or path mismatch bugs. All invoking agents and code reviewers must respect this explicit contract.
9. **Isolated Mock Blocks:** Any mock or placeholder data (such as dummy text, placeholder report summaries, or simulated arrays) must be strictly isolated to dedicated mock files or wrapped inside explicit block comments: `// mock-start` and `// mock-end`. JavaScript file checkers (`validate-scripts.js`) will verify that no production execution paths contain dummy text or string repetition multipliers outside of these marked blocks.
10. **Authentic Subagent Audits Mandatory:** When executing a codebase analysis or running `repo-wizard` in native chat sandbox mode, you MUST invoke the relevant specialist subagents natively using `invoke_subagent` and collect their authentic observations. You are strictly forbidden from generating synthetic, fabricated, or mock observation markdown documents to bypass scans. All observations and backlog recommendations must stem from actual evaluation of target files.
11. **Banned Sandbox Bypass Scripts:** You are strictly forbidden from writing, generating, or committing custom helper scripts to serialize, copy, or bundle target repository files into JSON or any other temporary workspace format. All specialist subagents possess full read access to peer directories on the local machine and MUST read target files directly via their own absolute path file-viewing tools.



### Intent-to-Skill Mapping

Map user queries to skills according to this matrix:

- **Query / Intent:** Banned words check, legal liability scanning, phrasing checks for weather safety/fitness/finance, or running `/rw-legal-neutrality-auditor`.
  - **Skill:** [legal-neutrality-auditor](skills/legal-neutrality-auditor/SKILL.md)
- **Query / Intent:** Setting up testing, auditing code compliance, onboarding a repository, choosing linter configs, or running `/repo-wizard`.
  - **Skill:** [repo-wizard](skills/repo-wizard/SKILL.md)
- **Query / Intent:** Auditing agent prompts, checking prompt consistency, configuring agent rubric evaluations, or running `/rw-agent-alignment-auditor`.
  - **Skill:** [agent-alignment-auditor](skills/agent-alignment-auditor/SKILL.md)
- **Query / Intent:** Code review, verification checks, blast radius gating, triage papercuts, papercut checkup, or invoking the `sdt-code-review` skill.
  - **Skill:** [sdt-code-review](solo-dev-toolkit/skills/sdt-code-review/SKILL.md)

## Orchestration & Scanning Modes

This plugin supports both interactive local configuration and headless remote/local scanning modes:
* **Interactive Local Mode (`MODE=INTERACTIVE_LOCAL`):** Prompts the user through alignment questions, screens tools, and scaffolds configurations.
* **Headless Remote Mode (`MODE=HEADLESS_REMOTE`):** Evaluates a remote public repository URL. The orchestrator prompts the user for the scan approach (A or B), then completes a best-guess sweep without blocking for input.
* **Headless Local Mode (`MODE=HEADLESS_LOCAL`):** Non-blocking best-guess scan of the active local repository.

### Decoupled Subagent Relevance Sweep
Before running full sweeps, the Lead Agent dispatches a relevance check to each specialist. Specialists must evaluate the codebase metadata/clues and return a JSON verdict containing `relevance` (`High` | `Medium` | `Low`) and a brief `rationale`. Full sweeps are skipped for `Low` relevance subagents.

For details on the architecture, see the specifications in the [repo-wizard-planning/](repo-wizard-planning/) folder.

### Unified Codebase Setup & Scan Phase
Before running the sequential orchestrator or launching the alignment questionnaire, the Lead Agent must always execute the pre-scan setup: `node scripts/initial-codebase-scan.js --target-path <targetPath>`. You must verify the command exited with `0` (success) before proceeding. You must never run the orchestrator script on a missing manifest or setup failure.

## Workflow: Mandatory Verification & Review Gate for Programming Tasks

This workflow applies strictly to tasks that involve writing, modifying, or refactoring code. It does NOT apply to planning, brainstorming, research, or exploratory tasks.
This gate is **mandatory under all circumstances, with no exceptions whatsoever** (including minor tweaks, hotfixes, simple script edits, config changes, or small follow-up tasks). Skipping this step is strictly forbidden.

Before declaring any programming or code-writing task as finished:
1. **Mandatory Testing:** If you are modifying or refactoring a file, you must write or update tests to confirm that both existing functionality and new code work as expected.
2. **Run Local Checks:** Run the workspace's tests, linters, and compilers (e.g., `npm run test`, `eslint .`, `pytest`). Resolve any errors or warnings.
3. **Spawn a Reviewer Subagent:** Use `define_subagent` and `invoke_subagent` to spin up a fresh-context reviewer (`code-reviewer`). Use the agent definition and prompt rules defined in [code-reviewer.md](solo-dev-toolkit/agents/code-reviewer.md). **Graceful Fallback:** If subagent tools (`define_subagent` / `invoke_subagent`) are not supported or fail in this environment, perform the adversarial code review yourself in this session following the exact prompts in [code-reviewer.md](solo-dev-toolkit/agents/code-reviewer.md).

3. **Reconcile Findings:** You must address all [Critical] and [Important] issues. If code changes are made, run tests and lints again.
4. **Design Documentation Check:** If any new or modified technical design documents (under `docs/design/`) are written as part of the implementation, you must explicitly highlight these documents to the user in your walkthrough summary so they can approve the design.
5. **Auto-Commit:** Once all tests, linters, and the code review pass, you are authorized to automatically commit the changes using the Conventional Commits format, unless the user has explicitly requested in the prompt not to auto-commit.
