---
name: appsec-hardener
description: Suggests secure headers, strict CORS rules, and rate limits to harden your app.
---

# Application Security Hardening (`appsec-hardener`)

## Overview
A specialized application security engineering workflow designed to audit source code and API endpoints for vulnerabilities, configure secure HTTP header middlewares, establish strict CORS settings, integrate rate-limiting throttles on sensitive endpoints, write parameter input sanitization libraries, and deploy local Semgrep rules.

## When to Use
Use this skill when:
- Hardening web API routes against Cross-Site Scripting (XSS) or SQL Injection (SQLi).
- Applying secure headers (Helmet, custom middlewares) on backend web servers.
- Configuring rate limits to prevent brute-force attacks on authentication endpoints.
- Setting up origin restriction policies (CORS) for client-server integrations.
- Tool static security linters (Semgrep config rules).
- Invoking the slash command: `/rw-appsec-hardener`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-appsec-hardener.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Policy Setup
Before scanning or tooling, align with the developer on target settings:
1. **Target Endpoints & CORS:** List the backend base URLs and specific domains to whitelist under the CORS configuration.
2. **Secure Headers Policy:** Review the secure headers checklist (CSP, HSTS, frame options) and agree on values (e.g. strict vs legacy-support settings).
3. **Throttling & Rate Limits:** Define the rate limits for general API requests (e.g. 100 reqs/15m) and sensitive endpoints (e.g. login attempts capped to 5 per hour).
4. **Static Scanning Rules:** Check which security rulesets are needed (e.g., standard OWASP Top 10 SAST checks).

### Phase 2: Codebase Security Scan
Audit the codebase to check current configurations:
1. **Middleware Check:** Check the codebase handler entry points for secure header inclusions (like helmet in Node, or secure middleware in Python).
2. **CORS Scan:** Search for configuration keys matching `cors`, `allow_origins`, or `Access-Control-Allow-Origin`.
3. **Query Concatenation Scan:** Audit database queries to check for string concatenations instead of parameterized query placeholders.
4. **Package Scan:** Check manifests for existing security, rate-limiting, or linter dependencies.

### Phase 3: Interactive Tooling Guidance
Draft all configurations, middlewares, and scripts in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or performing package installations, writing new middleware files, or modifying server configuration scripts.
2. **Interactive Code Review:** Display generated CORS settings, helmet integrations, and rate limit rules to the developer and prompt them for review and confirmation.
3. **Decoupled Reference Use:** Use [Application Security (AppSec) Hardening Guide](../../references/appsec-hardening-guide.md) as the source of truth for secure header metrics, rate limits, and sanitizers.
4. **Onboarding Integration:** Once verified, add the security verification run commands (e.g. running the Semgrep check) to the project's onboarding files (`README.md` or setup guides) for developer review.

### Phase 4: Verification & Validation
1. **Syntax Check & Compilation:** Verify that the server compiles and boots cleanly without crashing after applying security middlewares.
2. **Headers Verification:** Audit simulated response headers to verify that CSP, HSTS, and frame options are properly returned.
3. **Safe Rollback:** If validation tests break after tooling, notify the developer of the exact errors. Attempt to debug/resolve the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"A simple wildcard CORS * is fine in staging, we'll fix it in production."* - Wildcard CORS setups frequently leak to production. Always configure strict origin whitelisting in local profiles or environment files from day one.
- *"Our ORM protects us from SQL injection, so we can ignore input checks."* - While ORMs protect standard queries, developers often bypass them for raw SQL clauses (e.g. raw filters). Enforce static SAST checks on all database calls.

## Red Flags
- Tooling security packages or modifying server initialization files without developer consent.
- hardcoding plain-text API secrets, JWT signature keys, or private salts in environment files or config scripts.
- Disabling CORS protections globally to resolve a local browser rendering issue.

## Verification
To verify the AppSec setup:
1. Confirm the helmet/CORS/rate-limit middlewares compile and run without error.
2. Verify that the Semgrep config file detects raw concatenations in mock tests.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
