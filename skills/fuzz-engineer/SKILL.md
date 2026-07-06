---
name: fuzz-engineer
description: Guides agents through auditing codebases to identify crash-prone parsing blocks, tooling fuzz-testing harnesses (libFuzzer, cargo-fuzz, Atheris), configuring address/undefined behavior sanitizers, and integrating continuous fuzzing in CI. Use when setting up fuzz tests, searching for memory leaks, testing parsers, or investigating boundary vulnerability discovery.
---

# Fuzz Testing & Vulnerability Discovery (`fuzz-engineer`)

## Overview
A specialized security engineering and quality assurance workflow designed to audit codebases for crash-prone input handlers, configure coverage-guided fuzz testing loops (`libFuzzer`, `cargo-fuzz`, `Atheris`), and enable compile-time memory checks (AddressSanitizer, UndefinedBehaviorSanitizer) to identify boundary vulnerabilities and memory safety defects.

---

## When to Use

### 1. When this skill SHOULD be used:
- **Untrusted Input Boundaries:** The project contains modules accepting strings, binaries, or network packets from external, untrusted sources.
- **Custom Parsing Code:** The project implements custom parsers, regex tokenizers, serialization frameworks, or file decoders (e.g. parsing JSON, custom CSV structures, binary protocols, XML, yaml).
- **Security-Critical Code:** Libraries performing cryptography, data compression, base64 encoding/decoding, or packet serialization.
- **High-Risk Native Languages:** C/C++ codebases where buffer overflows, double frees, and use-after-free vulnerabilities are risks.
- **State Machine Verification:** Proving robustness of sequence-sensitive input streams (e.g., protocol handlers).
- **Engaging the Slash Command:** Invoking the command `/rw-fuzz-engineer`.

---

## When to NOT Use

### 2. When this skill should NOT be used or engaged:
- **Simple CRUD Applications:** Databases or microservices that pass data directly to standard SQL query builders or well-tested ORMs without custom parsing logic.
- **Static Configuration Repositories:** Codebases containing only constant definitions, styling rules, HTML pages, or build scripts.
- **Declarative Web Frontends:** UI components (React, Vue, HTML/CSS templates) where data schemas are strictly validated and handled by the web browser runtime.
- **Third-Party API Wrappers:** Scripts that call external REST/SOAP APIs where network latency blocks high-frequency local function executions.
- **Tight Resource Constraints:** Scenarios where the user does not have access to clang, cargo-fuzz compilers, or local high-performance running cores (fuzzing requires running code thousands of times per second).

---

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-fuzz-engineer.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Scope Mapping
Before generating harness code or installing fuzzer packages, align with the developer:
1. **Target Module Identification:** Identify the specific functions that accept raw byte buffers or strings and parse them.
2. **Target Fuzz Engine:** Choose the appropriate runner for the language (e.g., `libFuzzer` for C/C++, `cargo-fuzz` for Rust, `Atheris` for Python, `go-fuzz` for Go).
3. **Unexpected Exception Policy:** Clarify which exceptions or failures are considered "expected" (and should be caught) vs. "failures" (which should crash the runner).
4. **CI Integration Scope:** Determine whether the fuzzer should run only locally (default) or integrate into remote security pipelines (e.g. ClusterFuzz, GitHub Action fuzz loops).

### Phase 2: Ingest & Parser Codebase Scan
Scan the repository to map inputs:
1. **Parser & Ingest File Sweeps:** Search for functions with signatures accepting raw input (e.g., `char*`, `const uint8_t*`, `std::string`, `bytes`, `read()`).
2. **Dependency Manager Scan:** Check `package.json`, `Cargo.toml`, `requirements.txt` to find compiler toolchains and language versions.
3. **Compiler Checks:** Verify that `clang`, `gcc`, or `cargo` are available in the local execution path.

### Phase 3: Interactive Tooling Guidance
Draft all configurations, harness templates, and launch scripts in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing compiler configurations, creating fuzzing directories, or editing active build files.
2. **Strict Inter-Agent Boundaries:** Respect existing test structures. Do **NOT** overwrite, alter, or remove configurations added by other testing agents (such as Jest, Vitest, or JUnit configurations).
3. **Interactive Code Review:** Display the generated harness file (the wrapper mapping fuzzer inputs to the codebase function) and command-line scripts to the developer, prompting them for review and confirmation.
4. **Decoupled Reference Use:** Use [Fuzz Testing Standards](../../references/fuzzing-patterns.md) as the source of truth for libFuzzer targets, Atheris scripts, cargo-fuzz configurations, and compiler flags.
5. **README Integration:** Append setup instructions, environment variables, and run commands (e.g. how to launch the fuzzer binary) to `README.md` or setup guides.

### Phase 4: Verification & Validation
1. **Dry-Run Compilation:** Verify that the fuzzer harness compiles successfully with sanitizers enabled (e.g., compile a test fuzzer target without errors).
2. **Harness Integrity Check:** Run the fuzzer with a minimal run budget (e.g., run for 10 seconds or 1000 iterations) to verify that the wrapper calls the target function cleanly without immediate initialization crashes.
3. **Safe Rollback:** If compilation or dry-runs fail, explain the exact errors. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd`).

---

## Common Rationalizations
- *"We already run unit tests, so we don't need fuzzing."* - Unit tests only check specific inputs selected by developers. Fuzzing generates billions of mutated inputs to find edge-case inputs that developers would never think to test.
- *"Fuzzing takes too long to set up."* - Setting up a simple 10-line fuzzer harness on a parser takes very little time and can find memory leaks or crashes that would otherwise crash production systems.

---

## Red Flags
- Recommending a fuzzer harness that makes external database calls, HTTP queries, or disk writes during the test loop (this slows execution speed and pollutes the environment).
- Forgetting to filter fuzzer input size (fuzzing targets should discard buffer inputs that are too large to prevent out-of-memory errors).
- Proposing fuzz tests for a codebase that only renders static UI components.

---

## Verification
To verify the fuzzing configuration:
1. Confirm the harness target compiles with `-fsanitize=fuzzer,address,undefined` or equivalent target frameworks.
2. Validate that running the fuzzer for a dry-run iteration limit (e.g., `-runs=1000` for libFuzzer) executes and exits without harness crashes.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
