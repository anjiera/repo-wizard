# Repo Wizard Agent Taxonomy Matrix

This document provides a clean taxonomy mapping of the agent personas, skill folders, slash commands, and reference standards configured in the Repo Wizard multi-agent system, grouped by core engineering **Quality Pillars** and **Cybersecurity Team Color Wheel** roles.

---

## Security & Compliance
Focuses on user data protection, dependency auditing, and regulatory compliance.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Application Security Specialist | `appsec-hardener` | 🟢 Green Team | `appsec-hardener` | `/rw-appsec-hardener` | [appsec-hardening-guide.md](../references/appsec-hardening-guide.md) | Suggests secure headers, strict CORS rules, and rate limits to harden your app. |
| Dependency Compliance Specialist | `supply-chain-auditor` | 🟢 Green Team | `supply-chain-auditor` | `/rw-supply-chain-auditor` | [supply-chain-audit-checklist.md](../references/supply-chain-audit-checklist.md) | Scans your dependencies for known vulnerabilities and open-source licenses. |
| AI/ML Robustness Hardener | `ai-robustness-hardener` | 🟡 Yellow Team | `ai-robustness-hardener` | `/rw-ai-robustness-hardener` | [ai-robustness-checklist.md](../references/ai-robustness-checklist.md) | Highlights ways to harden your AI models against prompt injections and bad inputs. |
| Data Privacy Specialist | `privacy-hardener` | 🔵 Blue Team | `privacy-hardener` | `/rw-privacy-hardener` | [data-privacy-checklist.md](../references/data-privacy-checklist.md) | Suggests data storage improvements to help align with GDPR and CCPA guidelines. |
| Compliance Auditor Specialist | `compliance-auditor` | ⚪ White Team | `compliance-auditor` | `/rw-compliance-auditor` | [security-hardening-checklist.md](../references/security-hardening-checklist.md) | Suggests improvements in line with compliance standards. |
| Legal Neutrality Auditor | `legal-neutrality-auditor` | ⚪ White Team | `legal-neutrality-auditor` | `/rw-legal-neutrality-auditor` | [legal-phrasing-dictionary.md](../references/legal-phrasing-dictionary.md) | Identifies areas to improve legal neutrality in the UI. |

---

## Performance & Resilience
Focuses on runtime latency, resource consumption, failover mechanisms, and scalability.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Deployment Engineer | `deployment-engineer` | 🟡 Yellow Team | `deployment-engineer` | `/rw-deployment-engineer` | [deployment-patterns.md](../references/deployment-patterns.md) | Suggests ways to improve Docker containers, k8s probes, and automated backup scripts. |
| Performance Auditor | `performance-auditor` | 🟡 Yellow Team | `performance-auditor` | `/rw-performance-auditor` | [performance-patterns.md](../references/performance-patterns/performance-patterns.md) | Finds slow bottlenecks in your code and suggests speed tests for CI. |
| React Performance Auditor | `react-performance-auditor` | 🟡 Yellow Team | `react-performance-auditor` | `/rw-react-performance-auditor` | [performance-patterns-react.md](../references/performance-patterns/performance-patterns-react.md) | Identifies annoying layout shifts and React components that over-render. |
| Fault Tolerance Specialist | `resilience-architect` | 🟡 Yellow Team | `resilience-architect` | `/rw-resilience-architect` | [resilience-patterns.md](../references/resilience-patterns.md) | Suggests retries and circuit breakers to help apps survive bad network calls. |
| Observability Engineer | `observability-engineer` | 🔵 Blue Team | `observability-engineer` | `/rw-observability-engineer` | [observability-patterns.md](../references/observability-patterns.md) | Identifies opportunities to add logs and dashboards to monitor your systems. |

---

## Architecture & Design
Focuses on system boundaries, cross-compilation toolchains, schemas, and structural documentation.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API Contract Architect | `api-contract-architect` | 🟢 Green Team | `api-contract-architect` | `/rw-api-contract-architect` | [api-contract-standards.md](../references/coding-standards/api-contract-standards.md) | Helps design crisp APIs and enforce schema rules to improve integration stability. |
| Technical Documentation | `technical-scribe` | 🔵 Blue Team | `technical-scribe` | `/rw-technical-scribe` | [documentation-standards.md](../references/coding-standards/documentation-standards.md) | Helps generate architecture flowcharts and clean design documents. |
| Developer Onboarding Auditor | `dev-onboarding-auditor` | 🔵 Blue Team | `dev-onboarding-auditor` | `/rw-dev-onboarding-auditor` | *None* | Helps improve the new dev experience by auditing your README and setup scripts. |
| Toolchain Architect | `toolchain-architect` | 🟡 Yellow Team | `toolchain-architect` | `/rw-toolchain-architect` | [toolchain-standards.md](../references/coding-standards/toolchain-standards.md) | Helps wrangle C/Rust build targets and cross-compilation settings. |
| Data Pipeline Architect | `data-pipeline-architect` | 🟡 Yellow Team | `data-pipeline-architect` | `/rw-data-pipeline-architect` | [data-pipeline-standards.md](../references/coding-standards/data-pipeline-standards.md) | Identifies ways to untangle data pipelines and optimize database connection pools. |
| State Integrity Auditor | `state-integrity-auditor` | ⚪ White Team | `state-integrity-auditor` | `/rw-state-integrity-auditor` | [formal-methods-patterns.md](../references/formal-methods-patterns.md) | Suggests ways to use math to verify your complex state machines. |
| Maintainability Auditor | `maintainability-auditor` | 🟢 Green Team | `maintainability-auditor` | `/rw-maintainability-auditor` | *None* | Sniffs out code smells and suggests refactors to improve readability. |
| Database Lifecycle Auditor | `database-lifecycle-auditor` | 🟡 Yellow Team | `database-lifecycle-auditor` | `/rw-database-lifecycle-auditor` | [database-lifecycle](../references/database-lifecycle/) | Spots slow queries and risky database migrations for you to review. |

---

## Code Quality & Testing
Focuses on syntax hygiene, test coverage, static analysis, state validation, and accessibility.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VCS Integration Specialist | `vcs-workflow-engineer` | 🟢 Green Team | `vcs-workflow-engineer` | `/rw-vcs-workflow-engineer` | [vcs-discipline-rules.md](../references/vcs-discipline-rules.md) | Suggests pre-commit hooks and git commit formatting rules. |
| State Hardener | `state-hardener` | 🟢 Green Team | `state-hardener` | `/rw-state-hardener` | [state-sanitization-rules.md](../references/state-sanitization-rules.md) | Spots potential memory leaks and stale closures in tricky async React hooks. |
| Notebook Auditor | `notebook-auditor` | 🟢 Green Team | `notebook-auditor` | `/rw-notebook-auditor` | [notebook-standards.md](../references/coding-standards/notebook-standards.md) | Suggests filters for Jupyter notebook outputs to make git diffs easier to read. |
| Testing QA Specialist | `qa-engineer` | 🟡 Yellow Team | `qa-engineer` | `/rw-qa-engineer` | [testing-patterns.md](../references/testing-patterns.md) | Suggests tests and mocking strategies to help catch bugs earlier. |
| Embedded Systems Auditor | `embedded-systems-auditor` | 🟡 Yellow Team | `embedded-systems-auditor` | `/rw-embedded-systems-auditor` | [embedded-standards.md](../references/coding-standards/embedded-standards.md), [functional-safety-checklist.md](../references/functional-safety-checklist.md) | Highlights ways to improve low-level firmware stability and MISRA compliance. |
| Digital Accessibility Specialist | `accessibility-auditor` | ⚪ White Team | `accessibility-auditor` | `/rw-accessibility-auditor` | [accessibility-checklist.md](../references/accessibility-checklist.md) | Identifies UI accessibility issues to help make your app more inclusive. |
| AI Agent Alignment Specialist | `agent-alignment-auditor` | ⚪ White Team | `agent-alignment-auditor` | `/rw-agent-alignment-auditor` | *None* | Suggests tweaks to AI agent prompts to help save tokens and keep them on-script. |
| Fuzz Engineer | `fuzz-engineer` | 🔵 Blue Team | `fuzz-engineer` | `/rw-fuzz-engineer` | [fuzzing-patterns.md](../references/fuzzing-patterns.md) | Uses randomness to expose sneaky crash bugs in your parsers. |

---

## System Orchestrators & Helpers
Internal utility and coordinator agents.

| Role / Title | Agent Persona | Team Color | Skill Folder | Command Name | Reference File | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Lead Onboarding Orchestrator | `repo-wizard` | ⚪ White Team | `repo-wizard`, `headless-profiler` | `/repo-wizard` | *None* | Your lead agent. Scans your repo, guides the setup checklist, and manages the swarm. |
| Tool Auditor Specialist | `tool-auditor` | ⚪ White Team | `tool-auditor` | *None* | *None* | Checks if the npm packages you want to use are actively maintained. |
| Tooling Engineer Specialist | `tooling-engineer` | ⚪ White Team | `tooling-engineer` | *None* | *None* | Suggests tools and configuration patches to improve your workflow. |
