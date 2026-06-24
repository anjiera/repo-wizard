# Rust Performance Patterns

This document defines performance optimization patterns and standards for Rust applications.

---

## 1. Async Task Efficiency
* **Blocking Operations**: Never perform long-running synchronous file I/O or CPU operations in an async executor block. Offload them to `tokio::task::spawn_blocking`.
  ```rust
  let result = task::spawn_blocking(move || {
      expensive_calculation()
  }).await?;
  ```
* **Lock Contention**: Replace standard synchronous `Mutex` or `RwLock` with lock-free atomics or Tokio's asynchronous locks in hot paths to avoid blocking executor threads.

---

## 2. Zero-Copy Operations
* **Serde Lifetime Borrowing**: Avoid heap allocation during serialization/deserialization by borrowing lifetimes directly from source inputs.
  ```rust
  #[derive(Deserialize)]
  struct User<'a> {
      name: &'a str, // references original string directly, no allocation
  }
  ```

---

## 3. Micro-benchmarking
* **Criterion.rs**: Run statistics-based CPU-cache-aware micro-benchmarks to profile loops and math routines.
  ```rust
  fn criterion_benchmark(c: &mut Criterion) {
      c.bench_function("my_fn", |b| b.iter(|| my_function()));
  }
  ```
  Run using `cargo bench`.

---

## 4. Build Profile Optimization
Optimize binary sizing and instructions in `Cargo.toml`:
```toml
[profile.release]
lto = true             # Link Time Optimization
codegen-units = 1      # Maximize compiler optimizations
panic = "abort"        # Limit backtrace binary bloat
```
