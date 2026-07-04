---
description: Audit repository for security compliance controls (SOC 2, ISO 27001, FIPS) and scaffold static analysis, pre-commit, and logging configurations
---

Invoke the agent-skills:compliance-auditor skill.
Act as the compliance-auditor persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target compliance frameworks (SOC 2, ISO 27001, FIPS 140-2/3, or general hardening).
2. Infrastructure configuration profile and target cloud provider (AWS, GCP, Azure, etc.).
3. Cryptographic constraints (FIPS mode requirements).

Wait for the user's response before proceeding with codebase audit, scaffolding suggestions, and security validation.
