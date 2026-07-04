# Apache Cassandra & ScyllaDB Guidelines & Practices

These guidelines provide recommendations for auditing Cassandra/ScyllaDB wide-column store schemas, query patterns, and cluster-read safety.

---

## 1. Partition Key Cohesion & Wide Partitions
Cassandra tables require strict partition boundaries to avoid loading excessive rows into memory during node fetches.

*   **Partition Key Resolution:**
    *   *Issue:* If a partition grows too large (e.g. over 100MB or containing > 100,000 rows), reads from that partition will cause garbage collection pauses and latency spikes.
    *   *Practice:* Ensure partition keys are designed with high-cardinality components. Split wide partitions by adding a bucketing column (e.g., date or shard id) to the partition key.

---

## 2. Query Safety & Filtering
*   **Query by Partition Key:**
    *   *Practice:* Every query MUST match on the partition key columns. Querying without partition keys triggers a full-cluster scan, contacting all nodes in the cluster.
*   **Allow Filtering Prevention:**
    *   *Issue:* Using `ALLOW FILTERING` forces the coordinator node to scan data across all nodes and filter it in memory, resulting in unpredictable execution latency.
    *   *Practice:* Avoid using `ALLOW FILTERING` in production codepaths. Instead, model separate query tables (materialized views or manual dual-write tables) that align with specific read requirements.
