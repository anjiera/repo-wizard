# PostgreSQL Database Lifecycle Guidelines & Practices

These guidelines provide recommendations for auditing PostgreSQL database schema changes, migrations, and query patterns in a codebase. They focus on minimizing table locks and optimizing search efficiency.

---

## 1. Schema Migration & Locking Guidelines
PostgreSQL uses access exclusive locks for many DDL (Data Definition Language) operations, which blocks all reads and writes on the target table.

*   **Adding Columns with Defaults:**
    *   *Issue:* In older PostgreSQL versions (pre-11), adding a column with a default value forces a rewrite of the entire table, causing long locks.
    *   *Practice:* Split the operation into three steps:
        1. Add the column without a default.
        2. Set the default value for new rows.
        3. Backfill existing rows in small batches (e.g. 5,000 rows at a time with a short sleep between batches).
*   **Adding Foreign Key Constraints:**
    *   *Issue:* Adding a foreign key constraint blocks writes on both the referenced and referencing tables while validating existing data.
    *   *Practice:* Add the foreign key using `NOT VALID`, then validate it in a separate transaction using `VALIDATE CONSTRAINT` to reduce lock duration.
*   **Creating Indexes:**
    *   *Issue:* Standard `CREATE INDEX` locks the table against writes during index build.
    *   *Practice:* Use `CREATE INDEX CONCURRENTLY` in migration scripts. Avoid running concurrent index creations inside transactional block scripts.

---

## 2. Query Optimization & Indexing Patterns
*   **Foreign Key Indexing:**
    *   *Practice:* Ensure every foreign key column is indexed. PostgreSQL does not automatically index foreign keys, which can lead to table scans during joins or parent-table row deletions.
*   **Sequential Scan Minimization:**
    *   *Practice:* Audit queries inside repositories to check that conditional expressions in `WHERE` clauses match active indexing strategies (B-Tree, GIN, BRIN).
*   **Lock Timeout Configurations:**
    *   *Practice:* Set explicit session-level parameters (e.g. `SET lock_timeout = '2s'`) inside migration scripts to prevent migration runs from waiting indefinitely on locks, which blocks subsequent client requests.
