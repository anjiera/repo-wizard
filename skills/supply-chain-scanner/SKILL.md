---
name: supply-chain-scanner
description: Guides agents through auditing codebase dependencies for vulnerabilities and copyleft licenses, and scaffolding SBOM generators (CycloneDX, SPDX), lockfile integrity checks, and dependency checkers (Snyk, Dependabot) conditionally. Use when auditing dependencies, setting up SBOMs, or configuring license checks.
---

# Supply Chain Scanner (`supply-chain-scanner`)

## Overview
A specialized supply chain security engineering workflow designed to audit third-party dependency vulnerabilities, enforce package license compliance policies (identifying discouraged copyleft licenses like GPL/AGPL), and configure automated Software Bill of Materials (SBOM) generators and dependency check pipelines.

---

## When to Use

### Triggering Conditions
* Setting up automated lockfile validation and checksum verification.
* Integrating Software Bill of Materials (SBOM) generation (CycloneDX, SPDX) in release pipelines.
* Configuring automated dependency vulnerability scanners (Snyk, Dependabot, npm audit, cargo audit).
* Establishing pre-commit or CI/CD gates to audit third-party licenses and flag discouraged copyleft packages.

### When NOT to Use
* Resolving local build compiler/runtime errors that are unrelated to package dependencies.
* Auditing codebases that do not use a package manager or third-party libraries (e.g. plain script files without dependencies).

---

## Core Process

### Phase 1: Supply Chain Alignment
Before running any analysis or modifications, you **MUST** align with the developer:
1. **Target Standards & Tools:** Ask which dependency checkers (Snyk, Dependabot, npm audit) and SBOM standards (CycloneDX, SPDX, or none) the developer wishes to configure. Explain that all checks are strictly conditional and run only if selected.
2. **License Compliance Policy:** Establish the license ruleset (e.g., flagging discouraged copyleft licenses, suggesting permissive licenses).
3. **Execution Pipeline:** Check where automated checks should run (local pre-commit hook, remote CI, or manually).
4. **Consent Check:** Inform the developer that you will analyze files and request explicit consent before modifying any configurations.

### Phase 2: Dependency & License Auditing
Scan the codebase to evaluate supply-chain conformance:
1. **Lockfile Integrity Check:** Verify lockfile checksums and trace resolved package registry URL domains (flagging unauthorized registries).
2. **Vulnerability Assessment:** Analyze active lockfiles and manifest files for packages with known CVEs.
3. **License Legality Audit:** Evaluate the licenses of all direct and transitive dependencies against the established license compliance policy, identifying copyleft violations.

### Phase 3: Supply Chain Scaffolding
Coordinate with the environment configurer to scaffold controls:
1. **Scaffolders Dispatch:** Dispatch package installations (e.g., license-finder, cyclonedx-cli) to the scaffolder only after receiving developer permission.
2. **Interactive Nuances:** Explain configuration options and tradeoff decisions (e.g., Snyk scan frequency, FOSSA/License Finder ruleset strictness, local pre-commit run speed vs CI validation). Ask the developer to guide the configuration file modifications.
3. **Setup Scripts & Docs Integration:** Upon successful setup and validation, automatically append installation and setup commands to the project's existing setup scripts (e.g. `setup.sh`, `setup.ps1`) or onboarding documentation (`README.md`), and present these changes to the user for review.
4. **No Legal Certification:** Ensure all outputs contain the mandatory disclaimer stating that using the scanner or its configurations does not guarantee or certify regulatory or audit compliance.

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "A clean npm audit means we have zero security vulnerabilities." | Vulnerability databases are continuously updated; a clean audit only reflects known CVEs at the time of the scan. Continuous monitoring is essential. |
| "We can use GPL/AGPL packages because our product is a cloud-hosted B2B SaaS." | AGPL contains a network-use clause that triggers source-code disclosure requirements upon remote network interaction, posing a major risk for SaaS. |
| "Lockfiles are automatically generated, so we do not need to audit them." | Lockfiles can be manipulated to point to malicious dependency mirrors or spoofed hashes (lockfile poisoning), bypassing normal registry checks. |

---

## Red Flags
* Suppressing vulnerability warnings or package audits without a documented exception.
* Claiming that configuring SBOMs or scanners guarantees passing SOC 2 or regulatory compliance audits.
* Modifying `package.json`, `Cargo.toml`, or lockfiles without explicit developer consent.
* Installing external scanners or CLIs globally without user confirmation.

---

## Verification

After completing the process, confirm:
- [ ] Targeted tools (Snyk, Dependabot, CycloneDX, SPDX, or none) were explicitly aligned.
- [ ] Dependency and license audits are performed *only* for selected standards, warning on discouraged licenses and requiring risk acknowledgement.
- [ ] If selected, automated checkers (Snyk, Dependabot) or SBOM generators are successfully configured.
- [ ] Verification confirms no files were modified without developer consent.
- [ ] The mandatory legal liability disclaimer is explicitly included in the output.
- [ ] Any setup script additions or README installation instructions are presented as diffs for developer review.
