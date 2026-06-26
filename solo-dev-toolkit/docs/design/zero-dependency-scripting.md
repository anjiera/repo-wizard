# Design Guide: Zero-Dependency Node.js CLI Scripting

This document outlines the technical rationale, security benefits, and implementation patterns for the zero-dependency scripting architecture in `repo-wizard`.

---

## 1. Technical Rationale & Objectives

Traditional JavaScript projects often pull in dozens of npm dependencies (e.g. `commander`, `chalk`, `glob`, `markdown-it`, `ajv`) for simple build tasks and validation scripts. In `repo-wizard`, **every helper validator, E2E sandbox, contract schema checker, and markdown compiler is written in plain Node.js with zero external dependencies.**

This approach satisfies three design constraints:

1. **Supply-Chain Security**: Eliminates dependency hijacking, typo-squatting, and vulnerability creep (such as transitive dependencies introducing security alerts).
2. **Instant Developer Onboarding**: A developer can check out the repository and immediately run all static checks and sandboxes without running `npm install`.
3. **High Performance**: Eliminates the overhead of loading large node module sub-trees. The entire validation suite runs in under **50ms**.

---

## 2. Architectural Tradeoffs

| Category | Using npm Packages | Zero-Dependency (Our Approach) |
| :--- | :--- | :--- |
| **Security Auditing** | Requires continuous dependency scanning (e.g., Snyk, Dependabot). | Zero external surface area to scan. Code audits are entirely local. |
| **Execution Speed** | Moderate (~300ms–1s startup due to module loading). | Ultra-fast (<50ms startup and execution). |
| **Maintenance** | High package upgrade overhead (breaking changes, deprecated packages). | Low overhead. The Node.js Core API is highly stable. |
| **Implementation Cost**| Low (install and call API). | Moderate (requires writing lightweight custom parsers). |

---

## 3. Key Implementation Patterns

By leveraging standard, native Node.js core libraries (like `fs`, `path`, `child_process`, and `readline`), `repo-wizard` replicates common library capabilities with simple, readable algorithms.

### A. Zero-Dependency Markdown-to-HTML Compiler (`md-to-html.js`)
Instead of importing a heavy Markdown engine, `solo-dev-toolkit/scripts/md-to-html.js` uses a clean line-by-line state machine parser:
* **Headers**: Checked using regex matches (e.g. `/^(#{1,6})\s+(.*)$/`).
* **Lists & Code Blocks**: Parsed by tracking state flags (e.g., `inList`, `inCodeBlock`).
* **Aesthetics**: Embedded with a premium native dark-mode styling layer directly inside the output header, creating a clean, modern user interface for reports without loading external CSS sheets.

### B. Lightweight Schema Validation (`validate-contracts.js`)
Instead of using schema libraries like `Ajv` or `Joi`, contract validation is written using descriptive JS assertions. This allows the system to output highly contextual error messages tailored specifically to agent contracts (e.g., `task_metadata.language must be a non-empty string`), making debugging intuitive for human developers and LLM debuggers alike.

### C. Isolated Sandboxing (`run-e2e-tests.js`)
To verify workspace transformations securely:
* The runner creates temporary sandboxes inside the project workspace directory (e.g. `temp_e2e_sandbox/`).
* It executes and validates Git changes by spawning native commands via `child_process.execSync` and cleans up filesystem state using `fs.rmdirSync` and `fs.unlinkSync`.
* This isolates testing from the host repository state.
