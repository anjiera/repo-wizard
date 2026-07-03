# Repo Wizard Glossary

Welcome to the **Repo Wizard Glossary**! This document is specifically designed to assist junior developers, weekend vibe coders, and engineers of all backgrounds in demystifying the dense terminology, acronyms, and concepts associated with production-level, enterprise-grade software development and automated security/compliance governance.

> [!NOTE]
> **Educational & Informational Disclaimer:** The definitions, summaries, and explanations provided in this glossary are simplified, high-level conceptual reference points designed for developer education. They are not exhaustive, final, or legally binding. They do not constitute legal, financial, regulatory, compliance, or professional advice. Users should explore these concepts through their own curiosity and must consult certified legal or compliance experts for formal definitions and audits.

---

## 1. AI & Agentic System Terms

### Agent-to-Agent (A2A)
A design pattern where multiple specialized AI agents communicate and coordinate with each other to solve a complex task. In `repo-wizard`, a lead **Orchestrator** agent dispatches specific auditing subtasks to specialist subagents (e.g., the `privacy-hardener-agent`).

### Contract Schema
A structured JSON definition specifying the exact parameters and types that the orchestrator must pass to a specialist agent. This prevents "prompt rot" and ensures deterministic communication between LLM-driven components.

### Headless Scanning
A non-interactive execution mode where the agent sweeps the repository without prompting the user for input at each step.
* **Headless Local Mode:** Performs a non-blocking scan of the active local repository, outputting report summaries.
* **Headless Remote Mode:** Clone and evaluate a public remote repository URL, completing a best-guess analysis.

### Lead Orchestrator
The primary agent (mapped to `/repo-wizard`) that manages the user interaction lifecycle, sizing checks, recommendation engines, and hands off execution tasks to specialists.

### LLM-as-a-Judge
A testing evaluation pattern where an LLM is used to audit the output of another LLM against a set of binary criteria (rubrics). This is used in `scripts/run-evals.js` to ensure prompt changes do not degrade agent behavior.

### Rubric
A set of binary, objective assertions used to evaluate an agent's response (e.g., *"The output must contain a rollback instruction"*). Rubrics are used to test agent output consistency.

### Specialist Agent
An expert subagent designed to handle a single domain (e.g., digital accessibility, vulnerability scanning, or database backups) by following a dedicated skill checklist.

---

## 2. Cybersecurity & Engineering Terms

### Architecture Decision Record (ADR)
A lightweight document capturing an architectural decision, its context, considered options, outcomes, and consequences. We follow the Nygard ADR standard.

### Abstract Syntax Tree (AST)
A tree representation of the abstract syntactic structure of source code. Used by code-analysis tools and AST-based code formatters to modify files safely without breaking syntactical structure.

### Cross-Origin Resource Sharing (CORS)
A browser-implemented security mechanism that uses HTTP headers to restrict which domains can request resources from a web application.

### Common Vulnerabilities and Exposures (CVE)
A publicly curated database of known information-security vulnerabilities and exposures.

### Software Bill of Materials (SBOM)
A nested inventory or list of ingredients detailing all software components, licenses, and dependencies used in building and running an application.

### Static Application Security Testing (SAST)
A testing methodology that analyzes source code to find security vulnerabilities without executing the program.

---

## 3. Regulatory Compliance Frameworks

### CCPA / CPRA
* **California Consumer Privacy Act / California Privacy Rights Act**
* Data privacy laws governing how companies collect, store, and process the personal information of California residents, introducing rights to delete and opt-out of data collection.

### GDPR
* **General Data Protection Regulation**
* The European Union's comprehensive data privacy and security law, imposing strict rules on personal data processing, storage, consent, and user data portability.

### HIPAA
* **Health Insurance Portability and Accountability Act**
* A United States federal law establishing national standards to protect sensitive patient health information (Protected Health Information or PHI) from being disclosed without consent.

### ISO 27001
* An international standard specifying the requirements for establishing, implementing, maintaining, and continually improving an Information Security Management System (ISMS).

### MISRA
* **Motor Industry Software Reliability Association**
* A set of software development guidelines for the C/C++ programming languages, aiming to facilitate code safety, security, portability, and reliability in embedded and safety-critical systems.

### PII
* **Personally Identifiable Information**
* Any data that could potentially identify a specific individual (e.g., email address, credit card number, phone number).

### SOC 2
* **System and Organization Controls 2**
* An auditing framework designed by the AICPA to ensure service providers securely manage data to protect the privacy and interests of their clients, centered on security, availability, processing integrity, confidentiality, and privacy.
