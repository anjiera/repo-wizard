---
name: vcs-workflow
description: Guides agents through configuring pre-commit/submission hooks, code formatting/styling, Conventional Commit validation, and automated copyright header validation for Git, Mercurial, and Perforce codebases.
---

# VCS Hook & Commit Discipline Agent (`vcs-workflow`)

## Overview
A specialized repository automation workflow designed to configure VCS hooks (Git/Husky, Mercurial hgrc, Perforce triggers), enforce Conventional Commit messaging discipline, set up automated formatting/styling gates, and integrate copyright/license header validation pipelines.

---

## When to Use

### Triggering Conditions
* Setting up git hooks, husky automation, or lint-staged controls.
* Integrating Conventional Commits validation templates and checks.
* Configuring Prettier, ESLint, or runtime formatting gates locally or in CI/CD.
* Setting up automated copyright or licensing header scanners.
* Explicit user command invocation: `/rw-vcs-workflow`.

### When NOT to Use
* Configuring security framework compliance (use `compliance-pilot` instead).
* Scaffolding unit/E2E test suites or mocking network boundaries (use `testing-pilot` instead).

---

## Core Process

### Phase 1: VCS Alignment
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, skip interactive alignment and infer target standards and stack from the codebase.
Before running any analysis or modifications, you **MUST** align with the developer:
1. **Detected VCS System:** Detect and confirm the active version control system (Git, Mercurial, Perforce). Explain that checks are strictly conditional and run only if selected.
2. **Commit Discipline Prefixes:** Ask if the repository requires Conventional Commits validation (e.g. `feat:`, `fix:` headers).
3. **Styling & Formatting Gates:** Identify styling rules (e.g. Prettier, standard linter configurations) and confirm where format/lint checks should run (local editor, pre-commit/pre-submit hooks, remote CI).
4. **License Header Settings:** Ask if standard copyright or license notices must be enforced on source files, and confirm the owner and license type.
5. **Consent Check:** Inform the developer that you will analyze files and request explicit consent before modifying any configurations.

### Phase 2: VCS & Style Auditing
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, bypass consent. If Approach B is used, output `[Data Blocked: Requires Shallow Clone / Local Checkout to evaluate]` for unobservable details.
Scan the codebase to evaluate current configuration setups:
1. **VCS Hooks Config:** Inspect `.husky/`, `.pre-commit-config.yaml`, `.git/hooks/`, or `.hg/hgrc` configurations.
2. **Style Manifests:** Check for formatter settings (e.g., `package.json`, `.prettierrc`, `.eslintrc`, `.rustfmt.toml`).
3. **File Header Scan:** Sample files to check if copyright blocks or standard headers are already present.

### Phase 3: VCS Hook Scaffolding
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, do not invoke the environment configurer to modify files. Instead, write suggested toolchain additions, config file updates, or commit hooks into the generated markdown report Observations file at `.repo-wizard/agents/observations-vcs-workflow-agent-<repo-name-here>.md`.
Coordinate with the environment configurer to scaffold controls:
1. **Scaffolders Dispatch:** Dispatch package installations and config edits (e.g., husky, lint-staged, commitlint, or hgrc hook setups) only after receiving explicit developer permission.
2. **Interactive Options & Nuances:** Explain configuration options and tradeoff decisions (e.g. local pre-commit hook validation speeds vs build server pipelines). Ask the developer to guide the configuration file modifications.
3. **Setup Scripts & Docs Integration:** Upon successful setup and validation, automatically append installation and run commands to existing setup scripts (`setup.sh`, `setup.ps1`) or onboarding documentation (`README.md`) for developer review.
4. **No Legal Certification:** Ensure all outputs contain the mandatory disclaimer stating that configuring VCS hooks and style gates does not guarantee security or certify legal compliance.

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "Pre-commit hooks should block commits on any warning." | Too many blocking hooks slow developer velocity and encourage developers to bypass hooks (`--no-verify`). Keep local hooks fast (formatting, syntax checks) and run exhaustive checks in CI. |
| "Hardcoding copyright years in templates is fine." | Hardcoded years quickly become outdated. Auto-header scripts should dynamically pull the current year or read it from file creation metadata. |

---

## Red Flags
* Modifying hooks or installing node packages without explicit developer consent.
* Attempting to run Git-specific commands (`git status`, `git checkout`) in a Mercurial or Perforce workspace.
* Lowering styling strictness or bypassing pre-commit validation checks without developer permission and documentation.

---

## Verification

After completing the process, confirm:
- [ ] Active VCS system, commit prefixes, styling rules, and header rules were explicitly aligned.
- [ ] Configurations are deployed *only* for the options selected.
- [ ] Hook validation confirms that commit lints and formatters run successfully.
- [ ] Verification confirms no files were modified without developer consent.
- [ ] Any setup script additions or README instructions are presented as diffs for developer review.
- [ ] The mandatory legal liability disclaimer is explicitly included in the output.
