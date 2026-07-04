# MySQL Database Lifecycle Guidelines & Practices

These guidelines provide recommendations for auditing MySQL schemas, index usage, and online schema migrations.

---

## 1. Migration Locking & DDL Guidelines
*   **Online Schema Changes (OSC):**
    *   *Issue:* Direct DDL changes (e.g. `ALTER TABLE`) can block table reads/writes, especially on large tables under heavy workloads.
    *   *Practice:* Use toolchains designed for online schema modifications (such as `gh-ost` or `pt-online-schema-change`) to run changes incrementally without blocking the active tables.
*   **Foreign Key Constraint Constraints:**
    *   *Issue:* MySQL InnoDB can lock referencing tables during foreign key updates.
    *   *Practice:* Validate that foreign key references are backed by indexes on both child and parent tables to prevent full-table scans.

---

## 2. Lock Minimization & Engine Settings
*   **Gap Locking Prevention:**
    *   *Issue:* InnoDB uses gap locking for queries with unindexed ranges or conditional filters, locking adjacent rows and causing deadlock situations.
    *   *Practice:* Run all transactional mutations (`UPDATE`, `DELETE`) using primary keys or unique index matches to limit lock scope.
*   **Explicit Transaction Scopes:**
    *   *Practice:* Keep transaction scopes as small as possible. Avoid mixing external network calls or long computations inside transactional blocks, which prolongs table lock durations.
