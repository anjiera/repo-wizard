---
name: performance-pilot
description: Guides agents through auditing codebase performance setups, scaffolding local micro-benchmarks, writing automated HTTP load/stress tests, and configuring CI performance budget gates. Use when setting up benchmarking, optimizing speed/latency, configuring load testing, or adding performance gates.
---

# Performance Auditing & Scaffolding (`performance-pilot`)

## Overview
A specialized performance engineering workflow designed to audit software speed and latency bottlenecks, scaffold local micro-benchmarking suites (e.g. Tinybench, pytest-benchmark, Criterion), configure concurrent load and stress tests (e.g. k6, autocannon, Locust), and establish performance budget gates within CI/CD pipelines.

## When to Use
Use this skill when:
- Establishing performance targets or latency baselines for a codebase.
- Configuring micro-benchmarks to optimize hot paths or algorithmic execution times.
- Scaffolding load-testing profiles to verify application reliability, concurrency, and throughput under stress.
- Setting up pre-commit or CI/CD budget verification gates to block performance regressions.
- Invoking the slash command: `/rw-performance`.

## Core Process

### Phase 1: Interactive Alignment & Profile Definition
Before scanning or scaffolding, align with the developer on target configurations:
1. **Performance Focus:** Confirm the focus areas: micro-benchmarks (isolated logic speed) vs. load testing (system concurrency and API throughput).
2. **Benchmark Frameworks:** Align on preferred local benchmarking tools based on the stack (e.g. pytest-benchmark for Python, Tinybench for Node.js, Criterion.rs for Rust).
3. **Load Testing Targets:** Identify endpoints to load test (e.g. `/api/v1/health`), target concurrent users, target duration, and target SLAs (e.g., 95% of requests under 200ms).
4. **CI Budget Gates:** Ask the developer for permission and specifications to configure performance budget limits that fail builds or pull requests on regressions.

### Phase 2: Codebase Performance Audit
Scan the codebase to evaluate current performance configurations:
1. **Manifest Audit:** Read build manifest files (e.g., `package.json`, `Cargo.toml`, `pyproject.toml`) to detect existing benchmark dependencies or load-testing libraries.
2. **Config Audit:** Look for configuration files related to speed or benchmarks (e.g. `.k6.js`, `locustfile.py`, `pytest.ini`).
3. **Module Profile:** Identify the key entry points, server routers, and database setups to locate critical code pathways.

### Phase 3: Interactive Scaffolding Guidance
Draft all configurations, tests, and scripts in coordination with `tool-scaffolder.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before suggesting the automatic installation of packages, editing setup scripts, or modifying CI/CD configurations.
2. **Interactive Code Review:** Display generated load-test scripts, benchmark configurations, and budget specifications to the user and prompt them for review and confirmation.
3. **Decoupled Reference Use:** Use [Performance Benchmarking & Load Testing Standards](../../references/performance-patterns.md) as the source of truth for micro-benchmarks, k6/locust loads, and threshold scripts.
4. **Onboarding Integration:** Once verified, add execution shortcuts or run scripts to the project's setup commands or onboarding guides (`README.md`) for developer review.

### Phase 4: Verification & Validation
1. **Dry-Run Validation:** Run a dry-run execution of the benchmark or load test (e.g. a single-iteration k6 check) to verify syntax and execution correctness.
2. **No Absolute Paths:** Ensure all configuration and script imports utilize relative paths instead of absolute system paths.
3. **Safe Rollback:** If verification fails, notify the developer of exact errors and try to resolve them. If debugging fails, ask for permission before reverting changes using VCS-specific commands.

## Common Rationalizations
- *"We can just write a custom bash script that curls the server in a loop."* - Custom loop curl scripts do not measure concurrent connection handshakes, connection pooling, or statistically valid latency percentiles. Use standard tools like k6 or autocannon.
- *"Benchmarking on a local machine in CI is too volatile, let's skip automated gates."* - While CPU speeds vary across execution runtimes, having a baseline metric check detects massive algorithmic regression (e.g. changing an O(N) lookup to O(N^2)). Set generous thresholds to prevent flakiness while still catching regressions.

## Red Flags
- Scaffolding a load testing tool or benchmark suite without prompting the developer for stack and framework preferences.
- Committing large, uncompressed synthetic binary payloads or mock database dumps used for benchmarks directly to the repository (these should be dynamically generated or mocked).
- Hardcoding local API URLs (like `http://localhost:3000`) inside load-test scripts without allowing env variable overrides.

## Verification
To verify the performance setup:
1. Confirm the setup files and scripts compile and execute successfully.
2. Verify that the performance budget script returns exit code 0 when execution is within limits, and exits with a non-zero code on failures.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
