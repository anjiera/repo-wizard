---
name: database-lifecycle-auditor
description: Guides agents through auditing codebase files and configurations for database migrations, schemas, queries, and connection practices based on inferred stacks. Use when scanning repositories for database performance, indexing, and migration risks.
---

# Database Lifecycle Auditor

## Overview
A language-neutral engineering audit workflow designed to evaluate the performance patterns, schema migration risks, indexing strategies, and database connection logic in a codebase. It dynamic resolves specific practice files (`<database>-practices.md`) depending on the database stack in use, and recommends appropriate database linters or actionable backlog items.

---

## When to Use

### Triggering Conditions
* Reviewing database migration scripts, SQL files, or ORM models.
* Setting up index validation or checking query performance.
* Setting up database schema linters or dry-run migration validators.
* Invaluable when looking for transaction locks, blocking cache calls, or open serverless connections.

### When NOT to Use
* Writing application business logic files or running database migrations against production.
* Modifying configuration files directly without developer approval.

---

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-database-lifecycle-auditor.md` under Phase 3 / Phase 4.

### Phase 1: Context & Profile Identification
Read the contract metadata (`task_metadata` from `manifest.json`) or session settings to extract:
1. **Target Database Stack:** Identify which database engines (PostgreSQL, MongoDB, Redis, MySQL, SQLite, Supabase, Firestore, DynamoDB, Cassandra) are referenced.
2. **Practices File Resolution:** Load the corresponding reference guidelines file from the `references/database-lifecycle/` directory (e.g. `postgres-practices.md`, `supabase-practices.md`).

### Phase 2: Scanning & Heuristic Audit
Inspect the codebase files recursively. Look for:

1. **SQL Databases (Postgres, MySQL, SQLite):**
   - High-risk migration patterns (table-locking defaults, concurrent index omission).
   - gap locking, index utilization on foreign keys.
2. **NoSQL & Cloud Databases (MongoDB, Firestore, DynamoDB, Cassandra):**
   - Collection/table sweeps, single-table mapping prefix consistency.
   - subcollection nesting, security rules access controls (Firestore).
3. **Caching & Key-Value (Redis):**
   - Event-loop blocking queries (e.g., using `KEYS` instead of `SCAN`).
   - Time-to-Live (TTL) configuration on cache keys, client connection pool reuse.
4. **Serverless & BaaS (Supabase):**
   - Row-Level Security (RLS) rules activation, service role bypasses.

### Phase 3: Reporting & Backlog Synthesis
- Save the proposed tooling contract to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/contracts/database-lifecycle-auditor-contract.json`.

For every issue found:
1. State the file name, location, and database engine type.
2. Detail the query or locking risk (e.g., blocking thread loop, table rewrite lock).
3. Suggest a specific refactoring pattern or config update (e.g. *Create Index Concurrently*, *Use SCAN command*, *Enable Row-Level Security*).

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "A linter command like squawk isn't needed if the SQL looks simple." | Simple migration statements (like adding defaults or indexes) can lock the table on large production datasets. |
| "I should automatically execute the SQL migration changes." | Database audits are strictly advisory; direct database modifications are unsafe without DBA/developer reviews. |

---

## Red Flags
* Recommending SQL index strategies on NoSQL document databases or vice-versa.
* Proposing modifications to production database tables or writing backend migration scripts directly.

---

## Verification

After executing the workflow, verify:
- [ ] Confirmed the active database engine stack and loaded the correct `<database>-practices.md` reference checklist.
- [ ] Checked for table-locking migrations, blocking commands, and index utilization.
- [ ] Generated observations and contract files in the correct directories under `.repo-wizard/reports/`.
- [ ] Suggestions are strictly advisory.
