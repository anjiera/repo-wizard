# JVM (Java/Kotlin) Performance Patterns

This document defines performance optimization patterns and standards for JVM-based applications.

---

## 1. Garbage Collection (GC) & Memory Tuning
* **GC Configurations**: Configure G1GC (default for modern JVMs) or ZGC (ultra-low latency, <1ms pauses) based on latency constraints.
  - Command line flags: `-XX:+UseG1GC` or `-XX:+UseZGC`
* **Primitive Box Avoidance**: Avoid using wrapper objects (e.g. `Integer`, `Double`) inside collections or loops. Use primitive arrays or specialized primitive collections (like Trove or Eclipse Collections) to avoid heap allocation overheads.

---

## 2. JIT Compiler Inlining & Escape Analysis
* **Escape Analysis**: Ensure local variables are stack-allocated rather than heap-allocated by restricting dynamic pointer assignments.
* **Inline Directives (Kotlin)**: Use Kotlin's `inline` functions for high-order function definitions to eliminate closure creation and memory allocation overhead.
  ```kotlin
  inline fun <T> measure(block: () -> T): T {
      val start = System.nanoTime()
      val result = block()
      println("Time: ${System.nanoTime() - start}ns")
      return result
  }
  ```

---

## 3. Thread Concurrency & Virtual Threads
* **Virtual Threads (Project Loom)**: Use Virtual Threads (Java 21+) for high-throughput, blocking I/O applications. Avoid creating legacy heavy threads.
  ```java
  try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      executor.submit(() -> processRequest(req));
  }
  ```
* **Lock Contention**: Minimize sync locks using `ReentrantLock` or lock-free atomics (`VarHandle`, `AtomicInteger`) in highly concurrent contexts.
