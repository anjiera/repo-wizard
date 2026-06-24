---
name: react-performance-pilot
description: Guides agents through auditing React components for re-renders, INP yielding, variable font overrides, and bfcache. Use when optimizing React client-side rendering speed, fixing layout shifts, or fixing back/forward navigation.
---

# React Web Performance Auditing & Scaffolding (`react-performance-pilot`)

## Overview
A specialized performance optimization workflow for React web applications, focusing on Interaction to Next Paint (INP) yielding via scheduler APIs, Layout Shift (CLS) mitigation using font metric overrides, and Back/Forward Cache (bfcache) compatibility.

## When to Use
Use this skill when:
- Auditing user interface interaction latency and input responsiveness.
- Resolving cumulative layout shift issues related to custom font loading.
- Remediating legacy window `unload` event handlers to enable page caching.
- Invoking the slash command: `/rw-react-performance`.

## Core Process

### Phase 1: Interactive Alignment & Profile Definition
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, skip interactive alignment and infer target standards from the codebase.
Before auditing or making edits, align with the developer:
1. **Performance Targets:** Identify the specific bottlenecks (e.g. INP, CLS, or page load times).
2. **Framework specifics:** Align on routing setups (Vite SPA, Next.js App router, Remix) and styling methodologies (Tailwind, CSS Modules).
3. **Browser Targets:** Establish if the target user base utilizes older mobile hardware where main thread yield cycles are critical.

### Phase 2: Codebase Performance Audit
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, bypass consent. If Approach B is used, output `[Data Blocked: Requires Shallow Clone / Local Checkout to evaluate]` for unobservable details.
Audit the codebase to check current React performance configurations:
1. **Rendering Analysis:** Search for complex calculations inside render blocks and verify use of caching tools (`useMemo`, `useCallback`).
2. **Asset Inspection:** Inspect font loading structures and CSS font-face declarations to check for missing overrides.
3. **Event Listener Check:** Search for `window.addEventListener('unload')` patterns.

### Phase 3: Interactive Scaffolding Guidance
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, do not perform file writes. Instead, write suggested additions directly into the report section.
Draft all configurations, tests, and scripts in coordination with `tool-scaffolder.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before suggesting the automatic installation of packages, editing setup scripts, or modifying configuration files.
2. **Interactive Code Review:** Display generated React hooks, style adjustments, or page event listeners to the user and prompt them for review and confirmation.
3. **Decoupled Reference Use:** Use [React Web Performance Patterns](../../references/performance-patterns/performance-patterns-react.md) as the source of truth for yielding hooks, CSS styles, and event cleaners.

### Phase 4: Verification & Validation
1. **Component Verification:** Verify that modified React files compile without warnings and render correctly.
2. **No Absolute Paths:** Ensure all configuration and script imports utilize relative paths instead of absolute system paths.
3. **Safe Rollback:** If validation fails, report exact error outputs. If debugging fails, ask for permission before reverting changes using VCS commands.

## Common Rationalizations
- *"We can just wrap every single function in useCallback and useMemo to solve all performance problems."* - Memoization is not free; it carries memory overhead for reference comparison. Apply caching selectively on hot paths with heavy array operations or deep subtree re-renders.
- *"We don't need font overrides because our CDN font loads extremely quickly."* - CDN networks can fluctuate. Pre-loading layout dimensions or fallback metrics ensures zero layout shift regardless of network speeds.

## Red Flags
- Committing heavy font files or images directly to the codebase to solve loading latency.
- Introducing event listeners globally without cleanups in `useEffect` return statements, creating memory leaks.

## Verification
To verify the React performance setup:
1. Confirm the setup files and scripts compile and execute successfully.
2. Verify that there are no remaining `unload` event listeners in the compiled assets.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
