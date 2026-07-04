---
name: maintainability-auditor
description: Guides agents through auditing codebase files and configurations for maintainability, DRY compliance, structural simplicity, nesting depth, and Fowler code smells based on user profiles. Use when scanning repositories for code quality and refactoring opportunities.
---

# Maintainability & Refactoring Auditor

## Overview
A language-neutral engineering audit workflow designed to evaluate the design simplicity, nesting depth, and clean-code properties of a codebase. It screens code against standard Code Smells and recommends standard Martin Fowler Refactoring Targets to populate the project backlog, without modifying files directly.

---

## When to Use

### Triggering Conditions
* Onboarding a new repository to map its technical debt.
* Reviewing a module or folder for potential architectural refactoring opportunities.
* Preparing a codebase-wide clean-up backlog.
* Invaluable when assessing cognitive complexity, nested loop structures, or long method smells.

### When NOT to Use
* Implementing feature code, adding imports, or compiling applications.
* Performing security or copy checks (delegate to `appsec-hardener` or `legal-neutrality-auditor` instead).

---

## Core Process

### Phase 1: Context & Profile Identification
Read the contract metadata (`task_metadata` from `manifest.json`) or session settings to extract:
1. **Target Project Goal (`project_goal`):**
   - **`personal` (Hobby/Prototype):** Auditor skips advanced OOD code smells (Feature Envy, Primitive Obsession, Shotgun Surgery) to avoid overwhelming the developer. It flags only critical layout issues: file lengths, copy-pasted blocks, and deep nested branching.
   - **`release` / `enterprise`:** Auditor runs the full checklist of code smells and structural debt.
2. **Languages & File Types:** Detect what files (e.g. `.js`, `.py`, `.rs`, `.go`) are scanned.

### Phase 2: Scanning & Heuristic Audit
Inspect the codebase files recursively. Look for:

1. **High Branching Complexity & Deep Nesting (All Profiles):**
   - Identify loops and conditionals nested 3+ levels deep.
   - Suggest guard clauses or extract-method solutions to flatten the code.
2. **File Bloat (All Profiles):**
   - Find files exceeding 500 lines of code.
3. **Duplicated Code (All Profiles):**
   - Locate large copy-pasted structures or loops that can be abstracted.
4. **Fowler's Code Smells (Release & Enterprise Only):**
   - *Long Function / Method:* Subroutines with too many statements.
   - *Large Class:* Classes holding too much state or responsibility.
   - *Long Parameter List:* Methods accepting 5+ distinct parameters.
   - *Primitive Obsession:* Overusing primitive types (e.g. strings, raw dicts/arrays) instead of small object wrappers.
   - *Feature Envy:* A function accessing data elements of another class/module excessively.
   - *Shotgun Surgery:* Cohesion problems where a single change requires modification to many small files.

### Phase 3: Reporting & Backlog Synthesis
- **Headless Mode Override:** Save findings table as a mini-report under `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-maintainability-auditor.md`.
- Save the proposed scaffolding contract to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/contracts/maintainability-auditor-contract.json`.

For every issue found:
1. State the file name, approximate location, and classification.
2. Highlight the cognitive friction/readability cost.
3. Suggest a clear Fowler Refactoring Target (e.g. *Extract Function*, *Extract Class*, *Introduce Parameter Object*, *Replace Conditional with Guard Clauses*).

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "It's a small project, spaghetti code doesn't matter." | Deep nesting makes debugging twice as slow even for personal prototypes. |
| "An LLM should run exact mathematical AST cyclomatic complexity." | LLMs are error-prone at exact path counts. Heuristics like deep nesting level (3+ deep) provide better, more reliable signals. |
| "I should automatically rewrite these smells in their source files." | Maintainability audits are strictly advisory; direct rewrites risk breaking compilers without a human-in-the-loop design discussion. |

---

## Red Flags
* Flagging advanced OOD design patterns (e.g. Primitive Obsession, Feature Envy) on a simple personal hobby project.
* Generating specific rewritten code blocks instead of just noting structural suggestions and refactoring targets.
* Suggesting changes that break the primary paradigm (e.g., trying to enforce strict class patterns on a functional language codebase).

---

## Verification

After executing the workflow, confirm:
- [ ] Checked `project_goal` configuration to toggle the correct strictness level.
- [ ] Analyzed file layout, nesting depth, and duplicate code blocks.
- [ ] (If Release/Enterprise) Evaluated code against the 6 Fowler Code Smells.
- [ ] Generated observations and contract files in the correct directories under `.repo-wizard/reports/`.
- [ ] Suggestions are high-level and advisory (no code files modified).
