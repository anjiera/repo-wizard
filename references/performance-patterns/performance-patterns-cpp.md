# C++ Performance Patterns

This document defines performance optimization patterns and standards for C++ applications.

---

## 1. Cache Locality & Memory Alignment
* **Cache Line Alignment**: Align performance-critical variables or structures to CPU cache line boundaries (typically 64 bytes) to avoid false sharing.
  ```cpp
  struct alignas(64) HotData {
      uint64_t counter;
  };
  ```
* **Array Layouts**: Use Structure-of-Arrays (SoA) instead of Array-of-Structures (AoS) to enable SIMD vectorization and sequential cache reads.
  ```cpp
  struct ParticleSoA {
      std::vector<float> x, y, z; // SoA
  };
  ```

---

## 2. Zero Heap Allocation
* **Stack Allocations**: Pin small buffers on the stack using `std::array` instead of dynamically allocating `std::vector`.
  ```cpp
  std::array<int, 1024> buffer; // stack allocated
  ```
* **Custom Allocators**: Use pool or arena allocators for high-frequency allocation loops.

---

## 3. Compiler Optimizations
* **constexpr**: Shift calculations to compile-time wherever possible.
  ```cpp
  constexpr int fib(int n) {
      return (n <= 1) ? n : fib(n - 1) + fib(n - 2);
  }
  ```
* **Loop Unrolling**: Guide compilation optimizations via compiler pragma decorators.
  ```cpp
  #pragma unroll
  for (int i = 0; i < 4; ++i) {
      process(i);
  }
  ```
