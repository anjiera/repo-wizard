---
description: Audit repository dependencies for vulnerability risks and license compliance, and scaffold SBOM and license auditing configurations
---

Invoke the agent-skills:supply-chain-auditor skill.
Act as the supply-chain-auditor persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Targeted dependency checkers and SBOM standards (Snyk, Dependabot, CycloneDX, SPDX, or none).
2. Third-party license compliance policy constraints (e.g. blocking GPL/AGPL copyleft packages).
3. Targeted execution pipelines (local pre-commit hook vs CI pipeline).

Wait for the user's response before proceeding with dependency/license audits and scaffolding configurations.
