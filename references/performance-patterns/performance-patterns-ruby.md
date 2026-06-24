# Ruby Performance Patterns

This document defines performance optimization patterns and standards for Ruby applications.

---

## 1. Garbage Collection (GC) Optimization
* **GC Environment Tuning**: Optimize heap allocations and frequency of GC runs in production environments by configuring environment parameters:
  - `RUBY_GC_HEAP_INIT_SLOTS=1000000`
  - `RUBY_GC_HEAP_FREE_SLOTS=50000`
* **Allocation Reduction**: Avoid object allocations inside frequently executed functions. Use static constants instead of re-instantiating hashes/arrays in loop boundaries.

---

## 2. String Allocation Prevention
* **frozen_string_literal**: Always define the frozen string literal magic comment at the top of every file to reuse identical string constants across execution scopes.
  ```ruby
  # frozen_string_literal: true
  def greet(name)
    "Hello, " + name
  end
  ```

---

## 3. Enumerator Performance
* **lazy**: Use lazy enumerators when performing computations or filters on large dataset arrays to avoid producing temporary intermediate collections.
  ```ruby
  processed = large_list.lazy.select { |x| x.active? }.map { |x| x.name }
  ```

---

## 4. Database Query Optimization
* **N+1 Query Resolution**: Resolve N+1 database bottlenecks by preload-associating query structures.
  ```ruby
  # ActiveRecord eager loading
  @articles = Article.includes(:author).all
  ```
