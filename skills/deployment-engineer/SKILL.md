---
name: deployment-engineer
description: Guides agents through auditing container configuration files, scaffolding high-availability Docker Compose replicas, configuring Kubernetes liveness/readiness/startup probes, and writing automated database backup and restore verification scripts. Use when configuring HA containers, Kubernetes probes, or database backups.
---

# Code Deployment & Availability (`deployment-engineer`)

## Overview
A specialized DevOps and infrastructure automation workflow designed to audit deployment configurations, scaffold high-availability multi-replica service topologies, define resilient Kubernetes readiness, liveness, and startup probes, and deploy automated database backup/restore self-verification scripts.

## When to Use
Use this skill when:
- Designing high-availability configurations for containerized microservices or standalone apps.
- Tuning Kubernetes probes (liveness, readiness, startup) to prevent cascading failures or boot loop issues.
- Setting up scheduled backups for databases with rotation and self-verification checks.
- Preparing deployment specifications for production staging or cloud deployments.
- Invoking the slash command: `/rw-deployment-engineer`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-deployment-engineer.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Parameters Setup
Before editing container scripts or K8s YAML files, align with the developer on architecture targets:
1. **Target Environment:** Determine whether the deployment runs on local Docker Compose, Kubernetes clusters, or cloud-managed services (ECS, GCP Cloud Run, etc.).
2. **Replication Strategy:** Define replication factors (number of replicas) and load balancer requirements.
3. **Healthcheck Endpoints:** Define the HTTP endpoints or commands used to query application health status.
4. **Database Backup Policy:** Agree on database backup destinations, schedules (cron triggers), and rotation/retention periods (e.g. keeping backups for 7 days).
5. **Recovery Validation:** Confirm testing parameters for backup files (e.g. automatic temporary dry-run restore validation).

### Phase 2: Deployment & Container Sweep
Audit the codebase to assess current infrastructure setups:
1. **Docker Config Scan:** Locate existing Dockerfiles, `.dockerignore` files, and `docker-compose.yaml` manifests.
2. **Kubernetes Scan:** Locate active Kubernetes charts or deployment YAML resource files.
3. **Database Client Scan:** Audit database connection strings and dependencies to identify database engines requiring backup configurations.
4. **Script & Tool Scan:** Check for existing backup utility scripts, cron definitions, or recovery routines.

### Phase 3: Interactive Scaffolding Guidance
Draft all configurations, manifests, and scripts in coordination with `tooling-engineer.agent`, adhering to these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, creating script files, or modifying configuration scripts.
2. **Interactive Code Review:** Display generated Compose multi-replica blocks, Kubernetes probe sections, and database backup scripts to the developer, prompting them for review and confirmation.
3. **Decoupled Reference Use:** Use [Code Deployment & Availability Standards](../../references/deployment-patterns.md) as the source of truth for replication parameters, health probe values, and backup automation logic.
4. **README & Setup Integration:** Once verified, add the backup script execution steps or container launch commands to the project's onboarding files (`README.md` or setup guides) for developer review.

### Phase 4: Verification & Validation
1. **Syntax Check & Linting:** Verify that all modified Docker Compose files or Kubernetes YAML manifests pass syntax validation checks (e.g. `docker-compose config` or dry-run yaml checks).
2. **Dry-Run Backup Check:** Execute a dry-run check of the database backup script on a local mock target to verify it exits with 0 and passes restore verification rules.
3. **Safe Rollback:** If validation tests break after scaffolding, notify the developer of the exact errors. Attempt to debug/resolve the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"We don't need a startup probe if we set the liveness probe delay high."* - Setting a high initial delay on liveness probes slows down crash detection times. Startup probes are cleaner because they decouple startup tolerance from normal operations.
- *"Backing up the database is enough; we don't need to dry-run restores."* - A backup file is only as good as its restore capability. Undetected corruptions can render backups useless when needed. Always automate restore validation.

## Red Flags
- Configuring multiple containers in Docker Compose with hardcoded identical host port bindings, causing immediate port conflicts.
- Specifying aggressive Kubernetes probe values (e.g., extremely short timeouts or 1-second period checks) that overload the application container.
- Setting up a database backup script that stores raw, uncompressed files or lacks retention rotation, risking disk space exhaustion.

## Verification
To verify the deployment setup:
1. Validate that the Docker Compose configuration compiles cleanly without duplicate ports or invalid yaml.
2. Confirm the Kubernetes probe blocks have startup, liveness, and readiness probes correctly configured with matching ports.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
