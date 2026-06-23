# Repo Wizard References Catalog

This directory contains high-density checklist, standard, and pattern files used by specialist agents to audit repositories and scaffold configurations.

---

## 1. Domain Grouping: Cybersecurity Color Wheel Roles

Specialist guidelines and checklists map directly to the industry-standard **Cybersecurity Color Wheel** roles to ensure complete coverage of defensive coding, system monitoring, audit compliance, and deployment automation.

### 🟢 Green Team (Defensive Coding & Build Hygiene)
Focuses on writing secure code, configuring correct dependencies, and setting up static linters to prevent vulnerabilities before deployment.
* **API Hardening:** [appsec-hardening-guide.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/appsec-hardening-guide.md)
* **API Contract Validation:** [api-contract-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/api-contract-standards.md)
* **Notebook Git Hygiene:** [notebook-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/notebook-standards.md)
* **Supply Chain Audits:** [supply-chain-audit-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/supply-chain-audit-checklist.md)
* **VCS Automation & Hook Discipline:** [vcs-discipline-rules.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/vcs-discipline-rules.md)

### 🔵 Blue Team (Active Defense & System Visibility)
Focuses on auditing runtime events, configuring system tracing, and setting up security boundaries to handle data safely.
* **Fuzzing & Parser Audits:** [fuzzing-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/fuzzing-patterns.md)
* **Observability & Tracing:** [observability-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/observability-patterns.md)
* **PII Log Sanitization & Privacy:** [data-privacy-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/data-privacy-checklist.md)

### ⚪ White Team (Governance & Audit Compliance)
Focuses on compliance profiles, accessibility standards, legal liability checks, and formal execution verification.
* **Digital Accessibility (WCAG):** [accessibility-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/accessibility-checklist.md)
* **Formal Methods & Proof Verification:** [formal-methods-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/formal-methods-patterns.md)
* **Legal Phrasing & UI Neutrality:** [legal-phrasing-dictionary.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/legal-phrasing-dictionary.md)
* **Regulatory Compliance Frameworks:** [security-hardening-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/security-hardening-checklist.md)
* **Scaffolding Robustness Protocol:** [scaffolding-robustness-protocol.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/scaffolding-robustness-protocol.md)

### 🟡 Yellow Team (System Builders & Deployment Lifecycle)
Focuses on build automation, container configurations, hardware limits, data workflows, and service resilience.
* **AI/ML Robustness & Bias Audits:** [ai-robustness-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/ai-robustness-checklist.md)
* **Container Orchestration & Probes:** [deployment-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/deployment-patterns.md)
* **Data Flow & Database Pool Safety:** [data-pipeline-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/data-pipeline-standards.md)
* **Documentation Standards (ADRs):** [documentation-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/documentation-standards.md)
* **Embedded Software & Safety:** [embedded-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/embedded-standards.md)
* **Functional Safety (MISRA):** [functional-safety-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/functional-safety-checklist.md)
* **Performance Budgeting:** [performance-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/performance-patterns.md)
* **Resilience, Retries, & Circuit Breakers:** [resilience-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/resilience-patterns.md)
* **Testing Philosophy & Runners:** [testing-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/testing-patterns.md)
* **Toolchain Cross-Compilation:** [toolchain-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/toolchain-standards.md)

---

## 2. Alphabetical Index of References

Below is a complete index of all 23 reference files with descriptions of their target auditing focus.

1. **[accessibility-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/accessibility-checklist.md)**
   - UI elements, focus management, screen readers, WCAG 2.1/2.2 AA checklists.
2. **[ai-robustness-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/ai-robustness-checklist.md)**
   - Mitigation guidelines for model hallucination, adversarial bias, and prompt injection filters.
3. **[api-contract-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/api-contract-standards.md)**
   - Schemas for OpenAPI, GraphQL, gRPC Protobufs, and API contract validations.
4. **[appsec-hardening-guide.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/appsec-hardening-guide.md)**
   - Secure HTTP headers (Helmet), CORS configuration, rate limits, and sanitizers.
5. **[data-pipeline-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/data-pipeline-standards.md)**
   - Schema validation rules, connection pool management, and pipeline retry structures.
6. **[data-privacy-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/data-privacy-checklist.md)**
   - GDPR/CCPA PII classification rules, audit logs scrubbing, and user data deletion workflows.
7. **[deployment-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/deployment-patterns.md)**
   - Kubernetes liveness/readiness probes, Docker Compose HA setups, and backup/restore validations.
8. **[documentation-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/documentation-standards.md)**
   - Nygard-style ADR formatting templates, retroactive cycle reviews, and diagram configurations.
9. **[embedded-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/embedded-standards.md)**
   - Memory boundaries, stack limits, static analysis (cppcheck), and QEMU setup configurations.
10. **[formal-methods-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/formal-methods-patterns.md)**
    - Rust Kani proof designs, TLA+ model checking configurations, and loop execution invariants.
11. **[functional-safety-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/functional-safety-checklist.md)**
    - MISRA C/C++ static compliance matrices and hardware failure safety metrics.
12. **[fuzzing-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/fuzzing-patterns.md)**
    - Atheris/Cargo fuzz harnesses, memory error tracking, and Sanitizers configuration.
13. **[legal-phrasing-dictionary.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/legal-phrasing-dictionary.md)**
    - Phrasing scanning databases mapping high-risk claims to legally neutral alternatives.
14. **[notebook-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/notebook-standards.md)**
    - Jupyter Notebook nbstripout pre-commit filters, virtual environments (Conda/Poetry), and nbqa linters.
15. **[observability-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/observability-patterns.md)**
    - OpenTelemetry SDK configuration, trace context propagators, and Grafana dashboard alerts.
16. **[performance-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/performance-patterns.md)**
    - K6 performance budget metrics, Micro-benchmarks, and CI budget boundaries.
17. **[resilience-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/resilience-patterns.md)**
    - Retry policies with exponential backoff and jitter, fallback patterns, and circuit breaker setups.
18. **[scaffolding-robustness-protocol.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/scaffolding-robustness-protocol.md)**
    - Safe package installation commands, rollback configurations, and AST merge routines.
19. **[security-hardening-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/security-hardening-checklist.md)**
    - Compliance mapping profiles (SOC 2, ISO 27001, HIPAA controls, FIPS algorithms).
20. **[supply-chain-audit-checklist.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/supply-chain-audit-checklist.md)**
    - License validation checkers (blocking viral copyleft packages) and lockfile integrity scanning.
21. **[testing-patterns.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/testing-patterns.md)**
    - Unit/integration mocking frameworks (Jest, Vitest, MSW), coverage budgets, and test setups.
22. **[toolchain-standards.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/toolchain-standards.md)**
    - Cross-compilation settings, linker parameters, Emscripten targets, and sysroot mappings.
23. **[vcs-discipline-rules.md](file:///d:/DevSandbox/agy-projects/repo-wizard/references/vcs-discipline-rules.md)**
    - Pre-commit/commit-msg hook schemas, conventional commits formatters, and copyright header checks.

---

## ⚠️ Disclaimer & Legal Safety

> [!IMPORTANT]
> **No Advice Provided:** The reference standards, checklists, and documentation catalogs in this directory are educational and informational resources. They do not constitute legal, financial, compliance, regulatory, or safety advice. Developers must perform their own review of recommendations, configurations, and licenses to ensure compatibility with their organizational standards and local laws.
