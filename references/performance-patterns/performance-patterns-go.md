# Go Performance Patterns

This document defines performance optimization patterns and standards for Go applications.

---

## 1. Profiling & Diagnostics
* **pprof**: Use Go's built-in `net/http/pprof` runtime profiler to analyze CPU bottlenecks, heap allocations, and mutex/goroutine blocks.
  ```go
  import _ "net/http/pprof"
  go func() {
      log.Println(http.ListenAndServe("localhost:6060", nil))
  }()
  ```
  Run analysis: `go tool pprof http://localhost:6060/debug/pprof/profile`

---

## 2. Memory Allocation Optimization
* **sync.Pool**: Avoid garbage collection (GC) sweeps by reusing temporary objects, especially byte buffers or frequently allocated structs.
  ```go
  var bufPool = sync.Pool{
      New: func() interface{} {
          return new(bytes.Buffer)
      },
  }
  ```
* **Pre-allocating Slices & Maps**: Always specify capacity hints when length is known to prevent slice doubling and map resizing re-allocations.
  ```go
  users := make([]User, 0, expectedCount)
  cache := make(map[string]Item, expectedCount)
  ```

---

## 3. Concurrency Optimization
* **Goroutine Throttling**: Avoid goroutine leaks or runaway scheduling overheads by using worker pools or buffered channels as semaphores.
  ```go
  sem := make(chan struct{}, maxWorkers)
  for _, job := range jobs {
      sem <- struct{}{}
      go func(j Job) {
          defer func() { <-sem }()
          process(j)
      }(job)
  }
  ```

---

## 4. Compiler Escape Analysis
* **Stack vs. Heap**: Minimize heap allocations by avoiding pointers for small structs (pass by value is cheaper and keeps variables stack-allocated).
* Analyze escapes: `go build -gcflags="-m"` to verify that variables do not escape to the heap.
