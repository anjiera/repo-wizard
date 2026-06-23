---
name: privacy-guardian
description: Guides agents through auditing data storage schemas and configurations for regulatory compliance (GDPR, CCPA/CPRA, COPPA). Scaffolds database column encryption rules, PII logging filters, and data export/deletion routing templates. Use when reviewing privacy compliance or setting up data handling.
---

# Privacy Guardian (`privacy-guardian`)

## Overview
A specialized data privacy and regulation compliance workflow designed to audit source repositories for unencrypted PII storage, configure logging filters to scrub sensitive credentials and identifiers, and scaffold templates for data portability and user deletion requests.

---

## When to Use

### Triggering Conditions
* Establishing data handling controls for compliance certifications (GDPR, CCPA/CPRA, COPPA).
* Auditing database schemas, ORM files (e.g. Prisma schemas, Hibernate configurations, mongoose schemas) for plaintext PII fields.
* Implementing logging filters to prevent leaks of passwords, raw IPs, session cookies, or email addresses.
* Scaffolding API routes and controllers for user deletion ("Right to be Forgotten") and data export (JSON/CSV packaging).

### When NOT to Use
* Drafting physical privacy policies or legal terms of service text (these are administrative documents owned by legal counsel).
* Reviewing network traffic security configurations or VPC peering setups (these are infrastructure runtime controls).

---

## Core Process

### Phase 1: Privacy Alignment
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, skip interactive alignment and infer target standards and stack from the codebase.
Before generating or modifying any files, you **MUST** align with the developer:
1. **Target Regulations:** Ask which regulations apply (e.g. GDPR, CCPA/CPRA, COPPA, or generic PII protection). If the developer has no preference or is unsure, suggest candidate options dynamically after screening them via `tool-evaluator.agent`.
2. **Age Profile:** Explicitly ask if the application targets children under 13 (COPPA triggers).
3. **Storage & Log Stack:** Identify the databases in use (e.g. PostgreSQL, MongoDB) and loggers (e.g. winston, logback).
4. **Consent Check:** Inform the developer that you will analyze files and seek permission before making any changes.

### Phase 2: Codebase Data Auditing
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, bypass consent. If Approach B is used, output `[Data Blocked: Requires Shallow Clone / Local Checkout to evaluate]` for unobservable details.
Scan the codebase to evaluate existing privacy controls:
1. **Schema Audits:** Search for database configuration files, migrations, or ORM models. Look for plaintext sensitive fields (e.g., `email`, `phone`, `ssn`, `birth_date`).
2. **Logger Audits:** Scan for logging outputs that print whole request bodies, raw object variables, or user context properties.
3. **Account Routes:** Look for account registration or deletion routes.

### Phase 3: Deliverables Scaffolding
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, do not invoke the environment configurer to modify files. Instead, write suggested toolchain additions, config file updates, or commit hooks into the generated markdown report Observations file at `.repo-wizard/agents/observations-privacy-guardian-agent-<repo-name-here>.md`.
Coordinate with the environment configurer to scaffold controls:
1. **PII Logging Scrubbers:** Recommend and scaffold filters to mask or redact sensitive terms (emails, passwords, API tokens) before logs write to output.
2. **Route Templates & Placeholders:** Draft stubs and controllers for data deletion (Right to be Forgotten) and data export (Portability) requests.
3. **Database Encryption guidance:** Draft suggestions for configuring column-level encryption for identified PII fields.
4. **Interactive Tradeoffs:** Explain options (e.g. masking vs hashing, cascade deletion vs soft anonymization) and ask the user to guide the setup.
5. **Setup Scripts & Docs Integration:** Upon successful setup and validation, automatically append installation and setup commands to the project's existing setup scripts (e.g. `setup.sh`, `setup.ps1`) or onboarding documentation (`README.md`), presenting changes for review.

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "A soft delete is enough for GDPR." | GDPR requires permanent erasure or full anonymization. Retaining PII in a row marked `deleted = true` is non-compliant. |
| "Since logs are internal, we can log email addresses." | Internal log storage is still subject to audit and potential leakage. PII must be scrubbed before hitting log files. |
| "I should build the age-gate interface directly." | Age-gates require UI design and UX validation. The agent can scaffold route checks, but the frontend UX must be configured and tested manually. |

---

## Red Flags
* Hardcoding mock decryption keys or configuration secrets in database migration files.
* Claiming the application is "fully GDPR certified" or "bulletproof CCPA compliant."
* Writing auto-delete scripts that execute without a backup safeguard.

---

## Verification

After completing the process, confirm:
- [ ] Targeted jurisdictions (GDPR, CCPA, COPPA) were explicitly aligned.
- [ ] Plaintext database PII columns and ORM files were audited.
- [ ] Logging filters/scrubbers are configured to redact credentials, IPs, and emails.
- [ ] If GDPR/CCPA is selected, data deletion (cascade/anonymize) and data export (JSON/CSV) route templates and stubs are scaffolded.
- [ ] If COPPA is selected, codebase is checked to verify children device/geolocation data is not gathered, and manual parental consent steps are documented.
- [ ] Manual checks (cookie banners, ToS visibility, age gates) are flagged for the developer to inspect.
