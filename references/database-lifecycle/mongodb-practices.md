# MongoDB Database Lifecycle Guidelines & Practices

These guidelines provide recommendations for auditing MongoDB database document structures, indexing strategies, and query patterns.

---

## 1. Indexing & Collection Sweep Prevention
Without proper index coverage, MongoDB runs collection scans (`COLLSCAN`), loading every document into memory to evaluate the query.

*   **Queries, Sorts, and Projections:**
    *   *Practice:* Match query filters with indexes using the Equality, Sort, Range (ESR) rule:
        1. Equality fields first in compound indexes.
        2. Sort fields second.
        3. Range/Inequality fields last.
*   **Unique Index Validation:**
    *   *Practice:* Enforce uniqueness at the database layer using unique indexes (e.g. `{ email: 1 }, { unique: true }`) rather than relying solely on application-level checks, which are susceptible to race conditions.

---

## 2. Document Modeling & Schema Validation
*   **Unbounded Array Growth:**
    *   *Issue:* Embedding arrays inside documents that grow without limit (e.g., storing all transaction logs inside a single user document) can lead to document size limit violations (16MB BSON limit) and performance degradation.
    *   *Practice:* Avoid deep nesting of growing arrays. Use a separate collection for sub-elements with a parent reference when the relationship is one-to-many and unbounded.
*   **Schema Validation Drift:**
    *   *Practice:* Explicitly configure validator schemas on collections using JSON Schema validation rules. Keep application-level ORM schemas (like Mongoose models) synchronized with database-level validation definitions.
