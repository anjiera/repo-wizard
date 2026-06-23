# Swift & iOS/macOS Performance Patterns

This document defines performance optimization patterns and standards for Swift development.

---

## 1. Copy-on-Write (COW) Memory Optimization
* **Value Semantics**: Swift arrays, dictionaries, and structures are value types that copy-on-write. Avoid mutating large collections repeatedly in loops, which triggers internal buffer copies.
* **Struct vs. Class**: Use `struct` for simple data containers to allocate memory on the stack and avoid ARC (Automatic Reference Counting) heap tracking.

---

## 2. Automatic Reference Counting (ARC) Safety
* **Weak & Unowned**: Prevent strong reference cycles (memory leaks) in closures and delegate assignments by capturing reference dependencies as `weak` or `unowned`.
  ```swift
  class ViewController {
      lazy var networkCall = { [weak self] in
          self?.updateUI()
      }
  }
  ```

---

## 3. Concurrency Thread Pooling
* **Swift Concurrency (Actors)**: Protect shared state with `actor` instead of custom locks, enabling the compiler to schedule tasks efficiently on the cooperative thread pool.
  ```swift
  actor Cache {
      private var store: [String: Data] = [:]
      func update(_ data: Data, for key: String) {
          store[key] = data
      }
  }
  ```
* ** cooperative thread pool**: Do not block threads inside Swift async functions using legacy blocking APIs (like `dispatch_semaphore_wait`).

---

## 4. Collection Operations
* **lazy**: Use lazy collections when performing multiple filtering/mapping operations to avoid generating intermediate arrays.
  ```swift
  let processed = items.lazy.filter { $0.isValid }.map { $0.name }
  ```
