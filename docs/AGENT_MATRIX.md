# Repo Wizard Agent Taxonomy Matrix

This document provides a clean taxonomy mapping of the agent personas, skill folders, slash commands, and reference standards configured in the Repo Wizard multi-agent system, grouped by core engineering **Quality Pillars** and **Cybersecurity Team Color Wheel** roles.

---

## Security & Compliance
Focuses on user data protection, dependency auditing, and regulatory compliance.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `appsec-hardener-agent` | 🟢 Green Team | `appsec-hardener` | `/rw-appsec-hardener` | [appsec-hardening-guide.md](../references/appsec-hardening-guide.md) |
| `supply-chain-auditor-agent` | 🟢 Green Team | `supply-chain-auditor` | `/rw-supply-chain-auditor` | [supply-chain-audit-checklist.md](../references/supply-chain-audit-checklist.md) |
| `ai-robustness-hardener-agent` | 🟡 Yellow Team | `ai-robustness-hardener` | `/rw-ai-robustness-hardener` | [ai-robustness-checklist.md](../references/ai-robustness-checklist.md) |
| `privacy-hardener-agent` | 🔵 Blue Team | `privacy-hardener` | `/rw-privacy-hardener` | [data-privacy-checklist.md](../references/data-privacy-checklist.md) |
| `compliance-auditor-agent` | ⚪ White Team | `compliance-auditor` | `/rw-compliance-auditor` | [security-hardening-checklist.md](../references/security-hardening-checklist.md) |
| `legal-neutrality-auditor-agent` | ⚪ White Team | `legal-neutrality-auditor` | `/rw-legal-neutrality-auditor` | [legal-phrasing-dictionary.md](../references/legal-phrasing-dictionary.md) |

---

## Performance & Resilience
Focuses on runtime latency, resource consumption, failover mechanisms, and scalability.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `deployment-engineer-agent` | 🟡 Yellow Team | `deployment-engineer` | `/rw-deployment-engineer` | [deployment-patterns.md](../references/deployment-patterns.md) |
| `performance-auditor-agent` | 🟡 Yellow Team | `performance-auditor` | `/rw-performance-auditor` | [performance-patterns.md](../references/performance-patterns/performance-patterns.md) |
| `react-performance-auditor-agent` | 🟡 Yellow Team | `react-performance-auditor` | `/rw-react-performance-auditor` | [performance-patterns-react.md](../references/performance-patterns/performance-patterns-react.md) |
| `resilience-architect-agent` | 🟡 Yellow Team | `resilience-architect` | `/rw-resilience-architect` | [resilience-patterns.md](../references/resilience-patterns.md) |
| `observability-engineer-agent` | 🔵 Blue Team | `observability-engineer` | `/rw-observability-engineer` | [observability-patterns.md](../references/observability-patterns.md) |

---

## Architecture & Design
Focuses on system boundaries, cross-compilation toolchains, schemas, and structural documentation.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `api-contract-architect-agent` | 🟢 Green Team | `api-contract-architect` | `/rw-api-contract-architect` | [api-contract-standards.md](../references/coding-standards/api-contract-standards.md) |
| `technical-scribe-agent` | 🟡 Yellow Team | `technical-scribe` | `/rw-technical-scribe` | [documentation-standards.md](../references/coding-standards/documentation-standards.md) |
| `toolchain-architect-agent` | 🟡 Yellow Team | `toolchain-architect` | `/rw-toolchain-architect` | [toolchain-standards.md](../references/coding-standards/toolchain-standards.md) |
| `data-pipeline-architect-agent` | 🟡 Yellow Team | `data-pipeline-architect` | `/rw-data-pipeline-architect` | [data-pipeline-standards.md](../references/coding-standards/data-pipeline-standards.md) |
| `state-integrity-auditor-agent` | ⚪ White Team | `state-integrity-auditor` | `/rw-state-integrity-auditor` | [formal-methods-patterns.md](../references/formal-methods-patterns.md) |

---

## Code Quality & Testing
Focuses on syntax hygiene, test coverage, static analysis, state validation, and accessibility.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `vcs-workflow-engineer-agent` | 🟢 Green Team | `vcs-workflow-engineer` | `/rw-vcs-workflow-engineer` | [vcs-discipline-rules.md](../references/vcs-discipline-rules.md) |
| `state-hardener-agent` | 🟢 Green Team | `state-hardener` | `/rw-state-hardener` | [state-sanitization-rules.md](../references/state-sanitization-rules.md) |
| `notebook-auditor-agent` | 🟢 Green Team | `notebook-auditor` | `/rw-notebook-auditor` | [notebook-standards.md](../references/coding-standards/notebook-standards.md) |
| `qa-engineer-agent` | 🟡 Yellow Team | `qa-engineer` | `/rw-qa-engineer` | [testing-patterns.md](../references/testing-patterns.md) |
| `embedded-systems-auditor-agent` | 🟡 Yellow Team | `embedded-systems-auditor` | `/rw-embedded-systems-auditor` | [embedded-standards.md](../references/coding-standards/embedded-standards.md), [functional-safety-checklist.md](../references/functional-safety-checklist.md) |
| `accessibility-auditor-agent` | ⚪ White Team | `accessibility-auditor` | `/rw-accessibility-auditor` | [accessibility-checklist.md](../references/accessibility-checklist.md) |
| `agent-alignment-auditor-agent` | ⚪ White Team | `agent-alignment-auditor` | `/rw-agent-alignment-auditor` | *None* |
| `fuzz-engineer-agent` | 🔵 Blue Team | `fuzz-engineer` | `/rw-fuzz-engineer` | [fuzzing-patterns.md](../references/fuzzing-patterns.md) |

---

## System Orchestrators & Helpers
Internal utility and coordinator agents.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `repo-wizard-agent` | ⚪ White Team | `repo-wizard`, `remote-profiler` | `/repo-wizard` | *None* |
| `tool-auditor-agent` | ⚪ White Team | `tool-auditor` | *None* | *None* |
| `tooling-engineer-agent` | ⚪ White Team | `tooling-engineer` | *None* | *None* |
