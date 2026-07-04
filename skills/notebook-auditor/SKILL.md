---
name: notebook-auditor
description: Guides agents through auditing data science repositories, configuring nbstripout pre-commit filters to strip Jupyter Notebook output cells, setting up nbqa notebook linters, and creating virtual environment managers (Poetry, Conda, Pipenv). Use when configuring notebook filters, environment managers, or notebook linting.
---

# Jupyter Notebook VCS Hygiene & Environments (`notebook-auditor`)

## Overview
A specialized data science DevOps workflow designed to audit notebook configurations and environments, scaffold VCS clean filters (such as `nbstripout` and `.gitattributes` or `.hg/hgrc` settings) to prevent output cell bloat and PII leaks, configure notebook linters (`nbqa`), and set up pinned, reproducible virtual environments (Conda, Poetry, Pipenv).

## When to Use
Use this skill when:
- Setting up version control rules for repositories containing Jupyter Notebooks (`.ipynb` files).
- Preventing data science outputs, plots, and internal telemetry tables from being checked into version control.
- Configuring Python virtual environments to prevent CUDA/dependency conflicts.
- Setting up pre-commit formatting/linting rules for data science work.
- Invoking the slash command: `/rw-notebook-auditor`.

## Core Process

### Phase 1: Interactive Alignment & Policy Setup
- **Headless Mode Override:** Refer to Phase 1 of [Headless Mode Override Protocol](../../references/headless-override.md).
Before installing VCS filters or editing environment files, align with the developer on hygiene parameters:
1. **Target Package Manager:** Identify the preferred virtual environment manager (Poetry, Conda, Pipenv, pip/venv).
2. **Output Stripping Rule:** Confirm whether to strip all cell outputs on pre-commit (default) or retain them for specific tutorial folders.
3. **Notebook Linters:** Select styling tools to run on notebooks (Ruff, Flake8, Black).
4. **VCS Hooks Compatibility:** Verify if other agents have set up pre-commit configurations (such as Husky by `vcs-workflow-engineer.agent`).
5. **PII Safety Warning:** Explain that clean filters only strip local staged files and do not scrub historical commits or replace runtime data validators.

### Phase 2: Codebase Notebook & Environment Scan
- **Headless Mode Override:** Refer to Phase 2 of [Headless Mode Override Protocol](../../references/headless-override.md).
Audit the repository to locate active notebooks and manifests:
1. **Notebook Sweeps:** Locate all `.ipynb` files in the repository directory.
2. **Environment Manifest Scan:** Search for `pyproject.toml`, `environment.yml`, `Pipfile`, or `requirements.txt` files.
3. **VCS Filters Check:** Inspect `.gitattributes`, `.git/config`, `.hg/hgrc`, or Perforce client specs to identify existing hooks or clean filters.
4. **Inter-Agent Checks:** Scan for pre-commit hooks configured by other agents (e.g. `vcs-workflow-engineer` or `compliance-auditor` setups).

### Phase 3: Interactive Scaffolding Guidance
- **Headless Mode Override:** Refer to Phase 3 of [Headless Mode Override Protocol](../../references/headless-override.md) (writing observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-notebook-auditor.md`).
Draft all configurations, manifests, and scripts in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, creating environment manifests, or modifying existing configuration scripts.
2. **Strict Inter-Agent Boundaries:** Respect existing hook files (like Husky hooks, pre-commit config YAML files, or custom scripts). You must **NOT** overwrite, alter, or remove configurations added by other agents. Always request developer consent and provide options to append filters cleanly without disrupting existing tools.
3. **Interactive Code Review:** Display generated `.gitattributes` snippets, hgrc settings, nbstripout configs, and environment dependencies to the developer, prompting them for review and confirmation.
4. **Decoupled Reference Use:** Use [Jupyter Notebook & Data Science Standards](../../references/coding-standards/notebook-standards.md) as the source of truth for VCS attributes, hgrc config files, nbstripout commands, and environment setups.
5. **README & Setup Integration:** Once verified, add environment activation and notebook run instructions to the project's onboarding files (`README.md` or setup guides) for developer review.

### Phase 4: Verification & Validation
1. **Filter Dry-Run Verification:** Verify that the clean filter works by running a dry-run test (e.g. checking that `nbstripout -t` successfully identifies output cells in a mock notebook).
2. **Environment File Compilation:** Verify that the scaffolded environment YAML or toml file parses cleanly under the target manager.
3. **Safe Rollback:** If validation tests break after scaffolding, notify the developer of the exact errors. Attempt to debug/resolve the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"Outputs are useful to see in GitHub pull request diffs."* - Jupyter JSON output diffs are extremely long and unreadable, obscuring code changes. Stripping outputs makes code reviews cleaner and prevents data leaks.
- *"We can just manually clean notebooks before committing."* - Developers will eventually forget, leading to data bloat. Automating the clean step via pre-commit filters prevents mistakes.

## Red Flags
- Overwriting an existing `.pre-commit-config.yaml` or Husky shell script created by `vcs-workflow-engineer.agent` without merging configurations, breaking lint gates.
- Setting up global environment packages without lockfiles, causing dependency drifts across developers.
- Committing raw authentication tokens or database credentials inside a notebook's constant definitions.

## Verification
To verify the notebook hygiene setup:
1. Validate that the VCS attributes or configuration files configure `*.ipynb` with the clean filter cleanly.
2. Verify that mock notebook outputs are correctly identified and stripped by testing tools.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
