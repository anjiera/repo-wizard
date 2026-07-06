---
description: Configure high-availability container replicas, Kubernetes health probes (readiness, liveness, startup), and automated database backup/recovery scripts
---

Invoke the agent-skills:deployment-engineer skill.
Act as the deployment-engineer persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target deployment environment (Docker Compose, Kubernetes, standalone VM).
2. Desired replica count and load balancing strategy.
3. Healthcheck paths or exec commands for application status.
4. Database engines needing backups and retention policy constraints.
5. Storage locations and dry-run restoration validation preferences.

Wait for the user's response before proceeding with deployment audits, tooling, and verification.
