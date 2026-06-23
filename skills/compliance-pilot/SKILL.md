---
name: compliance-pilot
description: Guides agents through auditing and scaffolding security and compliance configurations (SOC 2, ISO 27001, FIPS, HIPAA, PCI-DSS, FedRAMP). Use when checking compliance profiles, setting up security configurations, or audit logging.
---

# Compliance Pilot (`compliance-pilot`)

## Overview
A specialized security and engineering compliance workflow designed to audit repositories for technical security controls, configure pre-commit and CI/CD security checks, map cryptographic providers to FIPS-approved lists, and draft compliant audit logging configurations.

---

## When to Use

### Triggering Conditions
* Establishing technical security controls for compliance certifications (SOC 2, ISO 27001, FIPS 140-2/3, HIPAA, PCI-DSS, FedRAMP).
* Configuring Infrastructure-as-Code (IaC) static scanners (Checkov, Tfsec, Terrascan).
* Setting up git commit signing verification and pre-commit hooks (`.pre-commit-config.yaml` or Husky).
* Designing application audit logging templates and database encryption checking rules.

### When NOT to Use
* Managing organizational policies, vendor compliance questionnaires, or human-oriented security procedures (these belong in legal/HR).
* Implementing physical server firewall policies or network switches (out of scope for repository-level scaffolding).

---

## Core Process

### Phase 1: Interactive Alignment
Before generating or modifying any files, you **MUST** align with the developer:
1. **Compliance Target:** Ask which frameworks are required (e.g. SOC 2, ISO 27001, FIPS 140-2/3, HIPAA, PCI-DSS, FedRAMP, or general hardening). If the developer has no preference or is unsure, suggest candidate options dynamically after screening them via `tool-evaluator.agent`.
2. **Infrastructure Scope:** Ask if they are using Infrastructure-as-Code (Terraform, CloudFormation, Kubernetes yaml, Ansible) and identify the cloud provider (AWS, GCP, Azure, or Hybrid).
3. **Cryptographic Profile:** Ask if FIPS compliance requires validated modules or standard permissive crypto libraries.
4. **Consent Check:** Inform the developer that you will analyze existing configurations and ask for permission before modifying scripts or installing tools.

### Phase 2: Codebase Compliance Audit
Scan the codebase to evaluate existing security controls:
1. **IaC Presence:** Locate Terraform files (`*.tf`), CloudFormation configs (`*.yaml`, `*.json`), or Dockerfiles.
2. **Setup/Pre-commit Configs:** Search for pre-commit hooks or local lint configs (`package.json`, `Makefile`, etc.).
3. **Crypto References:** Search for cryptographic library imports (e.g. `crypto`, `bcrypt`, `jsonwebtoken` in JS/TS).
4. **Logging Infrastructure:** Identify if there are dedicated logger configurations (e.g., winston, logback, log4js).

### Phase 3: Deliverables Scaffolding
Coordinate with the environment configurer to scaffold controls:
1. **Tool Recommendations:** Recommend specific tools (e.g. Checkov for IaC, GitLeaks/TruffleHog for secrets, GPG signing hooks).
2. **Consent & Nuances:** Explain setting choices and security tradeoffs (e.g. checkov strictness, commit signing local friction). Ask the user to guide the setup.
3. **Audit Logging Drafts:** Write templates or logging middleware configuration guides matching SOC 2 / ISO 27001 / HIPAA logging criteria.
4. **FIPS Startup Checks:** Generate startup module verification checks to confirm the runtime is executing under a FIPS-validated provider.
5. **HIPAA & PCI-DSS Safeguards:** Scaffold log processors to redact PHI, parameterized queries to prevent SQL injections, and PAN encryption check scripts.
6. **FedRAMP Hardening:** Setup container base image scanning (Trivy) and automated vulnerability update configurations.

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "Setting up Checkov makes the repo compliant." | Scaffolding validation tools helps automate compliance testing, but actual certification requires organizational audits and policy checks. |
| "I should automatically configure GPG keys and commit signing." | Commit signing requires individual developer private GPG keys which the agent cannot access or generate. The agent should configure the verification hooks, but the developer must import their keys. |
| "I can enforce FIPS compliance by swapping libraries." | FIPS requires OS-level validated cryptographic modules. Merely renaming library imports will not ensure FIPS compliance. |

---

## Red Flags
* Claiming or guaranteeing that the repo is "100% compliant" or "certified."
* Writing hardcoded keys, dummy certificates, or API secrets into code files.
* Attempting to configure GPG commit signing locally without providing GPG key setup instructions for the developer.

---

## Verification

After completing the process, confirm:
- [ ] The developer's framework target (SOC 2, ISO 27001, FIPS, HIPAA, PCI-DSS, FedRAMP) was interactively aligned.
- [ ] Existing cryptographic library imports and IaC files were audited.
- [ ] No GPG/SSH private keys or credentials were created or hardcoded.
- [ ] Pre-commit hook configurations (such as secret scanning or IaC checks) are scaffolded if requested.
- [ ] If FIPS compliance is targeted, FIPS startup runtime check scripts are generated and explained.
- [ ] If SOC 2, ISO 27001, or HIPAA is targeted, app logging configurations matching audit trail requirements are drafted or scaffolded.
- [ ] If PCI-DSS or FedRAMP is targeted, security checks (parameterized queries, container image scanners) are configured.
