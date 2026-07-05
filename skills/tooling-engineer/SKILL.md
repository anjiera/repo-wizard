---
name: tooling-engineer
description: Guides agents through safely installing tools, editing configuration files using safe AST-based methods, running verification builds, and performing robust VCS-specific rollbacks if compilation or tests break. Use when executing shell package installations, merging config files, or verifying setups.
---

# Unified Environment Scaffolder & Integrator (`tooling-engineer`)

## Overview
A specialized environment executor workflow designed to safely run shell package installations, create/merge configuration files, verify compilation and build outputs, and perform VCS-specific rollbacks if the environment is broken, preserving existing tool setups.

## When to Use
Use this skill when:
- Executing shell package installations (e.g. `npm install`, `cargo add`, `pip install`).
- Creating new config files or merging configurations (e.g., `.eslintrc.js`, `.gitignore`, `tsconfig.json`) safely.
- Running verification builds (e.g., `npm run build`, `cargo check`) to validate changes.
- Executing rollbacks on compilation or unit test failures.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-tooling-engineer.md` under Phase 3 / Phase 4.

### Phase 1: Contract Ingestion & State Baseline
1. **Contract Loading & Validation:** Read the stored JSON scaffolding contract file at `.repo-wizard/reports/<repoName>/contracts/<agentName>-contract.json` (where `<repoName>` is the folder name of the target repository being scanned).
2. **Version Checking:** Verify that the contract's `contract_version` is supported and compatible. If there is a schema version mismatch or the format is obsolete, halt and report a clean version mismatch error.
3. **Developer Consent:** Present the packages and configuration modifications from the contract to the developer and obtain explicit permission to proceed.
4. **VCS State Baseline:** Immediately before making any modifications to target files, execute a VCS check (e.g. `git status` or `git diff`) to capture the active workspace baseline. This baseline state must be used to guide rollbacks if verification fails.

### Phase 2: Package Installation & Configuration
1. **Installation:** Run package manager commands specified in the scaffolding contract.
2. **Safe Merging:** Write new configurations or merge into existing configurations as specified in the contract. Always use precise, AST-based edits or line replacements to prevent syntax breakage.
3. **Nuance Explanation:** Explain the configuration parameters being created or modified, highlighting tradeoffs (e.g. strictness settings).

### Phase 3: Verification & Documentation Integration
1. **Verification Command:** Run the designated verification command from the contract (e.g. `npm run test`, `cargo check`) to ensure the build compiles cleanly.
2. **Setup Integration:** Search for and append setup/install instructions to onboarding guides (`README.md`, `setup.sh`, `install.sh`) to support onboarding.

### Phase 4: VCS-Driven Rollback & Recovery
1. **Build Safety Failures:** If verification fails, notify the developer and output the error. Attempt to resolve the issue first.
2. **Developer Consent:** Ask the developer for explicit permission/consent before executing a VCS rollback.
3. **VCS Rollback:** Run target VCS rollback commands (e.g. `git checkout` or `git clean` on the specific modified files) to restore the codebase back to the exact VCS State Baseline captured in Phase 1, preserving all other developer edits.

## Common Rationalizations
- *"I don't need to run verification if the package was installed successfully."* - Package installation is only half the battle. Configuration files can introduce syntax errors or conflict with other setups. Always run verification.
- *"I can rollback changes right away if the build breaks."* - Never perform destructive rollbacks without consulting the developer. Give them the chance to inspect the error first.

## Red Flags
- Running destructive shell installations without asking the developer for permission first.
- Modifying files when there are uncommitted changes without alerting the developer.
- Leaving a broken codebase without rolling back or explaining the failures.

## Verification
Confirm that:
- [ ] User consent was obtained before running shell commands.
- [ ] Working tree status was checked before beginning.
- [ ] AST-based/safe merging tools were used for config changes.
- [ ] Verification commands compiled successfully (exit code 0).
- [ ] VCS-specific rollback was performed with developer consent if verification failed.
