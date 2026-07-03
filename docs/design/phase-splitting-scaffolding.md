# Technical Design: Phase-Splitting and Persisted Scaffolding Contracts

This document specifies the architecture and design goals behind dividing the repository scanning process into passive analysis and active onboarding phases, using versioned JSON contracts to communicate recommendations.

---

## 1. Design Goals & Rationale

To align with modern Digital Governance and Platform Security practices, we establish a strict separation between **Analysis (Phase B)** and **Execution (Phase C)**:

1.  **Passive Analysis (Phase B):** 
    *   Specialist agents (e.g., `qa-engineer`, `appsec-hardener`) act purely as read-only code auditors. 
    *   They parse configurations statically and are strictly prohibited from running compilers, package managers, or test runners. 
    *   This mitigates prompt injection risks and reduces execution risk to the runner environment from unexpected code execution.
2.  **Active Execution (Phase C):** 
    *   All package installation, configuration file modifications, and build verification runs are centralized within a single installer agent (`tooling-engineer`).
    *   This reduces code duplication and helps verify that file-writing actions pass through explicit developer approval gates.

---

## 2. Persisted Scaffolding Contracts

To decouple the two phases and allow developers to scan codebases now and perform installations later without re-running expensive LLM calls, specialists write their recommendations to a structured, machine-readable JSON contract file on disk.

### File Location
Contracts are stored in the workspace reports directory:
`.repo-wizard/reports/<repoName>/contracts/<agentName>-contract.json`

### JSON Schema Specification
Every contract must follow the `"1.0.0"` format schema:

```json
{
  "contract_version": "1.0.0",
  "packages": [
    {
      "name": "vitest",
      "version": "^1.0.0",
      "scope": "devDependencies"
    }
  ],
  "configs": [
    {
      "path": "vitest.config.ts",
      "content": "import { defineConfig } from 'vitest/config'\nexport default defineConfig({})"
    }
  ],
  "verification_command": "npx vitest run"
}
```

---

## 3. Contract Versioning Strategy

To mitigate conflicts when upgrading the `repo-wizard` tool, all session manifests and scaffolding contracts carry a `contract_version` field. 

If the `tooling-engineer` detects a version mismatch between the saved JSON contract and its active execution schema, it will halt execution, notify the developer of the format incompatibility, and request a fresh scan to update the contracts.

---

## 4. Real-Time VCS-Driven Rollbacks

To mitigate the risk of data loss and mitigate the risk of overwriting subsequent edits made by the developer between the scan and the installation:

1.  **State Capture:** Immediately before applying any file modifications, the `tooling-engineer` captures the current active workspace state using version control tools (e.g., `git status` or `git diff`).
2.  **Verification Gate:** It runs the `verification_command` specified in the contract to check if the new configuration compiles successfully.
3.  **VCS Rollback:** If verification fails or is declined by the developer, it uses the captured baseline to revert only the dirty files modified during that installation session, preserving all other independent workspace changes.
