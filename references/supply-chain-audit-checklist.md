# Dependency Security & License Audit Checklist

This reference checklist maps major third-party dependency security standards, lockfile integrity rules, Software Bill of Materials (SBOM) specifications, and license compliance audits to codebase and configuration controls.

> [!NOTE]
> **Verification Nuance:** Automated checks (such as npm audit or static license scans) are advisory and run against known vulnerability databases or static text files. Out-of-band updates, private registries, and custom inline licensing terms require manual inspection.

> [!IMPORTANT]
> **Opt-In Policy:** Developers may choose to configure unit scanners, SBOM generators, and license blocklists selectively. All scans, recommendations, and test verifications must only execute for the specific capabilities the developer has opted to configure.

---

## 1. Lockfile Integrity Controls

### 1.1 Checksum & Lockfile Linting
- [ ] *Conditional Check:* Configure lockfile linting (e.g. `lockfile-lint` for npm) to validate hash algorithms (e.g., enforcing sha512) and prevent lockfile poisoning.
- [ ] *Conditional Check:* Validate that direct dependency versions in `package.json` / `Cargo.toml` are strictly synchronized with lockfile version mappings.

### 1.2 Registry Verification
- [ ] *Conditional Check:* Audit resolved URLs in the lockfile to ensure they point only to authorized registries (e.g., `https://registry.npmjs.org` or internal private mirrors). Flag unauthorized domains.

---

## 2. Dependency Vulnerability Scanners

### 2.1 Automated Continuous Scanners
- [ ] *Conditional Check:* Configure Dependabot or Renovate configuration files (e.g. `.github/dependabot.yml`) to automatically check for dependency updates and security vulnerabilities.
- [ ] *Conditional Check:* Set up continuous vulnerability auditing (e.g., `snyk test`, `npm audit`, `yarn audit`, or `cargo audit`) to run as pre-commit or CI/CD gates.

### 2.2 Threshold Alerts
- [ ] *Conditional Check:* Define strict severity thresholds for automated build failures (e.g., blocking builds only on High or Critical CVEs).

---

## 3. Software Bill of Materials (SBOM) Standards

### 3.1 SBOM Document Formats
- [ ] *Conditional Check:* Integrate CycloneDX metadata generator scripts (e.g., `@cyclonedx/cyclonedx-npm` or `cargo-cyclonedx`) into release builds to output valid JSON/XML files.
- [ ] *Conditional Check:* Ensure generated SBOM documents include component names, exact versions, hashes, licenses, and supplier information.

---

## 4. Software License Classification & Compliance

### 4.1 Permissive Licenses (Suggested)
- [ ] *Conditional Check:* Set up license audit policies (e.g. `license-finder` config) to suggest permissive licenses:
  - MIT License
  - Apache License 2.0
  - BSD 2-Clause and 3-Clause Licenses

### 4.2 Weak Copyleft (Warning/Review)
- [ ] *Conditional Check:* Flag and prompt for manual review on weak copyleft licenses (where link-level usage may be allowed but modifications must be shared):
  - Mozilla Public License (MPL)
  - Eclipse Public License (EPL)
  - GNU Lesser General Public License (LGPL)

### 4.3 Strong/Viral Copyleft (Discouraged)
- [ ] *Conditional Check:* Configure pre-commit/CI license scanners to flag strong copyleft licenses that may mandate disclosure of proprietary code:
  - GNU General Public License (GPL)
  - GNU Affero General Public License (AGPL)
  - Server Side Public License (SSPL)
- [ ] *Acknowledge Risks:* Require explicit developer acknowledgement of the potentially cascading copyleft consequences (e.g., mandatory source code disclosure) when adopting a discouraged license.
- [ ] *Emphasize Alternatives:* Re-emphasize permissive (Suggested) alternatives that provide the same or similar features to reduce license exposure.


---

## 5. Manual/Out-of-Scope Audit Items

### 5.1 Private Registries
- [ ] *Manual Verification:* Confirm credentials, tokens, and authorization scopes for private NPM/Cargo registries are securely stored in environment variables or vault systems, not hardcoded in `.npmrc` or codebase config files.

### 5.2 Custom Licensing & Code Copying
- [ ] *Manual Verification:* Audit codebase files for copied code snippets or libraries loaded without standard package managers, confirming they contain proper copyrights and do not introduce copyleft requirements.
