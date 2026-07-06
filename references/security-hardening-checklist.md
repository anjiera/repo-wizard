# Security Hardening & Compliance Checklist

This reference checklist maps major security and compliance frameworks (SOC 2, ISO 27001, FIPS) to specific repository, code, and infrastructure controls.

> [!NOTE]
> **Verification Nuance:** Several organizational and administrative controls (such as Multi-Factor Authentication enforcement, mandatory branch protection/peer review rules, or user account cleanup) cannot be verified by analyzing the codebase alone. These items are noted as manual investigation points for the developer to check in their respective repository hosting (e.g. GitHub organization settings) or cloud provider management consoles.

---

## 1. SOC 2 Trust Services Criteria (Security & Access)

### 1.1 Access Control & Authentication
- [ ] Enforce Multi-Factor Authentication (MFA) on all repository committers and administrative accounts.
- [ ] Automate access reviews; remove inactive accounts (no commits or logins in >90 days).
- [ ] Enforce least privilege access scopes on developer and service API tokens.

### 1.2 System Logging & Monitoring (CC6.1, CC6.3)
- [ ] Centralize application logs; ship to a secure, write-once-read-many (WORM) log management system.
- [ ] Log all user authentication events (success/failure), administrative changes, and permission alterations.
- [ ] Log unauthorized access attempts and security configuration changes.
- [ ] Implement log integrity protection (hashed log chains or signed log exports).

### 1.3 Change Management & Testing (CC8.1)
- [ ] Mandatory peer review (Pull Requests) with at least 1 independent engineering approval before merges to production branch.
- [ ] Enforce automated security scanning (SAST/Linting) on every Pull Request.
- [ ] Enforce signed commits (`git commit -S`) to verify author identity.

---

## 2. ISO/IEC 27001 Controls (A.8, A.14)

### 2.1 Cryptographic Controls (A.8.24)
- [ ] Define and implement a policy for the use of cryptographic controls for protecting information.
- [ ] Ensure all stored sensitive data (PII, credentials) is encrypted at rest using approved standards.
- [ ] Ensure all transit of data uses modern cryptographic protocols (TLS 1.3 preferred, TLS 1.2 minimum).

### 2.2 Secure System Engineering (A.14.2)
- [ ] Establish secure coding guidelines for each programming language in the stack.
- [ ] Establish pre-commit linting and vulnerability scanning routines.
- [ ] Verify that third-party library licenses are permissive (avoid viral copyleft in closed-source projects).
- [ ] Document all software design decisions using Architectural Decision Records (ADRs).

---

## ️ 3. FIPS 140-2 / FIPS 140-3 Cryptographic Standards

### 3.1 Approved Cryptographic Algorithms
- [ ] **Symmetric Encryption:** AES (128, 192, 256 bits) in CBC, CFB, OFB, CTR, or GCM modes.
- [ ] **Hashing/Message Digest:** SHA-224, SHA-256, SHA-384, SHA-512, SHA-512/224, SHA-512/256, or SHA-3 family.
- [ ] **Digital Signatures:** RSA (2048-bit minimum), DSA, ECDSA, or Ed25519 (FIPS 186-5).
- [ ] **Key Agreement:** DH (Diffie-Hellman) or ECDH (Elliptic Curve Diffie-Hellman) (2048-bit equivalent minimum).

### 3.2 Module Configuration & Validation
- [ ] Bind application code to a FIPS-validated cryptographic provider (e.g. OpenSSL FIPS Provider, BoringSSL FIPS mode, AWS-LC).
- [ ] Enforce FIPS-mode checking at startup, throwing a terminal error and halting boot if FIPS self-tests fail.
- [ ] Implement key zeroization routines to wipe keys from RAM immediately after use.

---

## 4. HIPAA Technical Safeguards (PHI Protection)

HIPAA (Health Insurance Portability and Accountability Act) requires safeguards for Protected Health Information (PHI) stored, processed, or transmitted by the system:

### 4.1 Access Control & PHI Encryption (45 CFR § 164.312(a), (iv))
- [ ] **Encryption in Transit:** Enforce HTTPS/TLS 1.3 for all endpoints serving PHI. Disable insecure cipher suites.
- [ ] **Encryption at Rest:** Enable AES-256 encryption on all databases, backups, and storage buckets storing medical records.
- [ ] **Automatic Logoff:** Tool session timeouts and automatic UI logoffs for inactive users (e.g., 15-minute limits).
- [ ] **Unique User Identification:** Verify that every system user has a unique username/ID; forbid shared credentials or admin accounts.

### 4.2 Transmission & Audit Controls (45 CFR § 164.312(c), (d))
- [ ] **Data Integrity Protection:** Implement hash-based message authentication codes (HMAC) or database checksums to confirm PHI has not been altered in transit.
- [ ] **Leveled Audit Logs:** Record all events that create, read, update, or delete PHI, capturing user ID, timestamp, and action performed.
- [ ] **Log Scrubbing:** Ensure logs do not print raw PHI payload variables (e.g. patient names, diagnoses) in plaintext.

---

## 5. PCI-DSS Cardholder Data Security

The Payment Card Industry Data Security Standard (PCI-DSS) establishes requirements for protecting Cardholder Data (CHD) and Sensitive Authentication Data (SAD):

### 5.1 Cardholder Data Protection (Req 3, Req 4)
- [ ] **Restricted SAD Storage:** Never store Sensitive Authentication Data (full magnetic stripe, CVV/CVC, or PIN) after authorization, even if encrypted.
- [ ] **PAN Encryption:** Encrypt Primary Account Numbers (PANs) wherever they are stored (databases, log files, configuration parameters) using strong cryptography.
- [ ] **Truncation & Masking:** Mask PAN when displayed (maximum of first 6 and last 4 digits visible) unless explicitly required for business needs.
- [ ] **Encrypted Transmission:** Enforce TLS 1.2 or TLS 1.3 with secure ciphers (e.g. ECDHE-RSA-AES256-GCM-SHA384) for all digital transactions.

### 5.2 Vulnerability Management & Access Controls (Req 6, Req 8)
- [ ] **SQL Injection Prevention:** Configure parameterized database queries and ORMs exclusively to block injection attacks.
- [ ] **Access Logs Auditing:** Assign unique IDs to users, enforce multi-factor authentication (MFA) for administrative access, and record all access attempts to the cardholder data environment (CDE).
- [ ] **Vulnerability Scanning:** Integrate automated static analysis security testing (SAST) and package scanning to identify and patch dependencies with known CVEs.

---

## 6. FedRAMP Cloud Security Hardening Controls

FedRAMP (Federal Risk and Authorization Management Program) builds on NIST SP 800-53 controls for securing cloud services hosted for government agencies:

### 6.1 Configuration & Vulnerability Management (NIST SP 800-53 CM-6, RA-5)
- [ ] **IaC Hardening:** Scan Terraform, CloudFormation, or Kubernetes manifests for configuration drift, insecure ports, and unencrypted volumes.
- [ ] **Base Container Image Auditing:** Configure automated image scanning (e.g. Trivy, Grype) to block deployments of container images containing critical or high CVEs.
- [ ] **Automated Dependency Updates:** Configure package registries and alert tools to track and auto-patch software vulnerabilities within strict timelines (e.g., 30 days for high risk).

### 6.2 Monitoring, Auditing & Crypto (NIST SP 800-53 AU-2, IA-2, SC-13)
- [ ] **Continuous Logging:** Tooling must direct all event logs to a central Security Information and Event Management (SIEM) service.
- [ ] **FIPS 140 Cryptographic Modules:** Enforce compile/runtime configurations requiring all cryptographic operations (transit, rest, hashing) to execute inside FIPS-validated modules.
- [ ] **Multi-Factor Authentication (MFA):** Enforce code-level checks validating MFA token parameters on all administrative dashboard routes and API integrations.
