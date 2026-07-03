---
description: Configure database connection pooling, schema validations (Pandera, Great Expectations), and workflow orchestrator scripts (Airflow, Prefect, Dagster)
---

Invoke the agent-skills:data-pipeline-architect skill.
Act as the data-pipeline-architect-agent persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target database engine and connection pool specifications.
2. Preferred workflow orchestrator tool (Airflow, Prefect, Dagster).
3. Data validation libraries (Pandera, Great Expectations) and schema constraints.
4. Error-handling rules (retries, delay intervals, alerts channels) on pipeline task failure.
5. Ingest data structures and schema drift tolerances.

Wait for the user's response before proceeding with data pipeline audits, scaffolding, and verification.
