---
name: resilience-pilot
description: Guides agents through auditing codebase fault-tolerance setups, scaffolding retry policies with backoff/jitter, wrapping network calls with circuit breakers, establishing fallback behaviors, and deploying chaos engineering script templates. Use when configuring retries, circuit breakers, fallbacks, or chaos engineering.
---

# Code Resilience & Fault-Tolerance (`resilience-pilot`)

## Overview
A specialized reliability engineering workflow designed to audit application dependencies and HTTP clients for network vulnerabilities, scaffold retry policies with exponential backoff and jitter, wrap network handlers with fail-fast circuit breakers, create fallback response templates, and configure automated local or cluster-level chaos engineering test scripts.

## When to Use
Use this skill when:
- Designing fault-tolerance wrappers for unreliable third-party APIs.
- Setting up request retry parameters (limiting numbers, adding backoff jitter) to protect against thundering herd failures.
- Scaffolding circuit breakers (timeouts, error thresholds, reset cool-downs) to prevent thread/resource pools from locking up.
- Creating backup data access routes (caching fallbacks) on service failures.
- Designing chaos engineering tests (network delay injections, pod shutdowns).
- Invoking the slash command: `/rw-resilience`.

## Core Process

### Phase 1: Interactive Alignment & Policy Setup
- **Headless Mode Override:** Refer to Phase 1 of [Headless Mode Override Protocol](../../references/headless-override.md).
Before scanning or scaffolding, align with the developer on target configurations:
1. **Critical APIs:** Identify which third-party or internal API integrations need protection (e.g., payment gateways, database endpoints).
2. **Retry Policies:** Define retry caps (e.g. maximum of 3 retries), backoff multipliers, and jitter choices.
3. **Circuit Breaker Thresholds:** Define the error rate percentage limits that trip the breaker (e.g. 50% failures), timeouts, and reset cooldown delays.
4. **Fallback Selection:** Confirm backup options on breaker trips (e.g. returning cached objects, mock error responses, degraded states).
5. **Chaos Testing Scope:** Agree on testing configurations (e.g., local traffic control shell scripts vs. Kubernetes Chaos Mesh YAML files).

### Phase 2: Codebase Reliability Scan
- **Headless Mode Override:** Refer to Phase 2 of [Headless Mode Override Protocol](../../references/headless-override.md).
Audit the codebase to check current configurations:
1. **HTTP Client Sweeps:** Search codebase directories for network request configurations (e.g. Axios, fetch, requests, reqwest imports).
2. **Wrapper Scan:** Search for existing retry decorators, breaker wrappers, or timeout settings.
3. **Database Client Scan:** Inspect database connection pools to verify timeouts and pool capacity configurations.
4. **Package Scan:** Check manifest files for reliability or chaos dependencies.

### Phase 3: Interactive Scaffolding Guidance
- **Headless Mode Override:** Refer to Phase 3 of [Headless Mode Override Protocol](../../references/headless-override.md) (writing observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-resilience-pilot-agent.md`).
Draft all configurations, middlewares, and scripts in coordination with `tool-scaffolder.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, creating script files, or modifying configuration scripts.
2. **Interactive Code Review:** Display generated retry policies, circuit breaker code blocks, and chaos injection files to the developer and prompt them for review and confirmation.
3. **Decoupled Reference Use:** Use [Code Resilience & Fault-Tolerance Standards](../../references/resilience-patterns.md) as the source of truth for retry logic, opossum/pybreaker parameters, and traffic control scripts.
4. **Onboarding Integration:** Once verified, add the chaos test execution steps (e.g. running the network latency script) to the project's onboarding files (`README.md` or setup guides) for developer review.

### Phase 4: Verification & Validation
1. **Syntax Check & Compilation:** Verify that the codebase compiles and executes cleanly after wrapping network clients.
2. **Dry-Run Chaos Test:** Run a single-iteration dry-run of the chaos script (injecting then immediately removing latency) to verify syntax and executable permissions on the shell script.
3. **Safe Rollback:** If validation tests break after scaffolding, notify the developer of the exact errors. Attempt to debug/resolve the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"We can just retry requests infinitely until the server responds."* - Infinite retries without backoff or jitter will create a "thundering herd" effect that keeps the downstream server crashed indefinitely. Always set limits (caps and jitter).
- *"Circuit breakers are only needed on high-traffic microservices."* - Even in small apps, blocking threads or connection sockets on dead dependencies will lock up the local event loop. Circuit breakers protect client responsiveness.

## Red Flags
- Scaffolding a circuit breaker wrapper without specifying custom timeouts or fallback functions.
- Leaving local chaos injection rules (`tc qdisc`) running permanently on the host interface without providing cleanup commands on script exit.
- Retrying client-side HTTP errors (like 400 Bad Request, 401 Unauthorized, or 404 Not Found)—only network or server-side (5xx) failures should be retried.

## Verification
To verify the resilience setup:
1. Confirm the retry wrapper compiles and handles timeouts cleanly in mock tests.
2. Verify the chaos script sets and removes traffic control rules cleanly.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
