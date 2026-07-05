---
name: state-hardener
description: Guides agents through auditing codebase hooks and states for stale closures, memory leaks, and async fetch race conditions. Use when configuring React states, checking event listeners, or auditing async hooks.
---

# State Sanitization Auditing & Scaffolding (`state-hardener`)

## Overview
A specialized state optimization workflow designed to audit frontend components for stale closures, asynchronous race conditions, and event listener memory leaks.

## When to Use
Use this skill when:
- Resolving state desynchronization or race conditions in async operations.
- Debugging stale variable values captured in closures (e.g. within intervals/timeouts).
- Ensuring proper teardown of DOM event listeners and store subscriptions.
- Invoking the slash command: `/rw-state-hardener`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-state-hardener.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Profile Definition
Before auditing or scaffolding, align with the developer:
1. **Target Stack:** Identify the state library in use (e.g., React useState, Zustand, Redux).
2. **Concurrency Requirements:** Establish the severity of race conditions (e.g. high-frequency input search vs. simple navigation fetching).
3. **Linter Integrations:** Verify if they want automated custom linter rules (like `react-hooks/exhaustive-deps`) set up.

### Phase 2: Codebase State Audit
Audit the codebase to check current state configurations:
1. **Hook Inspection:** Read component hook dependencies to check for stale closures.
2. **Fetch Sweeps:** Scan async fetch pathways for missing active cancellation indicators or AbortController bindings.
3. **Cleanup Audits:** Trace event listeners and intervals to ensure they have matching cleanup teardowns.

### Phase 3: Interactive Scaffolding Guidance
Draft all configurations, tests, and scripts in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before suggesting the automatic installation of packages, editing setup scripts, or modifying configuration files.
2. **Interactive Code Review:** Display generated hooks, cleanup templates, or linter rules to the user and prompt them for review and confirmation.
3. **Decoupled Reference Use:** Use [React State Sanitization Rules](../../references/state-sanitization-rules.md) as the source of truth for async handlers, event listeners, and linter settings.

### Phase 4: Verification & Validation
1. **Compilation Check:** Confirm that modified state and hook files compile successfully without type or linter errors.
2. **No Absolute Paths:** Ensure all configuration and script imports utilize relative paths instead of absolute system paths.
3. **Safe Rollback:** If validation fails, report errors and ask for permission before reverting changes using VCS commands.

## Common Rationalizations
- *"A race condition is rare, we don't need abort controllers."* - Network speed fluctuations are common on mobile devices. Out-of-order responses lead to permanent state discrepancies in the UI.
- *"ESLint hook rules are annoying, we should disable them."* - Stale closures are hard to debug visually. Keep linter rules active and fix dependencies using refs or functional state updates.

## Red Flags
- Neglecting to cleanup custom store subscriptions in store listeners, creating detached DOM memory trees.
- Suppressing linter warnings (e.g., using `// eslint-disable-next-line`) without documenting why the dependency array is safe.

## Verification
To verify the state sanitization setup:
1. Confirm the setup files and scripts compile and execute successfully.
2. Verify that eslint checks do not return hooks warnings.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
