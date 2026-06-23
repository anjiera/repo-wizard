# Getting Started with Repo Wizard

Welcome to **Repo Wizard** (`repo-wizard`)! 

This repository contains specialized, production-grade agent workflows, personas, and custom slash commands designed to help solo developers and small teams configure their repositories with enterprise-level engineering standards, liability protection, and QA guardrails.

---

## What is a Skill?

Each skill is a structured markdown file (`SKILL.md`) located in the `skills/` directory. Rather than being simple reference documentation, skills define step-by-step processes for AI coding agents (such as Google Antigravity, Claude Code, or GitHub Copilot) to follow. 

Every skill includes:
* **Overview & Trigger Conditions**: Dictates *what* the skill is and *when* the agent should dynamically activate it.
* **Process Steps**: Practical, tool-agnostic stages to complete the task.
* **Common Rationalizations**: Rebuttals to combat common excuses AI agents make to skip steps (e.g. "I'll do verification later").
* **Red Flags**: Symptoms indicating that the workflow is being violated.
* **Verification Checklist**: Exit criteria that require hard evidence (tests, outputs, screenshots) before marking the task complete.

---

## Active Skills & Personas

Currently, the suite includes:

### 1. Legal Neutrality Scanner
* **Skill**: [skills/legal-neutrality-scanner/SKILL.md](../skills/legal-neutrality-scanner/SKILL.md)
* **Auditor Persona**: [agents/legal-neutrality-agent.md](../agents/legal-neutrality-agent.md)
* **Goal**: Scans user-facing UI labels, notifications, errors, and terminal scripts for high-liability phrases (e.g. verging on medical/health/financial advice) and suggests legally neutral, comfort-based alternatives without editing source files directly.
* **Reference Guide**: [references/legal-phrasing-dictionary.md](../references/legal-phrasing-dictionary.md)

### 2. Remote & Local Headless Profiler
* **Skill**: [skills/remote-profiler/SKILL.md](../skills/remote-profiler/SKILL.md)
* **Orchestrator Persona**: [agents/repo-wizard-agent.md](../agents/repo-wizard-agent.md)
* **Goal**: Scans remote public GitHub repositories (via URL parameter) or local active workspaces (via `headless` or `--headless` options) in a non-blocking mode. Conducts decoupled subagent relevance check sweeps, supports mini-report resumability, and compiles observations, full technical, and executive summaries with strict honest-boundaries (Approach B) and roadmap upgrade hooks.


---
## Cybersecurity Domain Coverage

To protect your repository across all compliance and security vectors, our specialized agents map directly to the industry-standard **Cybersecurity Color Wheel** roles:

### Green Team (Defensive Coding & Building)
Focuses on writing secure code, configuring correct dependency frameworks, and setting up static linters to prevent vulnerabilities from being compiled.
* **API Hardening (`/rw-appsec`):** Scaffolds CORS origin policies, Helmet secure header middlewares, and rate-limiting rules.
* **Supply Chain Scanner (`/rw-supply-chain`):** Audits active dependency vulnerabilities and blocks viral copyleft package licenses.
* **VCS Automation (`/rw-vcs-workflow`):** Scaffolds commit lint validation hooks and copyright header scanners.
* **API Contract Validation (`/rw-api-contract`):** Scaffolds OpenAPI specs, gRPC Protobuf definitions, GraphQL schemas, and linter checks.
* **Notebook Git Hygiene (`/rw-notebook-sanitizer`):** Scaffolds Jupyter Notebook git filters, nbqa linters, and python virtual environments.

### Blue Team (Active Defense & System Visibility)
Focuses on auditing system events, configuring tracing telemetry, and tuning alerts to catch failures instantly.
* **Observability Pilot (`/rw-observability`):** Scaffolds OpenTelemetry instrumentation SDKs, Grafana dashboards, and Alertmanager metrics.
* **Privacy Guardian (`/rw-privacy`):** Sanitizes exported logs and trace contexts to scrub PII data.
* **Fuzzing Pilot (`/rw-fuzzing`):** Scaffolds coverage-guided fuzz targets (libFuzzer, cargo-fuzz, Atheris) and sanitizers to find crash defects on untrusted parser entry points.

### White Team (Governance & Audit Compliance)
Focuses on establishing code quality rules, mapping regulatory controls, and verifying repository hygiene.
* **Repo Wizard (`/repo-wizard`):** The interactive orchestrator that scopes your project, screens tools, and coordinates handoffs.
* **Compliance Pilot (`/rw-compliance`):** Verifies technical compliance configurations (SOC 2, ISO 27001, FIPS lists).
* **Accessibility Auditor (`/rw-accessibility`):** Configures accessibility linters (ESLint JSX-a11y) and headless axe-core scanners.
* **Formal Methods Pilot (`/rw-formal-methods`):** Scaffolds mathematical proof verifications (TLA+ specs, Rust Kani harnesses) to prove execution invariants.

### Yellow Team (System Builders & Deployment)
Focuses on configuring build automation, deployment replication, container scaling, and recovery systems.
* **Deployment Pilot (`/rw-deployment`):** Scaffolds Docker Compose replicas, Kubernetes health probes, and database backups.
* **Data Pipeline Pilot (`/rw-data-pipeline`):** Scaffolds database connection pooling, schema validations, and workflow orchestrators.
* **Embedded Systems Pilot (`/rw-embedded-systems`):** Scaffolds static analysis rulesets (MISRA via cppcheck), compiler warning/stack limits, QEMU target testing, and local circular ring buffer loggers.
* **Toolchain Pilot (`/rw-toolchain`):** Scaffolds cross-compilation configurations (CMake files, cargo targets, link scripts) and sysroots.

---

## Developer & Validation Utilities

To automatically bootstrap your local development environment, check system prerequisites, configure Git hooks, and verify code integrity, run the setup script:

```bash
# On Unix / macOS / Git Bash
./setup.sh

# On Windows (PowerShell)
.\setup.ps1
```

Once set up, developers can run individual validation and utility scripts:

* **Static Validation Linters**: Validate command parity, agent files syntax, and skill formats:
  - `node scripts/validate-agents.js` (validates agents Markdown layout)
  - `node scripts/validate-commands.js` (validates command synchronization)
  - `node scripts/validate-skills.js` (validates skill folder properties)
* **Markdown-to-HTML Documentation Compiler**:
  - The zero-dependency helper utility [md-to-html.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/md-to-html.js) compiles standard Markdown documentation files into responsive HTML pages with native dark-mode stylesheet support:
    ```bash
    node scripts/md-to-html.js docs/TESTING.md docs/TESTING.html
    ```
    *(Note: Locally generated `.html` files in the `docs/` directory are excluded from Git via [.gitignore](file:///d:/DevSandbox/agy-projects/repo-wizard/.gitignore) to prevent duplicate source code conflicts).*

---

## Quick Start: Loading Skills


Since the repository is built on standard markdown files, you can use these skills in any agent environment:

1. **System Prompts**: Paste the contents of `agents/legal-neutrality-agent.md` directly into your ChatGPT, Claude, or Copilot chat.
2. **Rules Files**: Copy the skill and persona contents into your project's rules file (e.g., `.cursorrules`, `CLAUDE.md`, or `.agents/AGENTS.md`) for persistent execution.
3. **Dedicated Tool Integrations**: Read the setup guides below for native slash command and plugin setups:
   - [Google Antigravity Setup](antigravity-setup.md)
   - [Claude Code Setup](claude-setup.md)
   - [GitHub Copilot Setup](copilot-setup.md)
