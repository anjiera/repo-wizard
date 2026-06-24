# Common Lisp & Scheme Performance Patterns

This document defines performance optimization patterns and standards for Lisp applications.

---

## 1. Tail-Call Optimization (TCO)
* **TCO Compilation**: Ensure tail recursion loops place recursive calls in the tail position, and configure compiler flags (e.g., `(declare (optimize (speed 3) (safety 0) (debug 0)))` in Common Lisp) to enable the compiler to perform tail-call optimization, reclaiming stack frames.

---

## 2. Macro Pre-compilation
* **Avoid Eval**: Never use `eval` or dynamically construct code strings in loops. Pre-compile code using macros to shift binding and structure generation to compile-time.

---

## 3. Allocation & Garbage Collection Safety
* **Dynamic Scoping**: Avoid global dynamic scoping variables (`defparameter` or `defvar`) in loops, as thread-local lookup and binding tables introduce overhead.
* **Static Arrays**: Allocate static arrays (`make-array` with `:adjustable nil` and specialized type declarations) to avoid heap allocation.
  ```lisp
  (make-array 1000 :element-type 'double-float :initial-element 0.0d0)
  ```
* **GC Controls**: Use local declaration type assertions to help the compiler optimize memory layouts:
  ```lisp
  (declare (type double-float x))
  ```
