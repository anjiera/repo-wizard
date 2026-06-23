# Shell & Bash Performance Patterns

This document defines performance optimization patterns and standards for shell scripts.

---

## 1. Minimizing Subprocess Spawning
* **Built-in Functions**: Favor bash/sh shell built-in commands over external executables. Every call to an external tool (e.g. `grep`, `sed`, `awk`, `cut`) spawns a child process, which adds significant overhead when run inside loops.
  - Slow (spawns 2 processes per iteration):
    ```bash
    for line in $(cat file.txt); do
        val=$(echo "$line" | cut -d',' -f2)
    done
    ```
  - Fast (uses built-in parameter expansion):
    ```bash
    while IFS=',' read -r col1 col2 col3; do
        val="$col2"
    done < file.txt
    ```

---

## 2. File Reading & Streaming
* **Line-by-Line Processing**: Stream files using redirects and `read` blocks rather than loading full files into variables, which can exhaust shell heap limits.
  ```bash
  while read -r line; do
      process "$line"
  done < logs.txt
  ```

---

## 3. Caching Output States
* **Command Output Caching**: Cache outputs of commands inside variables if the command is run repeatedly (e.g., date, hostname, git status).
  - Recommended:
    ```bash
    CURRENT_HOST=$(hostname)
    for i in {1..100}; do
        log_msg "running on $CURRENT_HOST"
    done
    ```
* **Directory Sweeps**: Avoid duplicate `find` sweeps by executing a single sweep and caching path arrays.
