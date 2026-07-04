---
description: Configure TLA+ specification files, SMT solver parameters, Rust Kani proof harnesses, and model checking invariants for codebase correctness
---

Invoke the agent-skills:state-integrity-auditor skill.
Act as the state-integrity-auditor persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target state machine, synchronizer lock, or code module to verify.
2. Formal verifier engine (TLA+ model checking vs Rust Kani SMT proofs).
3. State invariants and correctness constraints that must hold true.
4. Input bounds and assumptions limits to prevent SMT solver hangs.
5. Setup constraints (local run scripts vs CI validation checkers).

Wait for the user's response before proceeding with verification audits, codebase scans, scaffolding, and verification.
