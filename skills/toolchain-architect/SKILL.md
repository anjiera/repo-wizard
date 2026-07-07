---
name: toolchain-architect
description: Helps wrangle C/Rust build targets and cross-compilation settings.
---

# Cross-Compilation & Build Toolchains (`toolchain-architect`)

## Overview
A specialized build engineering and systems infrastructure workflow designed to audit source repositories for cross-compilation toolchain parameters, tool CMake cross-compiler files (e.g. `.cmake` toolchain configurations), configure Cargo target configurations, and setup multi-architecture target compilation paths (ARM Cortex, RISC-V, WebAssembly).

## When to Use
Use this skill when:
- Compiling code targeting a processor architecture different from the host compile machine.
- Configuring custom cross-compilation toolchain binaries (such as `arm-none-eabi-gcc`, `riscv-none-elf-gcc`, Emscripten `emcc`).
- Overriding linker parameters, section stripping commands, and target-specific linker script bindings.
- Setting up compiler wrappers for WebAssembly (WASM) deployments.
- Invoking the slash command: `/rw-toolchain-architect`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-toolchain-architect.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Architecture Setup
Before writing toolchain configuration overrides, align with the developer:
1. **Target Architecture & Processor:** Map out the target processor architecture (ARM Cortex-M0/M3/M4/M7, RISC-V 32/64 bit, WebAssembly, etc.).
2. **Build System Framework:** Identify CMake, GNU Make, Cargo, or PlatformIO environments.
3. **Compiler Executable Names:** Establish cross-compiler binary paths (e.g. `riscv-none-elf-gcc`).
4. **Linker Script Placement:** Check if a linker script (`.ld` or `.x`) is required to place heap/stack sections.
5. **Sysroot Location:** Identify the sysroot directory mapping target standard C library headers (glibc, newlib, musl) if compiling on disconnected hosts.

### Phase 2: Ingestion & Toolchain Path Scan
Scan the host platform:
1. **Toolchain Check:** Verify that cross-compiler binaries (e.g. `riscv-none-elf-gcc --version`) are present in the system environment path.
2. **Linker Mappings Audit:** Inspect the workspace for compiler configuration overrides, environment scripts, or target configurations.
3. **AST Build Tool Check:** Scan the workspace structure (CMakeLists.txt, Cargo.toml) to understand active target rules.

### Phase 3: Interactive Tooling Guidance
Draft all configurations, CMake toolchain configs, and setup wrappers in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending compiler settings, creating toolchain folders, or editing active build files.
2. **Strict Inter-Agent Boundaries:** Respect existing build configurations. Do **NOT** overwrite, alter, or remove configurations added by other build or test agents (such as testing setups, coverage rules, or appsec hardeners).
3. **Interactive Code Review:** Display generated `.cmake` toolchain files, compiler flags (`-march`, `-mabi`), linker script arguments, or Cargo target configurations to the developer, prompting them for review and confirmation.
4. **Decoupled Reference Use:** Use [Cross-Compilation & Toolchain Standards](../../references/coding-standards/toolchain-standards.md) as the source of truth for CMake compiler files, cargo targets, emcmake setups, and flags.
5. **README Integration:** Append setup instructions, environment variables, compiler prerequisites, and execution commands (e.g. how to build using the toolchain file) to `README.md` or setup guides.

### Phase 4: Verification & Validation
1. **Cross-Compilation Dry-Run:** Run compile commands targeting the cross-toolchain wrapper (e.g., `cmake -DCMAKE_TOOLCHAIN_FILE=...` or `cargo build --target=...`) to ensure compilation completes without compile errors.
2. **Binary Header Verification:** Check that the generated binary format matches target architecture constraints (e.g. running `file` command or verifying ELF binary headers if utilities are available).
3. **Safe Rollback:** If compilation fails, notify the developer of the exact errors. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"We can compile locally and port binaries manually."* - Manual target compilation is fragile and doesn't scale to CI/CD. Defining code-defined toolchain configurations ensures builds are reproducible on any host.
- *"We don't need toolchain files, we can just export environment variables."* - Environment variables are easily lost or overridden. Toolchain files lock down build consistency inside the project codebase.

## Red Flags
- Recommending cross-compiler configurations that rely on absolute path compiler targets, which breaks compilation on other developer machines.
- Hardcoding host machine configurations (like Windows directory structures) into target cross-compiler files.
- Overriding linker scripts without checking RAM/Flash sizing boundaries.

## Verification
To verify the toolchain configuration:
1. Verify that target build files configure the compiler using the cross-toolchain parameters cleanly.
2. Validate that running a dry-run cross-build command compiles without package import or target architecture compiler errors.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
