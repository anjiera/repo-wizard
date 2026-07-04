# Repo Wizard: Helper and Validation Scripts Guide

The `scripts/` directory contains Node.js scripts to compile documentation, lint configurations, run mock simulations, validate data schemas, and execute end-to-end sandbox tests.

This guide details the purpose, parameters, and side-effects of each script.

---

## 1. Documentation Utilities

### Markdown-to-HTML Compiler (`scripts/md-to-html.js`)
Compiles standard Markdown documentation into responsive HTML files. It automatically bundles responsive light/dark stylesheets, highlights code blocks, and retains link references.
* **Usage:**
  ```bash
  node solo-dev-toolkit/scripts/md-to-html.js <input-markdown-file> <output-html-file>
  ```
* **Example:**
  ```bash
  node solo-dev-toolkit/scripts/md-to-html.js docs/TESTING.md docs/TESTING.html
  ```
* **Side-Effects:** Generates an HTML file at the specified output path. (Note: Locally compiled HTML files in `docs/` are git-ignored to prevent duplicate source files).

### Project Docs Validator (`scripts/validate-project-docs.js`)
Validates that project documentation is aligned across the workspace:
* **Checks:**
  - Verifies that all files in `references/` are listed in `references/README.md`.
  - Asserts that all agents and skills are cataloged in `docs/AGENT_MATRIX.md`.
  - Checks that all guides in `docs/` are linked in the root `README.md`.
  - Enforces `AGENTS.md` length restrictions and audits for absolute paths or unapproved emojis.
* **Usage:**
  ```bash
  node scripts/validate-project-docs.js
  ```

---

## 2. Static Validation Linters (Zero-Dependency)

Run these checks to verify codebase format compliance before submitting code.

### Agent Persona Linter (`scripts/validate-agents.js`)
Ensures that all Markdown files under `agents/` satisfy the required structural standard.
* **Checks:**
  - Verifies existence of required section headers (Step 1, Step 2, Step 3, 3.1, 3.2, 3.3).
  - Asserts references to the repository's robustness protocol exist.
  - Ensures a corresponding dynamic evaluation file exists in `evals/<agent-name>.js`.
* **Usage:**
  ```bash
  node scripts/validate-agents.js
  ```

### Command Parity Validator (`scripts/validate-commands.js`)
Ensures that CLI commands and their arguments match exactly across different agent environment configurations.
* **Checks:**
  - Synchronizes commands defined in `.claude/commands/`, `.gemini/commands/`, and `commands/` (Antigravity).
* **Usage:**
  ```bash
  node scripts/validate-commands.js
  ```

### Skill Folder Linter (`scripts/validate-skills.js`)
Validates that custom skills adhere to the plugin architecture constraints.
* **Checks:**
  - Asserts every subfolder in `skills/` contains a `SKILL.md` file.
  - Verifies `SKILL.md` contains valid YAML frontmatter specifying `name` and `description`.
  - Checks that description starts with *"Describes what the skill does. Use when..."* for search indexing.
* **Usage:**
  ```bash
  node scripts/validate-skills.js
  ```

### Deliverables Linter (`scripts/validate-deliverables.js`)
Audits generated reports for required compliance disclaimers and styling structure.
* **Checks:**
  - Validates that the "Developer Empowerment Disclaimer" is appended to the bottom of all HTML and Markdown reports.
  - Ensures specific section counts and length limits are respected.
* **Usage:**
  ```bash
  # Run linter assertions
  node scripts/validate-deliverables.js
  
  # Run the linter's internal self-test suite
  node scripts/validate-deliverables.js --test
  ```

### Subagent Contract Validator (`scripts/validate-contracts.js`)
Checks that the parameter objects passed between the lead orchestrator and subagents adhere to defined JSON schemas.
* **Usage:**
  ```bash
  node scripts/validate-contracts.js
  ```

### Developer Script Validator (`scripts/validate-scripts.js`)
Statically checks utility scripts to ensure code styling compliance and AST rules safety.
* **Checks:**
  - Asserts mock data strings or structures are strictly contained within `// mock-start` and `// mock-end` blocks.
  - Checks for zero-dependency requirements.
* **Usage:**
  ```bash
  node scripts/validate-scripts.js
  ```

---

## 3. Dynamic Evals & Test Runners

### LLM-as-a-Judge Eval Runner (`scripts/run-evals.js`)
Runs dynamic LLM tests to ensure that changes to agent system prompts do not break behavior or trigger regressions.
* **Requirements:** Requires the `GEMINI_API_KEY` environment variable.
* **Usage:**
  ```bash
  # Windows (PowerShell)
  $env:GEMINI_API_KEY="your-gemini-key"
  node scripts/run-evals.js
  
  # Linux / macOS / Git Bash
  GEMINI_API_KEY="your-gemini-key" node scripts/run-evals.js
  ```

### Specialist Subagent Mock Harness (`scripts/run-mock-harness.js`)
Simulates a full `/repo-wizard` run without making actual API calls. It spins up mocked specialists, coordinates data exchanges, compiles outputs, and asserts file path outputs.
* **Usage:**
  ```bash
  node scripts/run-mock-harness.js
  ```

### E2E Sandbox Test Runner (`scripts/run-e2e-tests.js`)
Executes end-to-end verification of workspace transformations.
* **Behavior:**
  - Creates a temporary test workspace directory at `temp_e2e_sandbox/`.
  - Simulates file creation, setup changes, and session archives.
  - Validates that output logs match expected formats.
* **Side-Effects:** Creates and modifies the `temp_e2e_sandbox/` directory. If the tests succeed, the folder is cleaned up. If tests fail, the directory is preserved for developer debugging.
* **Usage:**
  ```bash
  node scripts/run-e2e-tests.js
  ```

### Unit Test Helpers (`scripts/test-helpers.js`)
Executes internal unit tests for utilities like the YAML parser, JSON validators, and file system helpers.
* **Usage:**
  ```bash
  node scripts/test-helpers.js
  ```

### CLI Agent Orchestrator Runner (`scripts/run-fallback-sequential-orchestration.js`)
The core sequential scanning orchestrator engine that manages subagent execution pools.
* **Behavior:**
  - Dynamically detects codebase sizing and runs relevance sweeps.
  - Coordinates headless sequential runs and prompts for path targets.
  - Enforces mandatory parameters like `--target-path`.
* **Usage:**
  ```bash
  node scripts/run-fallback-sequential-orchestration.js --target-path <path> [options]
  ```

---

## 4. Setup & Hooks Utilities

### Git Hooks Installer (`scripts/install-hooks.js`)
Registers pre-commit hooks to automate static verification before commits are created.
* **Side-Effects:** Writes file to `.git/hooks/pre-commit`.
* **Usage:** Called automatically by the setup scripts, but can be run manually:
  ```bash
  node scripts/install-hooks.js
  ```

### Environment Configurer (`scripts/setup.js`)
Checks that the system meets node runtime versions, installs hooks, and runs static validation.
* **Usage:** Called by `./setup.sh` or `.\setup.ps1`:
  ```bash
  node scripts/setup.js
  ```

### Plugin Registration Tool (`scripts/register-plugin.js`)
Registers this repository as an active agent customization plugin in the user's configuration directories.
* **Usage:**
  ```bash
  node scripts/register-plugin.js
  ```

---

## 5. Report & Archiving Utilities

### Reports Archiver (`scripts/reports-archive.js`)
Archives the user session, manifest contract parameters, and compiled report deliverables to the `.repo-wizard/reports/history/<repoName>/<timestamp>/` folder before starting fresh or updating.
* **Usage:**
  ```bash
  node scripts/reports-archive.js [workspace-path]
  ```

### Reports Compiler (`scripts/reports-compile.js`)
Consolidates specialist agent mini-reports (observations) and compiles final report deliverables (Executive Summary, Full Report, Observations, and Backlog CSV).
* **Usage:**
  ```bash
  node scripts/reports-compile.js
  ```

---

## 6. Dashboard & Visualization Server

### Local UI Server (`scripts/dashboard-server.js`)
Spins up a local Express server and serves the single-page application dashboard to visualize report metadata, backlogs, and metrics.
* **Usage:**
  ```bash
  node scripts/dashboard-server.js
  ```

