---
name: state-integrity-auditor
description: Guides agents through auditing codebase state machines, scaffolding mathematical specifications (TLA+), writing Rust Kani proof verification harnesses, and verifying model invariants. Use when specifying protocols, proving absence of out-of-bounds index errors, model-checking concurrency locks, or proving mathematical correctness.
---

# Formal Verification & Specifications (`state-integrity-auditor`)

## Overview
A specialized mathematical verification and audit assurance workflow designed to audit source repositories for high-risk logic, scaffold formal specification files (such as TLA+ state machine models), configure SMT solver proof harnesses (such as Rust Kani proofs), and prove correctness invariants.

## When to Use
Use this skill when:
- Designing or auditing complex protocol state machines (such as network handshakes or RTOS scheduler loops).
- Verifying safety-critical synchronization blocks, lock bounds, or concurrency mutexes.
- Mathematically proving the absence of runtime panics, integer overflows, or index out-of-bound errors.
- Designing formal models to verify system specs before implementation.
- Invoking the slash command: `/rw-state-integrity-auditor`.

## Core Process

### Phase 1: Interactive Alignment & Model Scoping
- **Headless Mode Override:** Refer to Phase 1 of [Headless Mode Override Protocol](../../references/headless-override.md).
Before writing formal specification templates or solver harnesses, align with the developer:
1. **Target Verification Scope:** Identify the critical algorithm, state machine, or function that requires formal verification.
2. **Verification Tool:** Select the target solver environment (e.g. TLA+ for architectural model checking, Rust `Kani` for code-level SMT proofs).
3. **Invariants & Safety Properties:** Define the mathematical statements that must *always* hold true (e.g. "buffer length never exceeds capacity", "no double locking").
4. **Assumption Limits:** Establish constraints on symbolic inputs to prevent SMT solver state-space explosion (e.g. limiting symbolic array lengths to <= 256).

### Phase 2: Ingestion & Logic Scan
- **Headless Mode Override:** Refer to Phase 2 of [Headless Mode Override Protocol](../../references/headless-override.md).
Scan the repository to target verification:
1. **Critical Code Sweep:** Search for complex match statements, state variables, array indexing, and unsafe memory blocks.
2. **Toolchain verification:** Check for verification compilers (like `cargo-kani`, `tlc` runners) in the system path.
3. **State Variable Audit:** Scan module entry points to map out variable ranges.

### Phase 3: Interactive Scaffolding Guidance
- **Headless Mode Override:** Refer to Phase 3 of [Headless Mode Override Protocol](../../references/headless-override.md) (writing observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-state-integrity-auditor.md`).
Draft all specifications, proof harnesses, and SMT solver configurations in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending model checks, creating formal files, or editing active build configurations.
2. **Strict Inter-Agent Boundaries:** Respect existing test and build configurations. Do **NOT** overwrite, alter, or remove configurations added by other agents.
3. **Interactive Code Review:** Display generated TLA+ module blocks, Kani proof functions (`#[cfg(kani)]`), or abstract interpretation rulesets to the developer, prompting them for review and confirmation.
4. **Decoupled Reference Use:** Use [Formal Verification Standards](../../references/formal-methods-patterns.md) as the source of truth for TLA+ specification templates, Kani harnesses, and verification commands.
5. **README Integration:** Append setup instructions, solver prerequisites, and execution commands (e.g. how to launch the model checker) to `README.md` or setup guides.

### Phase 4: Verification & Validation
1. **Solver Verification Run:** Run the model checker or solver (e.g., `cargo kani` or `tlc ...`) locally to ensure the proof harness successfully compiles and runs.
2. **Invariant Proof Verification:** Confirm that the solver outputs a `SUCCESS` status, indicating that the defined invariants were mathematically proven.
3. **Safe Rollback:** If compilation or proof verification fails, notify the developer of the exact errors. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd`).

## Common Rationalizations
- *"Formal proofs are only for academia."* - Low-level firmware and system kernels operate in zero-fault environments. Mathematically proving that code cannot panic or overflow prevents critical physical device failures.
- *"We already run unit tests and fuzzing."* - Tests and fuzzing search for bugs by executing code on concrete inputs. Formal verification inspects all possible states symbolically, proving the complete absence of bugs within the defined assumptions.

## Red Flags
- Scaffolding a formal proof that does not specify input constraints (`assume` statements), causing the SMT solver to hang or run out of memory (state-space explosion).
- Writing TLA+ specification modules that do not define initial states (`Init`) or state transitions (`Next`).
- Proposing formal verification on generic CRUD operations or dynamic frontend templates.

## Verification
To verify the formal methods setup:
- Confirm that the verification harness runs and completes model validation checking without syntax errors.
- Validate that mock assertion violations correctly cause the solver/model checker to report failure with non-zero exit codes.
- Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
