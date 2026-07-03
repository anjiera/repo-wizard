---
description: Audit repository for PII data handling and scaffold configurations for logging filters, column encryption, and data rights templates
---

Invoke the agent-skills:privacy-hardener skill.
Act as the privacy-hardener-agent persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target data privacy regulations (GDPR, CCPA/CPRA, COPPA, or general hardening).
2. If the application collects data from children under 13 years of age.
3. Database types, storage configurations, and active logging libraries.

Wait for the user's response before proceeding with codebase data audit, scaffolding suggestions, and security validation.
