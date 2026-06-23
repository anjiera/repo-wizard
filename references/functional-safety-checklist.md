# Functional Safety & Safety-Critical Checklist

This checklist provides a high-density reference for auditing and configuring repositories targeting safety-critical or functional safety environments, specifically covering aerospace (DO-178C), automotive (ISO 26262), and medical device (IEC 62304) software standards.

---

## 1. DO-178C Compliance (Airborne Systems)

DO-178C (Software Considerations in Airborne Systems and Equipment Certification) defines compliance based on Design Assurance Levels (DAL A through E) based on the severity of a failure condition:
* **DAL A (Catastrophic):** Statement, Decision, and Modified Condition/Decision Coverage (MC/DC) required.
* **DAL B (Hazardous):** Statement and Decision Coverage required.
* **DAL C (Major):** Statement Coverage required.
* **DAL D (Minor) & DAL E (No Safety Impact):** Normal QA procedures.

### 1.1 Traceability & Design Rules
- [ ] **Bidirectional Traceability:** Every line of source code must trace to a High-Level Requirement (HLR) or Low-Level Requirement (LLR), and vice versa. Flag any "dead code" (code with no tracing requirement) or undocumented features.
- [ ] **Data & Control Coupling:** Scaffolding must compile and run analysis tools (e.g. static analyzers or dynamic call graph generators) to verify control and data flow invariants.
- [ ] **Source-to-Object Traceability:** For DAL A, compile-time optimization must be verified or disabled (`-O0` or strict compiler qualification) to ensure compiler-inserted code can be traced directly to source statements.

### 1.2 Structural Coverage Checklist
- [ ] **DAL C (Statement Coverage):** Verify that every executable statement in the codebase is run at least once during testing.
- [ ] **DAL B (Decision Coverage):** Verify that every decision point (e.g., `if`, `while`, `switch`) has evaluated to both TRUE and FALSE outcomes during testing.
- [ ] **DAL A (MC/DC Coverage):** Verify that every entry and exit point in the program has been invoked, every decision has taken all possible outcomes, and each condition in a decision has been shown to independently affect the decision outcome.

---

## 2. ISO 26262 Compliance (Automotive Software)

ISO 26262 defines functional safety for road vehicles, classifying risk into Automotive Safety Integrity Levels (ASIL A through D, with D being the most critical).

### 2.1 Static Code Analysis & Linting (MISRA Rules)
- [ ] **Coding Standard Enforcer:** Configure static analysis engines (e.g., Cppcheck, PC-lint, Clang-Tidy) with strict rulesets conforming to MISRA C:2012 / MISRA C++:2008.
- [ ] **Dynamic Memory Block:** Enforce strict static analysis rules prohibiting dynamic memory allocation (no `malloc`, `free`, `new`, or `delete` after initialization) to prevent heap fragmentation and memory exhaustion.
- [ ] **Pointer Safety:** Prohibit pointer arithmetic, multiple levels of indirection (e.g., limit to single pointers), and require compile-time boundary checks on all array accesses.

### 2.2 Compilation & Architecture Gates
- [ ] **Compiler Qualification:** Use qualified compilers (safety-certified toolchains) and record the exact compiler version, flag settings, and linker configurations in build scripts.
- [ ] **Single Entry/Exit:** Enforce structural rules requiring functions to have a single entry and exit point (no early `return`, `break` inside loops, or `goto` statements) to support clean control flow analysis.

---

## 3. IEC 62304 Compliance (Medical Device Software)

IEC 62304 governs software lifecycle processes for medical device software, classifying software based on hazard potential:
* **Class A:** No injury or damage to health is possible.
* **Class B:** Non-serious injury is possible.
* **Class C:** Death or serious injury is possible.

### 3.1 Software of Unknown Provenance (SOUP) Auditing
- [ ] **SOUP Registry:** Document all third-party libraries, operating systems, and packages in a dedicated registry (`docs/SOUP.md`).
- [ ] **Risk Evaluation:** For each SOUP component, identify and record:
  - Component name, version, and publisher.
  - Functional requirements satisfied by the component.
  - Hardware/software dependencies.
  - Known anomalies/bugs (via public registries) and mitigation controls.
- [ ] **SOUP Isolation:** Implement architectural boundaries (e.g., wrapper APIs, runtime sandboxes, or process isolation) to ensure a failure in a SOUP component cannot propagate to Class B/C software components.

### 3.2 Verification and Risk Control
- [ ] **Risk Control Mapping:** Ensure every software risk control measure (e.g., bounds checks on sensor inputs, watchdog timers) is mapped directly to a unit test verifying its behavior.
- [ ] **Static Analysis:** Scan all Class B/C code using automated static analyzers configured to flag buffer overflows, race conditions, null pointer dereferences, and division by zero.
- [ ] **Regression Testing:** Establish an automated build gate that runs the entire test suite on every change, asserting zero-regression on safety-critical pathways.
