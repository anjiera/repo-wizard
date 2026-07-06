# Brainstorming Notes - Quality & Infrastructure Agent (`repo-wizard-setup`)

This document outlines the design concept, target user profiles, questionnaire matrix, and execution roadmap for a new specialized agent designed to audit existing repositories and tool custom QA, linting, testing, and compliance infrastructure.

---

## Target Developer Profiles & Needs

AI tooling must adapt to the developer's context to avoid introducing unnecessary friction (e.g. enforcing strict FIPS compliance on a weekend hobbyist wastes time, while neglecting it in an enterprise banking app is a critical failure).

1. **The Weekend Vibe Coder / Hobbyist**
 * *Needs:* Fast setups, zero-friction formatting, simple test runners.
 * *Friction limit:* Extremely low. If a pre-commit hook takes longer than 2 seconds or blocks commits, they will delete it.
2. **The Open-Source Maintainer**
 * *Needs:* Automated PR checking, contributor guidelines, license headers check, conventional commits (for automated changelogs), and security scanning.
 * *Friction limit:* Medium. Pre-commit hooks should be fast, but CI checks must be thorough to protect the repo.
3. **The Startup / Small Team**
 * *Needs:* Clean modular architecture, basic code coverage (e.g. 70-80%), automated formatters, and dependency vulnerability scanners (e.g., Dependabot, Snyk).
 * *Friction limit:* Medium-High. Ready to invest in pipeline stability to avoid shipping breaking regressions.
4. **The Enterprise / Regulated Sector Developer (Health, Finance, Gov)**
 * *Needs:* Total compliance assurance (HIPAA, PCI-DSS, FIPS), strict code coverage gates (e.g. 80-90%+), static code analysis (SonarQube), static application security testing (SAST), dependency license compliance, and signed commits.
 * *Friction limit:* High. Ready to accept slow builds and strict gates to prevent compliance audit failures.

---

## ️ Question Matrix for the Agent Setup Phase

To build a tailored plan, the agent must guide the user through these 5 key categories of questions:

### 1. Project Context & Goals (The "Why")
* "Is this a new greenfield project, or are we refactoring an existing repository?"
* "What is your developer profile: Solo hobbyist, open-source maintainer, startup/small team, or regulated enterprise developer?"
* "What is your commercial release intent: open source, self-hosted web app, consumer mobile store, or B2B SaaS?"
* "What is your tooling budget and preference: Do you want to restrict recommendations to free/open-source tools, look at premium/paid enterprise offerings, or evaluate a mix?"
* "Are you currently paying for any security, testing, or compliance tools or certification services (e.g. Snyk, SonarQube, FOSSA, specialized compilers)? If so, are you satisfied with them, or would you like to explore alternatives?"

### 2. Regulatory & Security Compliance (The "Legal Must-Haves")
The list of security standards and compliance frameworks below is a **non-exhaustive starting point** to prompt discussion and help you identify your regulatory goals:
* **HIPAA Trigger:** "Will the application store, process, or transmit Protected Health Information (PHI) or personal medical records?"
 * *Actions:* Configure database encryption linters, logging audits, access-control policies, and static compliance scanners.
* **FIPS Trigger:** "Will this project interface with US federal agencies or require cryptographic validation compliant with FIPS 140-2/140-3 standards?"
 * *Actions:* Scan dependencies for non-compliant cryptographic providers (e.g. forcing BoringSSL, OpenSSL FIPS modules).
* **FedRAMP Trigger:** "Will this project host cloud-based services for the US federal government requiring FedRAMP Authorization?"
 * *Actions:* Tool continuous monitoring lints, verify configuration hardening, audit container base images, and verify identity/access controls.
* **NIST SSDF (Secure Software Development Framework / SP 800-218) Trigger:** "Does the project require alignment with US federal secure software development standards (e.g., artifact signing, SBOMs, vulnerability disclosure)?"
 * *Actions:* Configure artifact signatures (Cosign), static application security testing (SAST), SBOM generators (CycloneDX), and automated CVE tracking.
* **CSSLP-Style Development Trigger:** "Do you want to establish secure software lifecycle principles (e.g. static abuse/misuse case tests, automated threat modeling, and input-sanitization rules)?"
 * *Actions:* Setup automated input-validation linters, security test skeletons, and threat modeling hooks.
* **CMMC (Cybersecurity Maturity Model Certification) Trigger:** "Does this repository contain data for DoD supply chain subcontractors needing to protect Controlled Unclassified Information (CUI)?"
 * *Actions:* Tool MFA validation config checks, access-control configurations audits, and system security plan templates.
* **PCI-DSS Trigger:** "Will the application process credit card transactions, digital wallets, or store financial data?"
 * *Actions:* Configure automated static checks for raw card data handling, SQL injection vulnerabilities, and encryption of data at rest.
* **GDPR/CCPA Trigger:** "Are you launching in regions with strict data privacy mandates (EU/California)?"
 * *Actions:* Setup static checks for user consent logs, data deletion compliance hooks, and third-party trackers auditing.
* **Software License Compliance Trigger:** "Do we need to audit dependencies to prevent licensing conflicts (e.g., blocking viral AGPL/GPL licenses in a commercial closed-source SaaS project, or ensuring license compatibility in an open-source repo)?"
 * *Actions:* Configure FOSSA, License Finder, or `license-checker` in pre-commit/CI.
* **Accessibility (WCAG 2.1 AA / Section 508) Trigger:** "Does this app serve a public audience or require regulatory accessibility compliance (e.g., US ADA, European Accessibility Act)?"
 * *Actions:* Tool axe-core CLI, eslint-plugin-jsx-a11y, or automated browser-based accessibility tests.
* **Secrets Leak Prevention Trigger:** "Do you want to block hardcoded API keys, private keys, database passwords, or GCP/AWS credentials from ever being committed to Git?"
 * *Actions:* Configure Gitleaks, Trufflehog, or git-secrets pre-commit hooks.
* **Internationalization (i18n) Trigger:** "Does the application target a global audience requiring strings to be strictly localized rather than hardcoded in the UI?"
 * *Actions:* Enable static checks to flag hardcoded strings (e.g., Android Lint string resource check, eslint-plugin-i18next).
* **Code Health & Architecture Trigger:** "Do we need to enforce strict structural limits (e.g., blocking circular package dependencies, flagging zombie/dead code, or validating API contract schemas like OpenAPI)?"
 * *Actions:* Configure dependency graph analyzers, unused code checkers (like `depcheck`), and contract testing tools.
* **PR Size & Code Review Discipline Trigger:** "Should we establish guardrails to prevent developers from submitting overly massive Pull Requests that are difficult to review?"
 * *Actions:* Tool local Git hooks or CI checks that flag or block PRs exceeding a set line change limit (e.g., >250 lines).
* **Supply Chain Security (SBOM) Trigger:** "Does the application require an automated Software Bill of Materials (SBOM) to track and audit all third-party and transient dependencies?"
 * *Actions:* Integrate CycloneDX or SPDX generation tools into your CI/CD pipeline.
* **Runtime Observability & Instrumentation Trigger:** "Do you want to enforce structured logging standards (e.g. blocking raw `println`/`console.log` in favor of leveled JSON logs) and verify telemetry instrumentation?"
 * *Actions:* Setup logging linters, OpenTelemetry exporters tooling, and metrics testing.
* **Green Computing & Energy Efficiency (ESG) Trigger:** "Is optimizing the application's energy usage or carbon footprint important for your target device profiles or enterprise compliance goals?"
 * *Actions:* Configure energy profiling benchmark tests or carbon emission estimators (e.g., using Green Metrics Tool) in CI/CD.
* **Legal & Copyright Header Trigger:** "Does your repository need to enforce standard copyright notices and license headers at the top of every source file (especially important for open-source or commercial IP protection)?"
 * *Actions:* Configure pre-commit scripts that scan and automatically inject or validate license headers.
* **Legal Liability & Phrase Neutrality Trigger:** "Does the application provide advice, instructions, or claims (health, financial, weather safety, data privacy) that could expose the organization to liability or phrasing-related legal risks?"
 * *Actions:* Tool the `/rw-legal-neutrality-auditor` scanning agent, setup the legal phrasing dictionary lookup, and configure pre-commit or CI scans to flag non-neutral language.
* **ISO/IEC 27001 Trigger (International):** "Does the organization require certification against the international standard for information security management systems (ISMS)?"
 * *Actions:* Configure access-control rule linters, secure coding guidelines checkers, and dynamic vulnerability assessment integrations.
* **UK Cyber Essentials Trigger (United Kingdom):** "Will the software be used by or sold to UK public or private sector organizations requiring Cyber Essentials certification?"
 * *Actions:* Setup automated checks for software patching status, firewall/network configuration templates, and secure default credentials checks.
* **Essential Eight / IRAP Trigger (Australia):** "Does your application target Australian government agencies or require alignment with the ASD's Essential Eight mitigation strategies?"
 * *Actions:* Setup application control validation, patch status monitoring, restriction audits for administrative privileges, and automated backups monitoring configurations.
* **Japan ISMAP Trigger (Japan):** "Will your cloud service or software be deployed to Japanese public sector agencies requiring ISMAP security assessment?"
 * *Actions:* Configure continuous security logging checks, audit trail retention policies, and data encryption verification.
* **Germany BSI IT-Grundschutz Trigger (Germany):** "Does the system need to comply with Germany's Federal Office for Information Security (BSI) IT Baseline Protection methodology?"
 * *Actions:* Setup security baseline checks, template generators for system security plans, and cryptographic provider audits.
* **Canada PIPEDA Trigger (Canada):** "Does the application process personal data of Canadian citizens under PIPEDA private-sector privacy rules?"
 * *Actions:* Setup logging audits for user consent, data retention policy automation, and data-in-transit/at-rest encryption checks.
* **Singapore MAS TRM Trigger (Singapore/Fintech):** "Will the application run in financial service or banking environments regulated by the Monetary Authority of Singapore (MAS)?"
 * *Actions:* Integrate vulnerability assessments, strict API security gates, access control and MFA enforcement checks.
* **EU NIS 2 Directive Trigger (European Union):** "Does the application fall under the scope of the EU's NIS 2 Directive for critical entities (digital providers, critical infrastructure, supply chain secure coding)?"
 * *Actions:* Tool supply-chain dependency security scoring, incident reporting mock channels, and vulnerability disclosure configurations.
* **SOC 2 Type I/II Trigger (SaaS Security):** "Are you building a commercial SaaS or B2B application requiring SOC 2 compliance for security, confidentiality, availability, or privacy?"
 * *Actions:* Setup automated access control logs auditing, configuration drift monitors, infrastructure encryption checks, and audit logging standards.
* **OWASP ASVS / Top 10 Trigger (Application Security):** "Do you want to verify the application against the OWASP Application Security Verification Standard or Top 10 vulnerabilities?"
 * *Actions:* Tool SAST security scanners (e.g. Semgrep, SonarQube), database SQL injection test skeletons, and secure HTTP header/CORS rule validation.
* **CIS Benchmarks / System Hardening Trigger (Infrastructure Security):** "Does your application use container configurations (Docker, Kubernetes) or environment templates needing alignment with Center for Internet Security (CIS) benchmarks?"
 * *Actions:* Integrate container base-image scanners (Trivy, Hadolint) and Kubernetes security posture audits (Kube-bench, Kubescape).
* **ISO/IEC 27701 Trigger (Privacy Information Management):** "Does your organization require certification or alignment with the international standard for privacy information management (PIMS)?"
 * *Actions:* Configure PII identification tag checks, data flows mapping helpers, and data storage minimization audits.
* **COPPA Trigger (Children's Privacy):** "Does this software target or collect personal information from children under 13, requiring compliance with the Children's Online Privacy Protection Act?"
 * *Actions:* Configure static lint rules blocking third-party tracking/analytics SDKs, verify age-gate logic, and tool data deletion endpoints.
* **Brazil LGPD Trigger (Regional Privacy):** "Does the application collect, process, or store personal data of individuals residing in Brazil, requiring compliance with the LGPD?"
 * *Actions:* Setup database encryption audits, user consent audit logging, and data portability/erasure verification hooks.
* **EN 301 549 Trigger (European Accessibility):** "Does this application target European public sector entities or fall under the European Accessibility Act (EAA) guidelines?"
 * *Actions:* Integrate axe-core CLI, eslint-plugin-vuejs-accessibility (or framework equivalent), and automated color-contrast check benchmarks.
* **VPAT / Accessibility Conformance Report (ACR) Trigger (Procurement Accessibility):** "Do you require a Voluntary Product Accessibility Template (VPAT) or ACR for enterprise, education, or government B2B procurement?"
 * *Actions:* Tool continuous accessibility regression suites and output structured accessibility audit reports in CI/CD.
* **Architecture Decisions (ADR) Automation Trigger:** "Do you want to establish an automated Architecture Decision Record (ADR) workflow in the style of Michael Nygard to track technical choices?"
 * *Actions:* Tool a lightweight CLI script or template directory under `docs/decisions/` and establish PR templates prompting for ADRs on major architectural shifts.
* **Architecture & Flow Diagramming (Mermaid/C4) Trigger:** "Do you want to document and maintain codebase architecture or system flows using industry-standard text-to-diagram (Mermaid/C4 Model) tools?"
 * *Actions:* Tool Mermaid CLI configurations, generate basic C4 Model context diagram templates, and integrate a pre-commit check to validate Mermaid syntax.
* **Bug Retrospective & Knowledge Base Trigger:** "Should the repository enforce documenting post-mortems or knowledge base (KB) articles for non-trivial bug fixes to prevent future regressions?"
 * *Actions:* Tool a standardized post-mortem/KB template (Root Cause, Impact, Prevention, Action Items) and configure PR checklists to prompt for them on critical bug-fix pull requests.
* **Automotive Safety (ISO 26262 & MISRA) Trigger:** "Is this software deployed on road vehicles or required to align with automotive functional safety standards (ISO 26262 / ASIL, MISRA C/C++ guidelines)?"
 * *Actions:* Configure MISRA compliance static analysis tools, block dynamic heap allocations, and tool requirement-to-test traceability matrix templates.
* **Aerospace & Safety of Life (DO-178C / IEC 61508) Trigger:** "Does this software run on airborne avionics systems or safety-of-life industrial infrastructure needing formal validation (DO-178C, IEC 61508)?"
 * *Actions:* Integrate Modified Condition/Decision Coverage (MC/DC) testing configurations, enforce strict static loop bounds checkers, and generate formal test-case verification templates.
* **Medical Device Software (IEC 62304) Trigger:** "Does this codebase run on or interface with a medical device requiring software life cycle validation under IEC 62304?"
 * *Actions:* Setup regression testing gates, tool software hazard assessment templates, and verify anomaly report tracking hooks.
* **Artificial Intelligence & LLM Safety Trigger:** "Does this application use artificial intelligence models, machine learning pipelines, or Large Language Models (LLMs) subject to AI safety frameworks or regulations (e.g., EU AI Act, ISO/IEC 42001, OWASP LLM Top 10)?"
 * *Actions:* Integrate prompt-injection security scanners (e.g. LLM Guard, NeMo Guardrails), tool model evaluation/toxicity testing pipelines, and configure training dataset lineage and licensing audits.
* **Gaming, Wagering & RNG Compliance Trigger:** "Will the software support online wagering, real-money gaming, sweepstakes, or require certified Random Number Generation (RNG) (e.g., GLI standards)?"
 * *Actions:* Enforce cryptographic CSPRNG lint rules, configure secure, non-repudiable audit logging, and tool geolocation validation API tests.

### 3. Stack, Hardware & Performance Constraints (The "Technical What")
* "What is your primary programming language and build system (e.g., Gradle/Kotlin, npm/Vite/TypeScript, Cargo/Rust)?"
* **Target Hardware & Runtime Environment Constraints:** "What are your target execution environments? We need to get clear answers about your runtime ecosystem. The list below is a **non-exhaustive starting point** to prompt discussion and help you talk through your design goals and platform constraints:
 * **Desktop / OS:** macOS, Windows, Windows ARM, Ubuntu/Linux, ChromeOS.
 * **Mobile:** iOS, Android.
 * **Wearables:** AppleWatch, WearOS, Fitbit.
 * **Embedded / IoT:** Raspberry Pi, custom microcontrollers (Arduino, ESP32), game consoles.
 * **Infrastructure:** Websites/Browsers, Docker containers, Kubernetes (K8s) pods, Serverless functions.
 * **Architectures:** 32-bit x86, 64-bit x64, ARM (v7/v8), or RISC-V."
 * *Actions:* Setup memory leak analysis, compiler optimization profiles, cross-compilation toolchains, container security scanners, emulator configurations in CI/CD, or platform-specific instruction set checks.
* **Performance Testing:** "Do you want to establish performance regression gates (e.g. Lighthouse CI for web vitals, benchmark lints in Go/Rust/C++, or JMeter/K6 load testing configurations)?"
* "Where is this project hosted and built (e.g. GitHub Actions, GitLab CI, local development environments only)?"

### 4. Friction Level & Strictness (The "Quality Rules")
* **Unit & Integration Testing Trigger:** "Do you have existing tests, or do you want to tool a new unit/integration/E2E test suite (e.g. Vitest, Jest, PyTest, JUnit, Cargo test) and mock API environments?"
 * *Actions:* Configure test runners, setup test directory structures, integrate mock API/database layers, and establish local run scripts.
* **Code Coverage:** "Do you want to establish a code coverage gate? If so, at what percentage (e.g. 50% for core, 80% standard, 90%+ strict)?"
* **Local vs. Remote Gates:** "Do you want to block commits locally if they fail linters/formatters (using pre-commit hooks), or only run these checks on remote pull requests (in CI)?"
* **Commit Discipline:** "Do you want to enforce Conventional Commits (e.g. `feat:`, `fix:`) for automated changelog generation and versioning?"
* **Tool Execution Environments:** "Where should these scanning, testing, and validation tools be configured to run?
 * *Local developer environment:* Run on-demand inside the IDE or developer terminal.
 * *Pre-commit / Pre-push:* Run automatically via local git hooks (e.g., Husky) to catch issues before code is shared.
 * *Build servers / CI:* Run remotely on pull requests (e.g. GitHub Actions, GitLab CI) with strict build-blocking gates.
 * *Continuous monitoring:* Run on a recurring cron schedule scanning deployed resources, active servers, or dependency registries."

### 5. Codebase Size & Token-Efficient Tooling (The "Adoption Strategy")
* **Upfront Size Verification:** Detect codebase lines of code (LOC), file counts, and module architectures. 
 * "This repository appears to be a large codebase ([count] lines). To prevent running out of AI tokens and to minimize API costs, should we tool your unit tests and QA configurations incrementally (e.g. library-by-library or module-by-module) rather than auditing the entire project at once?"
* **Transition Plan for Legacy Code:** "If we find existing code that violates the new rules, how should we handle it:
 1. *Hard Gate:* Fix all existing issues before setting up the hooks.
 2. *Soft Transition (Baselines):* Generate baseline files (like Detekt/ESLint baseline XMLs) to ignore existing legacy violations, enforcing the new rules strictly on modified or new files only.
 3. *Incremental Backlog:* Create an implementation plan to audit and write unit tests for legacy code in structured, token-safe batches."

---

## ️ Multi-Agent Orchestration Architecture (`repo-wizard`)

To prevent token congestion, prompt degradation, and code complexity, the **Repo Wizard** operates under a **Lead Orchestrator & Specialist Handoff** pattern.

```
 ┌───────────────────────┐
 │ /repo-wizard command │
 └───────────────────────┘
 │
 (Initial Questionnaire)
 ▼
 ┌───────────────────────┐
 │ repo-wizard.agent │ (Lead Orchestrator)
 └───────────────────────┘
 │
 ┌──────────────────────┼───────────────────────┐
 ▼ (QA setup) ▼ (Compliance setup) ▼ (Git/Hooks setup)
```

### 1. Lead Orchestrator: `repo-wizard.agent`
* **Role:** Conducts initial codebase sizing, manages the interactive alignment wizard, discovers and recommends appropriate tools dynamically based on user tech stack/vision, compiles the approved list, and delegates specific setup instructions.
* **Discussion-First Principle:** The agent **never forces** tool choices or default gates. All recommendations are presented as points for discussion. The agent acts as an interviewer, gathering developer input, proposing options with trade-offs, and letting the developer modify the final specifications before any file changes are proposed.
* **User-Defined Gate Control:** All quality thresholds (e.g. choosing 10% coverage vs. 80% coverage, soft format checks vs. hard build-blocking pre-commit gates) are **fully determined by the developer**.
* **Disclaimer Requirement:** The lead agent must display a clear, upfront disclaimer stating:
 > *Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.*
* **Commands:** `/repo-wizard`
* **Skill:** `repo-wizard-scaffolder`

### 2. Decoupled Specialist Subagents
To prevent the agent from becoming outdated when new frameworks emerge, the specialist subagents are **fully decoupled** from specific tool configurations. They receive concrete instructions dynamically from the lead orchestrator:
* **`tool-auditor.agent` (Safety & Health Screener)**:
 * *Expertise:* Evaluating package registry metadata, GitHub repositories, and security databases.
 * *Dynamic Scope:* Evaluates recommended tools for red flags:
 - *Security:* Known CVEs, dependency vulnerabilities, or supply-chain threats.
 - *Activity/Maintenance:* Last commit date, open issues/pull requests ratio, active maintainer count.
 - *Reputation/Health:* Download volume, community stars, licensing conflicts.
 - *Verdict:* Flags dead, abandoned, or suspicious tools and returns warning signals to `repo-wizard`.
* **`tooling-engineer.agent` (Unified Systems Installer)**: 
 * *Expertise:* Executing shell package installations, creating/merging config files, and validating build runs.
 * *Why a specific installation expert makes sense:* Rather than hardcoding how to install every possible tool on the market, this subagent is a general-purpose environment configurer. It receives dynamic parameter contracts from the lead (e.g., the exact package commands, config file paths, and contents) and focuses entirely on executing the installation, writing/merging the configuration files, verifying the compilation/build, and running verification scripts to ensure the new setup works cleanly.
* **`compliance-auditor.agent` (Security Hardening & Certifications)**:
 * *Expertise:* Technical compliance security posture, cryptographic configurations, and environment hardening (e.g. FIPS, FedRAMP, SOC 2, NIST SSDF, ISO 27001, Cyber Essentials, MAS TRM).
 * *Dynamic Scope:* Configures encryption-at-rest/in-transit checkers, secure logging policies, artifact signing pipelines (e.g., Cosign), infrastructure-as-code static scanners (tfsec, checkov), and configures compliance verification templates.
* **`privacy-hardener.agent` (Data Privacy & Consent)**:
 * *Expertise:* Global privacy engineering regulations (GDPR, CCPA, LGPD, COPPA, PIPEDA, ISO 27701).
 * *Dynamic Scope:* Reviews database schemas and logs for PII exposure, configures data scrubbing policies, integrates consent log architectures, age-verification routing skeleton tests, and configures user data deletion (right-to-be-forgotten) hook templates.
* **`accessibility-auditor.agent` (A11y Standards & Reporting)**:
 * *Expertise:* Accessibility standards conformance (WCAG 2.1/2.2 AA, Section 508, EN 301 549) and Voluntary Product Accessibility Template (VPAT/ACR) reporting.
 * *Dynamic Scope:* Configures automated DOM accessibility test runners (Axe-core CLI), accessibility linting setups (e.g. eslint-plugin-jsx-a11y), keyboard-navigation test skeletons, and schedules automated accessibility CI/CD regression checks.
* **`supply-chain-auditor.agent` (Dependency Security & SBOM)**:
 * *Expertise:* Auditing active dependencies, Software Bill of Materials (SBOM) orchestration, and software license legality.
 * *Dynamic Scope:* Configures CycloneDX/SPDX SBOM generation scripts into CI/CD pipelines, configures dependency vulnerability audit scanners (Snyk, Dependabot, npm audit), and integrates license-compliance verification tools (FOSSA, License Finder) to prevent viral copyleft license issues.
* **`qa-engineer.agent` (Unit, E2E & Mock Tooling)**:
 * *Expertise:* Test framework configuration (Vitest, Jest, PyTest, JUnit, Cargo test, Playwright), test-driven development (TDD) rules, database/API mocking, and coverage threshold integration.
 * *Dynamic Scope:* Configures unit/integration/E2E test suites, designs mock configurations (MSW, wiremock, Testcontainers), configures code coverage tools (Istanbul, Jacoco), and hooks test runs into package configurations and CI/CD pipelines.
* **`vcs-workflow-engineer.agent`**:
 * *Expertise:* VCS hook setups, commit formatting lints, formatting rules, and license/copyright header validation.
 * *Dynamic Scope:* Configures pre-commit hooks (Husky/git hooks, hg hooks, or Perforce trigger setups), Conventional Commits check scripts, formatting tools, and automated copyright header scanners.
* **`technical-scribe.agent` (Docs, ADRs & Architecture Diagrams)**:
 * *Expertise:* Technical writing, architecture visualization (Mermaid/C4 Model), Nygard ADR setups, API docs generators, and knowledge-base curation.
 * *Dynamic Scope:* Configures Nygard-style ADR templates, CLI helpers, or Git hooks under `docs/decisions/`, auto-generates API doc generator configs (e.g. TypeDoc, Sphinx), creates baseline C4 architectural diagrams in Markdown using Mermaid, and sets up bug-fix post-mortem directories and PR verification checklists.
* **`performance-auditor.agent`** (optional):
 * *Expertise:* Tooling benchmark libraries, load test runners, or cross-compilers.

---

## Verification and Handoff Rules

1. **Dynamic Instructions**: The lead orchestrator compiles the approved list of tools and passes them as a JSON or text parameter contract to the target subagent during invocation (e.g., `tool_name: "Vitest", install_command: "npm i -D vitest", config_files: [{"path": "vitest.config.ts", "content": "..."}]`).
2. **Safety Audit Gate**: Before presenting any dynamic tool recommendations to the user, `repo-wizard` passes the candidates to the `tool-auditor.agent` to screen for vulnerabilities, licensing conflicts, or abandonment. Any flagged risks are explicitly listed as warnings in the wizard's recommendations.
3. **Step-by-Step Approval:** The `repo-wizard` presents the overall plan. The user selects which setup phase to run first.
4. **Context Separation:** Each specialist subagent is spawned in a fresh, isolated conversation sandbox using Antigravity's `invoke_subagent` or Claude's subagent tools. They complete their specific setup, test that it works, and return a structured report to the lead orchestrator.
5. **Rollback Safety:** If a subagent's tooling breaks the build or fails unit tests, the lead orchestrator rolls back the changes and reports the exact failure to the user.
