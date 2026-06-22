---
name: accessibility-auditor
description: Guides agents through auditing codebase files and configurations for compliance with digital accessibility standards (WCAG 2.1/2.2 AA, EN 301 549). Scaffolds automated a11y testing configurations (ESLint, axe-core CLI scripts) conditionally based on user choice. Use when setting up accessibility tools, auditing UI accessibility, or adding tests.
---

# Accessibility Auditor (`accessibility-auditor`)

## Overview
A specialized accessibility engineering workflow designed to audit UI codebases for semantic HTML standards, configure automated accessibility scanners (axe-core CLI tests, ESLint JSX-a11y plug-ins), and highlight manual usability checks for screen readers and keyboard navigation.

---

## When to Use

### Triggering Conditions
* Setting up automated accessibility lint rules and testing pipelines.
* Auditing frontend component frameworks (React, Vue, Angular) or static HTML/templates for accessibility conformance.
* Configuring axe-core CLI testing scripts inside headless browser runners (Puppeteer, Playwright).
* Establishing local pre-commit or CI/CD gates to verify code changes do not introduce critical accessibility failures.

### When NOT to Use
* Implementing custom CSS styling or visual layout designs that do not impact DOM semantic structures or aria-roles (these are design tasks).
* Auditing third-party vendor platforms or external software systems that cannot be modified from this repository.

---

## Core Process

### Phase 1: Accessibility Alignment
Before running any analysis or modifications, you **MUST** align with the developer:
1. **Target Standards:** Ask which accessibility standards are desired (WCAG 2.1 AA, WCAG 2.2 AA, EN 301 549, or none). Explain that checks are strictly conditional and will only run for chosen standards.
2. **Framework Stack:** Identify the frontend rendering framework (React, Vue, Svelte, static HTML) and styling configurations.
3. **Execution Pipeline:** Check where automated checks should run (local pre-commit, remote CI, or manually).
4. **Consent Check:** Inform the developer that you will analyze files and request explicit consent before modifying any configurations.

### Phase 2: Codebase Accessibility Auditing
Scan the codebase to evaluate accessibility conformance for the selected standards:
1. **Semantic DOM Review:** Identify use of non-semantic layouts (e.g. click handlers on generic `div` tags without ARIA key handlers).
2. **Alt Tags & Bindings:** Locate missing alt tags on images or missing labels on form input elements.
3. **Aria Role Verification:** Check if custom interactive components use WAI-ARIA role structures.

### Phase 3: Accessibility Scaffolding Handoff
Coordinate with the environment configurer to scaffold controls:
1. **Scaffolders Dispatch:** Dispatch package installations (e.g., eslint-plugin-jsx-a11y, axe-core CLI) to the scaffolder.
2. **Interactive Nuances:** Explain configuration options and tradeoff decisions (ruleset strictness levels, pre-commit local execution speed vs CI robustness). Ask the developer to guide the configuration file modifications.
3. **Setup Scripts & Docs Integration:** Upon successful setup and validation, automatically append installation and setup commands to the project's existing setup scripts (e.g. `setup.sh`, `setup.ps1`) or onboarding documentation (`README.md`), and present these changes to the user for review.
4. **Manual Checks Flagging:** Provide a compiled list of keyboard tab order, screen-reader focus traps, and visual high-contrast checks for the developer to manually test.

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "Axe-core passing guarantees WCAG compliance." | Automated tooling (like axe-core) only catches ~30-40% of accessibility issues. Manual review of keyboard navigation and screen readers is always required. |
| "We should make every element focusable." | Making non-interactive elements focusable creates tab fatigue. Only interactive controls should be in the tab focus loop. |
| "The default ESLint config is fine, let's skip manual rules." | Default rulesets often miss specific component design choices; developer-guided rule selection ensures rules match project needs. |

---

## Red Flags
* Claiming the repository is "100% WCAG certified" or making absolute safety statements.
* Adding arbitrary `aria-` properties to suppress lint warnings without confirming they represent correct widget behavior.
* Hardcoding styling colors to satisfy contrast ratios without consulting design guidelines.

---

## Verification

After completing the process, confirm:
- [ ] Targeted accessibility standards (WCAG 2.1, WCAG 2.2, EN 301 549, or none) were explicitly aligned.
- [ ] Codebase audits are performed *only* for the standards chosen by the developer.
- [ ] If standards are selected, automated lint rules (ESLint JSX-a11y) or test commands (axe-core CLI) are configured.
- [ ] Verification confirms no files were modified without developer consent.
- [ ] Manual verification items (focus traps, tab order, screen reader behavior) are explicitly compiled and flagged for the developer.
