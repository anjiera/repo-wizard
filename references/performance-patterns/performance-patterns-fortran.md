# FORTRAN Performance Patterns

This document defines performance optimization patterns and standards for FORTRAN engineering applications.

---

## 1. Column-Major Memory Traversal
* **Column-Major Array Traversal**: FORTRAN stores multi-dimensional arrays in column-major order (elements along the first index are contiguous). Always nest loop bounds so that the first index changes in the innermost loop.
  - Recommended (Column-major iteration maximizes cache hits):
    ```fortran
    do j = 1, cols
        do i = 1, rows
            matrix(i, j) = matrix(i, j) * 2.0
        end do
    end do
    ```

---

## 2. Vectorization Directives
* **SIMD Instructions**: Guide compiler vectorization (SSE, AVX instructions) using compiler directive flags before heavy array loops.
  ```fortran
  !DIR$ VECTOR ALWAYS
  do i = 1, N
      results(i) = a(i) + b(i)
  end do
  ```

---

## 3. Zero-Copy Array Slices
* **Array Slicing**: Minimize temporary array copies when passing matrix sections. Use dummy array pointers or explicit slices when possible.
* **Implicit Allocation Limits**: Avoid dynamic array resizing or allocation within numerical computing loops. Pre-allocate arrays before performance-critical blocks.
