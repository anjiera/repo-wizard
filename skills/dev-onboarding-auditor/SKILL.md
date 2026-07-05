---
name: dev-onboarding-auditor
description: Guides agents through auditing codebase setup instructions, environment files, setup scripts, and contribution docs. Use when analyzing developer onboarding flows or verifying README/environment consistency.
---

# Developer Onboarding Auditor

## Overview
A language-neutral engineering audit workflow designed to evaluate developer setup documentation, environment configuration alignment, bootstrap scripts, and contributor guidelines. It generates structured onboarding observation reports and scaffolds tools like `dotenv-linter` or template files.

---

## When to Use

### Triggering Conditions
* Reviewing README setup/installation blocks.
* Checking if `.env.example` matches environment keys used in source code.
* Auditing or creating local bootstrap scripts (`setup.sh`, `scripts/setup.js`, `install.bat`).
* Verifying contribution entry points (`CONTRIBUTING.md`, PR/issue templates) are present.

### When NOT to Use
* Writing application business logic files.
* Generating architectural diagrams or records (delegated to `technical-scribe`).
* Modifying user files directly without developer opt-in.

---

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-dev-onboarding-auditor.md` under Phase 3 / Phase 4.

### Phase 1: Context & Profile Identification
Read the contract metadata (`task_metadata` from `manifest.json`) or session settings to extract:
1. **Target Developer Profile:** hobbyist/solo, release-focused, or enterprise.
2. **Project Runtime Stack:** Confirm dependencies (Node, Python, Go, etc.) to target stack-specific onboarding checks.

### Phase 2: Scanning & Heuristic Audit
Inspect the codebase files recursively. Look for:

1. **Environment Config Alignment:**
   - Locate environment variables referenced in source files (e.g., matching `process.env.XYZ` or `os.environ.get`).
   - Check if `.env.example` or equivalent contains all referenced keys.
2. **Setup Instructions & Scripts:**
   - Scan the main README for installation commands. Check if they match actual dependencies.
   - Look for setup scripts (`setup.sh`, `setup.bat`). Verify if they check for runtime requirements (e.g., node version, docker running).
3. **Onboarding & Contribution Guidelines:**
   - Check for `CONTRIBUTING.md`, `.github/pull_request_template.md`, and issue templates.

### Phase 3: Reporting & Backlog Synthesis
- Save the proposed scaffolding contract to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/contracts/dev-onboarding-auditor-contract.json`.

For every issue found:
1. State the file name, location, and issue type (e.g., environment keys misalignment, missing contributor guidelines).
2. Detail the missing configuration or discrepancies.
3. Suggest a specific mitigation pattern (e.g. *Add missing keys to .env.example*, *Scaffold a standard contributing guide*).

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "A contributing guide is only needed for open-source repositories." | Even private/commercial repositories benefit from clear contribution guidelines to align team coding standards. |
| "Missing environment variables in example files can be diagnosed at runtime." | Unaligned env files create friction for new developers during initial setup, leading to setup delays. |

---

## Red Flags
* Generating system context diagrams or ADR files (these belong to `technical-scribe`).
* Scaffolding environment configurations that contain raw passwords or API keys.

---

## Verification

After executing the workflow, verify:
- [ ] Checked environment example templates for alignment with source keys.
- [ ] Confirmed setup instructions are present in the primary README.
- [ ] Verified contribution templates and setup scripts are validated.
- [ ] Observations and contract files are written cleanly under `.repo-wizard/reports/`.
