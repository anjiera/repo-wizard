# Python Performance Patterns

This document defines performance optimization patterns and standards for Python applications.

---

## 1. Memory Consumption & Object Overheads
* **Generators**: Use generator expressions or `yield` to stream large datasets (e.g. log lines, database rows) instead of loading them in-memory via lists.
  ```python
  def read_logs(filepath):
      with open(filepath, 'r') as f:
          for line in f:
              yield line
  ```
* **slots**: Prevent dynamic dictionary allocation overheads for custom class instances by defining `__slots__`.
  ```python
  class User:
      __slots__ = ['id', 'name']
      def __init__(self, id, name):
          self.id = id
          self.name = name
  ```

---

## 2. Fast Built-ins & Vectorization
* **List Comprehensions**: Use list comprehensions or built-in functions (`map`, `filter`) which are compiled in C, rather than manual `for` loops.
* **Native C-Extensions**: Utilize high-performance compiled libraries (e.g., `numpy` for arrays, `orjson` for JSON parsing, `uvloop` for asyncio) for CPU-heavy tasks.

---

## 3. Concurrency & GIL Workarounds
* **multiprocessing**: Python's Global Interpreter Lock (GIL) limits multi-threaded CPU execution. Offload CPU-bound workloads to `multiprocessing` worker pools rather than using standard `threading`.
  ```python
  from multiprocessing import Pool
  with Pool() as pool:
      results = pool.map(expensive_calc, data)
  ```
* **asyncio**: Use `asyncio` for I/O-bound concurrency (fetching APIs, querying databases) to prevent blocking the main process loop.
