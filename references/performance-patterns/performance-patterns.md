# Performance Benchmarking & Load Testing Standards

This document serves as the repository's source of truth for micro-benchmarking, HTTP load/stress testing, and CI/CD performance budget gates.

---

## 1. Local Micro-benchmarking Frameworks

Micro-benchmarking measures the execution time, throughput, and memory consumption of isolated functions or code paths.

### 1.1 Node.js (Tinybench)
Use `tinybench` for lightweight, modern Javascript/Typescript benchmarking.

```javascript
import { Suite } from 'tinybench';

const suite = new Suite({ time: 1000 }); // run each benchmark for 1000ms

suite
  .add('Array.prototype.map', () => {
    [1, 2, 3, 4, 5].map((x) => x * 2);
  })
  .add('For Loop Double', () => {
    const arr = [1, 2, 3, 4, 5];
    const len = arr.length;
    const res = new Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = arr[i] * 2;
    }
  });

await suite.run();
console.table(suite.table());
```

### 1.2 Python (pytest-benchmark)
Use `pytest-benchmark` to integrate benchmarking directly into Python's pytest suite.

```python
# test_performance.py
def double_list(arr):
    return [x * 2 for x in arr]

def test_double_list_performance(benchmark):
    # benchmark runs the target function multiple times and collects stats
    result = benchmark(double_list, list(range(1000)))
    assert len(result) == 1000
```
Run benchmarks using: `pytest --benchmark-only`

### 1.3 Rust (Criterion.rs)
Use `Criterion.rs` for statistics-driven, CPU-cache-aware micro-benchmarking.

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("fib 20", |b| b.iter(|| fibonacci(black_box(20))));
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```
Run using: `cargo bench`

### 1.4 Go (testing package)
Use Go's built-in testing library for CPU and memory allocation benchmarking.

```go
// main_test.go
package main

import "testing"

func BenchmarkFib20(b *testing.B) {
	// run the Fib function b.N times
	for i := 0; i < b.N; i++ {
		_ = Fib(20)
	}
}
```
Run using: `go test -bench=. -benchmem`

---

## 2. Load & Stress Testing Skeletons

Load testing validates system throughput, latency, and resource usage under simulated concurrent user traffic.

### 2.1 k6 (JavaScript/Go-engine Runner)
`k6` is the standard tool for writing maintainable, developer-friendly load test scripts.

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up to 20 virtual users (VUs)
    { duration: '1m', target: 20 },  // stay at 20 VUs
    { duration: '30s', target: 0 },  // ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // error rate must be below 1%
  },
};

export default function () {
  const res = http.get('http://localhost:8080/api/v1/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```
Run using: `k6 run load-test.js`

### 2.2 Autocannon (Node.js HTTP Benchmarker)
`autocannon` is a fast, programmatic HTTP load tester written in Node.js.

```javascript
// scripts/run-load-test.js
const autocannon = require('autocannon');

async function run() {
  const result = await autocannon({
    url: 'http://localhost:8080',
    connections: 10, // concurrent connections
    duration: 10,    // seconds to run test
    pipelining: 1
  });
  
  console.log(`Average Latency: ${result.latency.average} ms`);
  console.log(`Throughput (Requests/sec): ${result.requests.average}`);
  console.log(`Error count: ${result.errors}`);
}

run();
```

### 2.3 Locust (Python/Gevent Load Tester)
`Locust` supports user behavior simulation via Python code and offers a web interface.

```python
# locustfile.py
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5) # wait 1-5 seconds between tasks

    @task
    def view_items(self):
        self.client.get("/api/v1/items")

    @task(3) # runs 3 times more frequently
    def health_check(self):
        self.client.get("/api/v1/health")
```
Run using: `locust -f locustfile.py --headless -u 100 -r 10 -t 1m --host=http://localhost:8080`

---

## 3. CI Performance Budget Gates

To prevent code performance regressions, repositories can enforce thresholds in pre-commit hooks or CI/CD pipelines.

### 3.1 Pre-Commit Execution Budgets
For critical performance files, set up a hook that checks performance metrics.

Example Hook script:
```bash
#!/usr/bin/env bash
# .git/hooks/pre-push or CI step
set -euo pipefail

echo "Running regression benchmark tests..."
# Run benchmarks and extract execution time
AVG_LATENCY=$(node scripts/run-load-test.js | grep -oE "Average Latency: [0-9.]+" | awk '{print $3}')

# Assert average latency is below budget threshold (e.g. 50ms)
MAX_BUDGET=50
if (( $(echo "$AVG_LATENCY > $MAX_BUDGET" | bc -l) )); then
  echo "ERROR: Performance regression detected! Average latency is ${AVG_LATENCY}ms (budget: ${MAX_BUDGET}ms)."
  exit 1
fi
echo "Performance is within budget constraints."
```

### 3.2 Performance Budget JSON Specifications
Maintain a budget configuration file (`configs/performance-budget.json`):

```json
{
  "api_gates": {
    "/api/v1/health": {
      "max_p95_latency_ms": 200,
      "min_requests_per_second": 1000
    },
    "/api/v1/items": {
      "max_p95_latency_ms": 500,
      "min_requests_per_second": 200
    }
  },
  "micro_benchmarks": {
    "computation_module": {
      "max_execution_time_ns": 50000
    }
  }
}
```
