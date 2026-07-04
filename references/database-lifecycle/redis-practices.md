# Redis Cache & Storage Guidelines & Practices

These guidelines provide recommendations for auditing Redis key-value structures, memory policies, and query commands in a codebase.

---

## 1. Thread-blocking Command Mitigations
Redis is single-threaded for command execution. High-complexity commands can block the event loop, causing timeouts across all connected clients.

*   **Key Iteration Commands:**
    *   *Issue:* Using the `KEYS` command searches all keys in the database in a blocking, synchronous scan.
    *   *Practice:* Use `SCAN` instead of `KEYS`. `SCAN` provides a cursor-based, non-blocking iteration.
*   **Large Collection Operations:**
    *   *Issue:* Executing commands with $O(N)$ complexity on very large sets/hashes (e.g. calling `HGETALL`, `SMEMBERS`, or `LRANGE` on collections with thousands of elements) can block the database.
    *   *Practice:* Restrict collection sizes, or use pagination/streaming commands (like `HSCAN` or `SSCAN`) to query data in chunks.

---

## 2. Memory Management & Lifecycle Rules
*   **Explicit Expiration (TTL):**
    *   *Practice:* Set an explicit Time-To-Live (TTL) or expiration window for all cache keys to prevent memory exhaustion over time.
*   **Connection Lifecycle:**
    *   *Practice:* Re-use connection clients (connection pools) instead of instantiating new Redis connections per request. Close connections gracefully during application shutdown.
*   **Key Namespace Organization:**
    *   *Practice:* Structure keys using logical namespaces delimited by colons (e.g., `app:user:1024:profile`) to optimize scanning and monitoring.
