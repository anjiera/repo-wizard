# Data Privacy & Regulation Compliance Checklist

This reference checklist maps major data privacy regulations (GDPR, CCPA/CPRA, COPPA) to specific codebase, database, and system-level controls.

> [!NOTE]
> **Verification Nuance:** Several user-experience and administrative controls (such as cookie consent banner behaviors, the visibility of privacy policy links, opt-out checkboxes, and third-party data processing contracts) cannot be verified by scanning the codebase alone. These items are noted as manual verification checks for developers.

---

## 🇪🇺 1. General Data Protection Regulation (GDPR)

### 1.1 Right to Erasure / "Right to be Forgotten" (Article 17)
- [ ] Implement database deletion routines that permanently delete or fully anonymize user records upon request.
- [ ] Ensure user deletion cascades to all auxiliary tables, session caches, and backup storage layers (within statutory backup retention windows).
- [ ] If data is shared with third-party processors, verify that API endpoints are configured to dispatch deletion requests to downstream processors.

### 1.2 Right to Data Portability (Article 20)
- [ ] Provide an endpoint or utility that gathers and exports all of a user's personal data in a structured, commonly used, and machine-readable format (e.g. JSON or CSV).

### 1.3 Security of Processing & PII Protection (Article 32)
- [ ] Encrypt all personally identifiable information (PII) at rest using AES-256 (e.g. database columns for email, phone, name).
- [ ] Mask, redact, or hash PII before writing logs to stdout or disk. (Never log passwords, raw session tokens, IP addresses, or emails).
- [ ] Secure all transit of PII using TLS 1.2 or TLS 1.3.

---

## 🇺🇸 2. California Consumer Privacy Act (CCPA / CPRA)

### 2.1 Consumer Rights (Opt-Out, Access, Deletion)
- [ ] Provide route templates for processing data deletion and access requests (similar to GDPR portability).
- [ ] *Manual Verification:* Confirm the website/app displays a visible "Do Not Sell or Share My Personal Information" link or setting.

### 2.2 Sensitive Personal Information (SPI) Controls
- [ ] Identify and flag fields holding SPI (e.g., driver's license, precise geolocation, race, health info, SSN).
- [ ] Enforce strict storage access limits and shorter data retention policies on SPI.

---

## 3. Children's Online Privacy Protection Act (COPPA)

### 3.1 Age Verification & Parental Consent
- [ ] *Manual Verification:* Confirm the app utilizes an age-gate workflow to verify if users are under 13 before collecting any data.
- [ ] *Manual Verification:* Ensure a verifiable parental consent mechanism is in place before allowing child accounts to activate.

### 3.2 Data Minimization & Retention
- [ ] Ensure no geolocation data or persistent identifiers (like device IDs or advertising IDs) are collected from children under 13 unless strictly necessary for core function. If collected, document:
 - The specific data and circumstances of collection.
 - The technical justification for why it is necessary for core function.
 - The decision owner, date, and re-evaluation frequency.
- [ ] Enforce automatic data deletion routines that purge children's account data after a period of inactivity.
