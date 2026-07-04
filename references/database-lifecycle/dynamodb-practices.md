# Amazon DynamoDB Guidelines & Practices

These guidelines provide recommendations for auditing DynamoDB NoSQL database access patterns, single-table designs, and read/write throughput efficiency.

---

## 1. Single-Table Schema & Partition Key Design
DynamoDB scales horizontally based on its partition keys. Uneven partition access creates "hot keys" that throttle execution.

*   **Partition Key Uniformity:**
    *   *Issue:* Selecting a low-cardinality attribute (e.g., status, gender, or year) as the Partition Key (PK) leads to uneven data distribution.
    *   *Practice:* Use high-cardinality attributes (e.g., `userId`, `orderId`) as partition keys to distribute throughput across storage partitions.
*   **Single-Table Design Clarity:**
    *   *Practice:* When implementing Single-Table Design patterns, document entity type mapping prefixes (e.g. `USER#1024`, `METADATA#`) clearly to maintain readability in query builders.

---

## 2. Throughput Efficiency & Scan Avoidance
*   **Scan vs. Query Operations:**
    *   *Issue:* The `Scan` operation reads every item in the table, consuming high Read Capacity Units (RCUs) and degrading performance as the table grows.
    *   *Practice:* Avoid using `Scan` in user-facing query code. Prioritize `Query` operations on primary keys or Global Secondary Indexes (GSIs).
*   **Projection Expressions:**
    *   *Practice:* Use projection expressions to retrieve only the required attributes instead of downloading entire documents, reducing RCU consumption.
*   **Point-in-Time Recovery (PITR):**
    *   *Practice:* Configure Point-in-Time Recovery settings in IaC (Infrastructure as Code) templates to enable continuous database backups.
