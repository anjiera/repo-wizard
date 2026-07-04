# SQLite Storage Guidelines & Practices

These guidelines provide recommendations for auditing SQLite usage in local files, embedded systems, and prototype environments.

---

## 1. Write Concurrency & Lock Escalations
SQLite operates with database-level locking for writes. Only one write process can modify the database file at any given time.

*   **WAL Mode Activation:**
    *   *Issue:* In default rollback journal mode, writing locks the entire database, preventing other processes from reading.
    *   *Practice:* Enable Write-Ahead Logging (WAL) mode (e.g. `PRAGMA journal_mode=WAL;`). WAL mode allows multiple readers to read concurrently while a writer is active.
*   **Busy Timeout Management:**
    *   *Practice:* Configure an explicit busy timeout (e.g. `PRAGMA busy_timeout = 5000;`) on all connection clients. This causes SQLite to wait and retry obtaining a lock for the specified duration before throwing a database locked exception.

---

## 2. File and Connection Management
*   **Local File Paths:**
    *   *Practice:* Avoid storing the SQLite database file inside temporary system folders (e.g. `/tmp`) which are automatically purged. Use designated relative directories within the application workspace.
*   **Single Connection Pools in WAL:**
    *   *Practice:* Re-use connection instances. Avoid opening and closing connections frequently, which incurs filesystem I/O costs.
