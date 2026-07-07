---
name: data-pipeline-architect
description: Identifies ways to untangle data pipelines and optimize database connection pools.
---

# Data Pipeline & Quality Governance (`data-pipeline-architect`)

## Overview
A specialized data engineering and validation workflow designed to audit database connection properties and data scripts, tool strict schemas (Pandera, Great Expectations), configure scheduled workflow DAGs with fail-soft retry limits (Airflow, Prefect, Dagster), and optimize database connection pool parameters.

## When to Use
Use this skill when:
- Designing ETL, data ingestion, or bulk synchronization pipelines.
- Adding data quality controls (Pandera schemas, Great Expectations validation rules) to ingest boundaries.
- Setting up workflow orchestrator scripts (Airflow DAGs, Prefect deployments, Dagster schedules).
- Configuring database connection engines and pool thresholds to prevent socket exhaustion.
- Invoking the slash command: `/rw-data-pipeline-architect`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-data-pipeline-architect.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Strategy Setup
Before writing scripts or orchestrations, align with the developer on data strategies:
1. **Target Orchestrator:** Identify the preferred scheduling or workflow tool (Airflow, Prefect, Dagster, cron).
2. **Schema Drift Tolerance:** Define action steps when column formats or values drift (e.g. failing the pipeline vs. loading into quarantine tables).
3. **Retry Parameters:** Establish task retry counts, exponential backoff factors, and max limits.
4. **Database Engine & Pools:** Define database drivers and connection limits (e.g., maximum active clients, idle connection timeouts).
5. **Alerting Channels:** Agree on notifications channels (email, Slack, pager alerts) on pipeline task failures.

### Phase 2: Codebase Data Flow Scan
Audit the repository to locate database connections and data sync paths:
1. **Ingest Scripts Scan:** Locate python or node files importing files (CSV, JSON, XML), querying external APIs, or saving bulk data.
2. **Database Config Check:** Find database connection pool setups (e.g. SQLAlchemy, `pg` pools, raw DB connections).
3. **Workflow Config Check:** Search for existing DAG files, cron jobs, or scheduling configurations.
4. **Data Tools Audit:** Check manifested dependencies to identify existing data processing or validation packages.

### Phase 3: Interactive Tooling Guidance
Draft all specifications, DAG files, and scripts in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, creating DAG files, or modifying existing configuration scripts.
2. **Interactive Code Review:** Display generated Pandera schemas, Airflow DAG templates, or database connection pool engines to the developer, prompting them for review and confirmation.
3. **Decoupled Reference Use:** Use [Data Pipeline & Quality Standards](../../references/coding-standards/data-pipeline-standards.md) as the source of truth for validation rules, pooling parameters, and orchestrator configs.
4. **README & Setup Integration:** Once verified, add pipeline run instructions or scheduled trigger setups to the project's onboarding files (`README.md` or setup guides) for developer review.

### Phase 4: Verification & Validation
1. **Pipeline Syntax Validation:** Verify that all configured DAG scripts or schemas pass syntax validation checks (e.g. `airflow dags list` syntax checks or python compilation).
2. **Dry-Run Validation Check:** Execute a dry-run check of the Pandera validation logic with mock corrupted inputs to confirm it raises expected schema validation errors.
3. **Safe Rollback:** If validation tests break after tooling, notify the developer of the exact errors. Attempt to debug/resolve the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"We can just clean the data manually if a pipeline fails."* - Manual data scrubbing is slow, error-prone, and doesn't scale. Code-defined validations ensure data quality is checked continuously.
- *"We don't need connection pools if our script runs quickly."* - Under high-load, scripts opening/closing connections repeatedly will exhaust database socket allocations. Connection pooling recycles sockets safely.

## Red Flags
- Tooling a scheduled database backup or ingestion DAG that does not specify retry limits or exponential delay parameters.
- Writing raw ingestion scripts that load file data directly into SQL query builders without validating parameters, introducing SQL injection risks.
- Defining connection pools that set maximum connection limits higher than the target database server's active capacity threshold.

## Verification
To verify the data pipeline setup:
1. Confirm that the validation schemas flag corrupted mock data rows during test execution.
2. Verify that the orchestrator DAG script parses cleanly without importing syntax or import package errors.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
