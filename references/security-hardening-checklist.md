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
