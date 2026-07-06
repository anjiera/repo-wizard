---
name: embedded-systems-auditor
description: Guides agents through configuring low-level firmware robustness guidelines, static analysis tools (MISRA compliance via cppcheck), compiler warning flags, QEMU target testing templates, and local ring buffer logging. Use when configuring firmware codebases, embedded build systems, static analysis linter rules, or micro-controller emulators.
---

# Embedded Systems & Firmware Robustness (`embedded-systems-auditor`)

## Overview
A specialized embedded systems and firmware engineering workflow designed to audit micro-controller build files and linker layouts, configure static code analysis (cppcheck MISRA rulesets) and compiler warnings, configure stack size limit guards, tool target emulation scripts (QEMU), and implement non-volatile local circular logging structures.

## When to Use
Use this skill when:
- Setting up or auditing C/C++ or Rust firmware codebases targeting micro-controllers (ARM Cortex, RISC-V, AVR, ESP32).
- Configuring static analyzers (`cppcheck`) to check compliance with MISRA C/C++ robustness guidelines.
- Setting up compiler warning gates to detect float promotions, uninitialized values, and stack usage limits.
- Configuring target hardware emulators (such as QEMU) to enable headless testing.
- Implementing local lock-free ring buffer logging over UART or non-volatile storage (EEPROM/Flash).
- Invoking the slash command: `/rw-embedded-systems-auditor`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-embedded-systems-auditor.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Hardware Specification
Before writing code or changing build scripts, align with the developer on hardware and robustness parameters:
1. **Target Architecture & MCU:** Identify the microcontroller family (e.g. STM32 ARM Cortex-M, ESP32 Xtensa, AVR ATMega, RISC-V) and toolchain.
2. **Build System:** Identify the build tool (CMake, Makefile, Cargo, platformio).
3. **MISRA Ruleset Scope:** Determine the level of static analysis rules to enforce (e.g., MISRA C:2012 Mandatory and Required rules).
4. **Memory & Stack Limits:** Establish stack size budgets and stack overflow guard metrics.
5. **Emulation Scope:** Agree on QEMU machines and config parameters to mock target hardware peripherals.

### Phase 2: Firmware Codebase Scan
Audit the repository to locate build configurations and linker files:
1. **Build Manifest Scan:** Search for `CMakeLists.txt`, `Makefile`, `Cargo.toml`, or `platformio.ini` files.
2. **Memory Layout Audit:** Search for linker scripts (`.ld`, `link.x`) to verify stack and heap limits.
3. **Static Checking Configs:** Inspect directories for existing linter or formatter rules (e.g., `.clang-tidy`, `cppcheck` setup files).
4. **VCS Filters Check:** Ensure clean working trees and respect hooks/configs created by other agents.

### Phase 3: Interactive Tooling Guidance
Draft all configurations, warning overlays, and emulation scripts in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, modifying linker configurations, or editing active build configurations.
2. **Strict Inter-Agent Boundaries:** Respect existing build gates and CI configurations. You must **NOT** overwrite, alter, or remove configurations added by other agents (such as testing setups or AppSec configurations). Always request developer consent.
3. **Interactive Code Review:** Display generated cppcheck JSON config files, CMake warning compiler flags, linker scripts, or ring buffer structures to the developer, prompting them for review and confirmation.
4. **Decoupled Reference Use:** Use [Embedded Systems & Firmware Standards](../../references/coding-standards/embedded-standards.md) and the [Functional Safety & Safety-Critical Checklist](../../references/functional-safety-checklist.md) as your sources of truth for compiler warning flags, QEMU configuration commands, linker layouts, circular buffer log skeletons, and safety-critical compliance constraints (DO-178C, ISO 26262, IEC 62304).
5. **README & Setup Integration:** Once verified, add build guidelines and static analysis trigger commands to the project's onboarding files (`README.md` or setup guides) for developer review.

### Phase 4: Verification & Validation
1. **Toolchain Compilation Check:** Run build scripts locally (e.g., `cmake --build build` or `cargo check`) to ensure warning overlays compile correctly.
2. **Linter Dry-Run:** Run static checkers with the MISRA ruleset active to verify that violations are flagged and exit with non-zero error codes.
3. **Safe Rollback:** If compilation or static checks fail, explain the exact errors to the developer. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"Static code analysis slows down our local compilation cycle."* - Catching undefined behavior (like buffer overflows or unaligned access) during compile time is significantly cheaper than diagnosing memory corruption on a deployed physical device.
- *"We don't need stack size limits because our firmware is small."* - Stack overflows in bare-metal systems silently corrupt variables and lead to unpredictable hardware failures. Linking warnings and stack usage audits enforce robustness boundaries.

## Red Flags
- Recommending dynamic heap memory allocation (`malloc`, `free`) in critical, long-running bare-metal microcontroller systems without analyzing heap fragmentation risks.
- Overwriting existing linker configurations without checking the physical microcontroller's RAM and Flash boundaries.
- Generating a local ring buffer logging skeleton that automatically blocks execution when the buffer is full, which can hang critical hardware tasks.

## Verification
To verify the embedded systems setup:
1. Verify that the cppcheck MISRA configuration runs and exits with non-zero codes on target coding standard violations.
2. Validate that the compiler warning flags (such as `-Wdouble-promotion` and `-Werror`) successfully flag implicit float promotions during test builds.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
