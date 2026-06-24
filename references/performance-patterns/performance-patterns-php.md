# PHP Performance Patterns

This document defines performance optimization patterns and standards for PHP applications.

---

## 1. Runtime OPcache & Preloading
* **OPcache JIT**: Enable OPcache and JIT compilation (PHP 8+) in production configuration scripts to compile PHP code into CPU instructions.
  - Recommended `php.ini`:
    ```ini
    opcache.enable=1
    opcache.jit_buffer_size=100M
    opcache.jit=tracing
    ```
* **Preloading**: Define an opcache preload script (`opcache.preload`) to load critical framework files into memory on server startup, bypassing compile checks on subsequent requests.

---

## 2. ORM & Query Performance
* **N+1 Query Avoidance**: Eager load database relations in framework ORMs (Laravel Eloquent, Doctrine) to prevent execution of duplicate database queries.
  ```php
  // Eager load posts with user relation
  $posts = Post::with('user')->get();
  ```
* **Read-only Queries**: Disable object transformation states for raw data fetches where models are not modified.

---

## 3. String & Native Optimizations
* **Native Functions**: Favor PHP native functions over user-defined implementations (e.g. `array_map` vs manual loops, `strpos` vs regex checks).
* **Strict Types**: Declare strict types to prevent runtime type conversion and enable code optimization.
  ```php
  declare(strict_types=1);
  ```
