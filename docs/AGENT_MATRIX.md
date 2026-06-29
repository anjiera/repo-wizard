# Repo Wizard Agent Taxonomy Matrix

This document provides a clean taxonomy mapping of the agent personas, skill folders, slash commands, and reference standards configured in the Repo Wizard multi-agent system, grouped by core engineering **Quality Pillars** and **Cybersecurity Team Color Wheel** roles.

---

## Security & Compliance
Focuses on user data protection, dependency auditing, and regulatory compliance.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `appsec-hardener-agent` | 🟢 Green Team | `appsec-hardener` | `/rw-appsec` | [appsec-hardening-guide.md](../references/appsec-hardening-guide.md) |
| `supply-chain-scanner-agent` | 🟢 Green Team | `supply-chain-scanner` | `/rw-supply-chain-scanner` | [supply-chain-audit-checklist.md](../references/supply-chain-audit-checklist.md) |
| `ai-robustness-pilot-agent` | 🟡 Yellow Team | `ai-robustness-pilot` | `/rw-ai-robustness` | [ai-robustness-checklist.md](../references/ai-robustness-checklist.md) |
| `privacy-guardian-agent` | 🔵 Blue Team | `privacy-guardian` | `/rw-privacy-guardian` | [data-privacy-checklist.md](../references/data-privacy-checklist.md) |
| `compliance-pilot-agent` | ⚪ White Team | `compliance-pilot` | `/rw-compliance-pilot` | [security-hardening-checklist.md](../references/security-hardening-checklist.md) |
| `legal-neutrality-agent` | ⚪ White Team | `legal-neutrality-scanner` | `/rw-legal-neutrality` | [legal-phrasing-dictionary.md](../references/legal-phrasing-dictionary.md) |

---

## Performance & Resilience
Focuses on runtime latency, resource consumption, failover mechanisms, and scalability.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `deployment-pilot-agent` | 🟡 Yellow Team | `deployment-pilot` | `/rw-deployment` | [deployment-patterns.md](../references/deployment-patterns.md) |
| `performance-pilot-agent` | 🟡 Yellow Team | `performance-pilot` | `/rw-performance` | [performance-patterns.md](../references/performance-patterns/performance-patterns.md) |
| `react-performance-pilot-agent` | 🟡 Yellow Team | `react-performance-pilot` | `/rw-react-performance` | [performance-patterns-react.md](../references/performance-patterns/performance-patterns-react.md) |
| `resilience-pilot-agent` | 🟡 Yellow Team | `resilience-pilot` | `/rw-resilience` | [resilience-patterns.md](../references/resilience-patterns.md) |
| `observability-pilot-agent` | 🔵 Blue Team | `observability-pilot` | `/rw-observability` | [observability-patterns.md](../references/observability-patterns.md) |

---

## Architecture & Design
Focuses on system boundaries, cross-compilation toolchains, schemas, and structural documentation.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `api-contract-pilot-agent` | 🟢 Green Team | `api-contract-pilot` | `/rw-api-contract` | [api-contract-standards.md](../references/coding-standards/api-contract-standards.md) |
| `technical-scribe-agent` | 🟡 Yellow Team | `technical-scribe` | `/rw-technical-scribe` | [documentation-standards.md](../references/coding-standards/documentation-standards.md) |
| `toolchain-pilot-agent` | 🟡 Yellow Team | `toolchain-pilot` | `/rw-toolchain` | [toolchain-standards.md](../references/coding-standards/toolchain-standards.md) |
| `data-pipeline-pilot-agent` | 🟡 Yellow Team | `data-pipeline-pilot` | `/rw-data-pipeline` | [data-pipeline-standards.md](../references/coding-standards/data-pipeline-standards.md) |
| `formal-methods-pilot-agent` | ⚪ White Team | `formal-methods-pilot` | `/rw-formal-methods` | [formal-methods-patterns.md](../references/formal-methods-patterns.md) |

---

## Code Quality & Testing
Focuses on syntax hygiene, test coverage, static analysis, state validation, and accessibility.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `vcs-workflow-agent` | 🟢 Green Team | `vcs-workflow` | `/rw-vcs-workflow` | [vcs-discipline-rules.md](../references/vcs-discipline-rules.md) |
| `state-sanitizer-agent` | 🟢 Green Team | `state-sanitizer` | `/rw-state-sanitizer` | [state-sanitization-rules.md](../references/state-sanitization-rules.md) |
| `notebook-sanitizer-agent` | 🟢 Green Team | `notebook-sanitizer` | `/rw-notebook-sanitizer` | [notebook-standards.md](../references/coding-standards/notebook-standards.md) |
| `testing-pilot-agent` | 🟡 Yellow Team | `testing-pilot` | `/rw-testing-pilot` | [testing-patterns.md](../references/testing-patterns.md) |
| `embedded-systems-pilot-agent` | 🟡 Yellow Team | `embedded-systems-pilot` | `/rw-embedded-systems` | [embedded-standards.md](../references/coding-standards/embedded-standards.md), [functional-safety-checklist.md](../references/functional-safety-checklist.md) |
| `accessibility-auditor-agent` | ⚪ White Team | `accessibility-auditor` | `/rw-accessibility-auditor` | [accessibility-checklist.md](../references/accessibility-checklist.md) |
| `agent-alignment-pilot-agent` | ⚪ White Team | `agent-alignment-pilot` | `/rw-agent-align` | *None* |
| `fuzzing-pilot-agent` | 🔵 Blue Team | `fuzzing-pilot` | `/rw-fuzzing` | [fuzzing-patterns.md](../references/fuzzing-patterns.md) |

---

## System Orchestrators & Helpers
Internal utility and coordinator agents.

| Agent Persona | Team Color | Skill Folder | Command Name | Reference File |
| :--- | :--- | :--- | :--- | :--- |
| `repo-wizard-agent` | ⚪ White Team | `repo-wizard`, `remote-profiler` | `/repo-wizard` | *None* |
| `tool-evaluator-agent` | ⚪ White Team | `tool-evaluator` | *None* | *None* |
| `tool-scaffolder-agent` | ⚪ White Team | `tool-scaffolder` | *None* | *None* |
