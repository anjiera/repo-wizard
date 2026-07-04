# Repo Wizard Agent Taxonomy Matrix

This document provides a clean taxonomy mapping of the agent personas, skill folders, slash commands, and reference standards configured in the Repo Wizard multi-agent system, grouped by core engineering **Quality Pillars** and **Cybersecurity Team Color Wheel** roles.

---

## Security & Compliance
Focuses on user data protection, dependency auditing, and regulatory compliance.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Application Security Specialist | `appsec-hardener` | 🟢 Green Team | `appsec-hardener` | `/rw-appsec-hardener` | [appsec-hardening-guide.md](../references/appsec-hardening-guide.md) | Audits security configurations and scaffolds secure HTTP header middlewares, CORS, and rate limits. |
| Dependency Compliance Specialist | `supply-chain-auditor` | 🟢 Green Team | `supply-chain-auditor` | `/rw-supply-chain-auditor` | [supply-chain-audit-checklist.md](../references/supply-chain-audit-checklist.md) | Audits codebase dependencies for vulnerabilities and copyleft licenses. |
| AI/ML Robustness Hardener | `ai-robustness-hardener` | 🟡 Yellow Team | `ai-robustness-hardener` | `/rw-ai-robustness-hardener` | [ai-robustness-checklist.md](../references/ai-robustness-checklist.md) | Audits AI/ML components and LLM integrations, configuring secure input/output guardrails. |
| Data Privacy Specialist | `privacy-hardener` | 🔵 Blue Team | `privacy-hardener` | `/rw-privacy-hardener` | [data-privacy-checklist.md](../references/data-privacy-checklist.md) | Audits data storage schemas and configurations for CCPA/GDPR regulatory privacy compliance. |
| Compliance Auditor Specialist | `compliance-auditor` | ⚪ White Team | `compliance-auditor` | `/rw-compliance-auditor` | [security-hardening-checklist.md](../references/security-hardening-checklist.md) | Audits and scaffolds security and compliance configurations for industry standards (SOC 2, ISO 27001). |
| Legal Neutrality Auditor | `legal-neutrality-auditor` | ⚪ White Team | `legal-neutrality-auditor` | `/rw-legal-neutrality-auditor` | [legal-phrasing-dictionary.md](../references/legal-phrasing-dictionary.md) | Audits user-facing UI copy warning alerts, Terms of Service, and UI descriptions for legal neutrality. |

---

## Performance & Resilience
Focuses on runtime latency, resource consumption, failover mechanisms, and scalability.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Deployment Engineer | `deployment-engineer` | 🟡 Yellow Team | `deployment-engineer` | `/rw-deployment-engineer` | [deployment-patterns.md](../references/deployment-patterns.md) | Audits container files, HA replicas, Kubernetes probes, and backup scripts. |
| Performance Auditor | `performance-auditor` | 🟡 Yellow Team | `performance-auditor` | `/rw-performance-auditor` | [performance-patterns.md](../references/performance-patterns/performance-patterns.md) | Audits codebase performance setups, benchmarking, and CI performance budgets. |
| React Performance Auditor | `react-performance-auditor` | 🟡 Yellow Team | `react-performance-auditor` | `/rw-react-performance-auditor` | [performance-patterns-react.md](../references/performance-patterns/performance-patterns-react.md) | Audits React client-side rendering speed, re-renders, layout shifts, and bfcache. |
| Fault Tolerance Specialist | `resilience-architect` | 🟡 Yellow Team | `resilience-architect` | `/rw-resilience-architect` | [resilience-patterns.md](../references/resilience-patterns.md) | Audits fault-tolerance configurations, retry policies, backoffs, and circuit breakers. |
| Observability Engineer | `observability-engineer` | 🔵 Blue Team | `observability-engineer` | `/rw-observability-engineer` | [observability-patterns.md](../references/observability-patterns.md) | Audits observability configurations, OpenTelemetry integration, and Honeycomb/Grafana dashboards. |

---

## Architecture & Design
Focuses on system boundaries, cross-compilation toolchains, schemas, and structural documentation.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API Contract Architect | `api-contract-architect` | 🟢 Green Team | `api-contract-architect` | `/rw-api-contract-architect` | [api-contract-standards.md](../references/coding-standards/api-contract-standards.md) | Audits API boundaries, designs schemas, and integrates Buf/Spectral Linters. |
| Technical Documentation | `technical-scribe` | 🔵 Blue Team | `technical-scribe` | `/rw-technical-scribe` | [documentation-standards.md](../references/coding-standards/documentation-standards.md) | Audits and scaffolds ADR documentation systems and generates C4/architecture flowcharts. |
| Developer Onboarding Auditor | `dev-onboarding-auditor` | 🔵 Blue Team | `dev-onboarding-auditor` | `/rw-dev-onboarding-auditor` | *None* | Audits repository setup files, README installation steps, environment examples, and contributor onboarding templates for alignment and consistency patterns. |
| Toolchain Architect | `toolchain-architect` | 🟡 Yellow Team | `toolchain-architect` | `/rw-toolchain-architect` | [toolchain-standards.md](../references/coding-standards/toolchain-standards.md) | Audits build target constraints and cross-compilation toolchain parameters. |
| Data Pipeline Architect | `data-pipeline-architect` | 🟡 Yellow Team | `data-pipeline-architect` | `/rw-data-pipeline-architect` | [data-pipeline-standards.md](../references/coding-standards/data-pipeline-standards.md) | Audits data workflows, schemas, retries, and database connection pool configurations. |
| State Integrity Auditor | `state-integrity-auditor` | ⚪ White Team | `state-integrity-auditor` | `/rw-state-integrity-auditor` | [formal-methods-patterns.md](../references/formal-methods-patterns.md) | Audits codebase state machines, specifications (TLA+), and proof verification harnesses. |
| Maintainability Auditor | `maintainability-auditor` | 🟢 Green Team | `maintainability-auditor` | `/rw-maintainability-auditor` | *None* | Audits codebase structure, DRY compliance, and identifies Fowler code smells tailored to development profiles. |
| Database Lifecycle Auditor | `database-lifecycle-auditor` | 🟡 Yellow Team | `database-lifecycle-auditor` | `/rw-database-lifecycle-auditor` | [database-lifecycle](../references/database-lifecycle/) | Audits database migrations, schemas, and queries for complexity and performance patterns based on inferred stacks. |

---

## Code Quality & Testing
Focuses on syntax hygiene, test coverage, static analysis, state validation, and accessibility.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VCS Integration Specialist | `vcs-workflow-engineer` | 🟢 Green Team | `vcs-workflow-engineer` | `/rw-vcs-workflow-engineer` | [vcs-discipline-rules.md](../references/vcs-discipline-rules.md) | Audits and configures pre-commit hooks, Conventional Commit validations, and copyright headers. |
| State Hardener | `state-hardener` | 🟢 Green Team | `state-hardener` | `/rw-state-hardener` | [state-sanitization-rules.md](../references/state-sanitization-rules.md) | Audits React codebase hooks and states for stale closures, memory leaks, and async fetch race conditions. |
| Notebook Auditor | `notebook-auditor` | 🟢 Green Team | `notebook-auditor` | `/rw-notebook-auditor` | [notebook-standards.md](../references/coding-standards/notebook-standards.md) | Audits data science repositories and configures nbstripout pre-commit filters. |
| Testing QA Specialist | `qa-engineer` | 🟡 Yellow Team | `qa-engineer` | `/rw-qa-engineer` | [testing-patterns.md](../references/testing-patterns.md) | Audits and configures unit, integration, and E2E test runners and code coverage gates. |
| Embedded Systems Auditor | `embedded-systems-auditor` | 🟡 Yellow Team | `embedded-systems-auditor` | `/rw-embedded-systems-auditor` | [embedded-standards.md](../references/coding-standards/embedded-standards.md), [functional-safety-checklist.md](../references/functional-safety-checklist.md) | Audits low-level firmware robustness, static analysis (MISRA), and compiler warning flags. |
| Digital Accessibility Specialist | `accessibility-auditor` | ⚪ White Team | `accessibility-auditor` | `/rw-accessibility-auditor` | [accessibility-checklist.md](../references/accessibility-checklist.md) | Audits codebase files and configurations for compliance with digital accessibility standards (WCAG). |
| AI Agent Alignment Specialist | `agent-alignment-auditor` | ⚪ White Team | `agent-alignment-auditor` | `/rw-agent-alignment-auditor` | *None* | Audits agent prompts, configurations, and workflows for consistency, style, formatting, and token limits. |
| Fuzz Engineer | `fuzz-engineer` | 🔵 Blue Team | `fuzz-engineer` | `/rw-fuzz-engineer` | [fuzzing-patterns.md](../references/fuzzing-patterns.md) | Audits parsing blocks to identify crash-prone sections and scaffolds fuzz-testing harnesses. |

---

## System Orchestrators & Helpers
Internal utility and coordinator agents.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Lead Onboarding Orchestrator | `repo-wizard` | ⚪ White Team | `repo-wizard`, `remote-profiler` | `/repo-wizard` | *None* | Orchestrates the repository onboarding checklist, dynamic QA setups, and multi-agent scanning loops. |
| Tool Auditor Specialist | `tool-auditor` | ⚪ White Team | `tool-auditor` | *None* | *None* | Audits recommended packages and libraries against security databases and licensing rules. |
| Tooling Engineer Specialist | `tooling-engineer` | ⚪ White Team | `tooling-engineer` | *None* | *None* | Safely installs tools and edits config files using AST-based modifications. |
