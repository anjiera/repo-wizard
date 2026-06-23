# Code Resilience & Fault-Tolerance Standards

This document serves as the repository's source of truth for retry policies, backoff profiles, circuit breakers, and automated chaos engineering scripts.

---

## 1. Retry & Backoff Policies (with Jitter)

Retrying failed network requests helps handle transient failures (network blips, temporary service load). Retries must always use **Exponential Backoff** and **Jitter** to prevent "thundering herd" spikes on downstream services.

### 1.1 Node.js / TypeScript (p-retry)
Use `p-retry` to wrap promise-returning operations with retry logic.

```typescript
import pRetry, { AbortError } from 'p-retry';
import axios from 'axios';

async function fetchUserData(userId: string) {
  const run = async () => {
    try {
      const response = await axios.get(`https://api.example.com/users/${userId}`, { timeout: 2000 });
      return response.data;
    } catch (error: any) {
      // Do NOT retry on client errors (400, 401, 403, 404)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw new AbortError(`Client error: ${error.response.statusText}`);
      }
      throw error; // Retries on network errors or 5xx server errors
    }
  };

  return pRetry(run, {
    retries: 3,
    factor: 2, // Exponential backoff multiplier
    minTimeout: 100, // Wait 100ms before first retry
    maxTimeout: 1000, // Maximum wait time between retries
    randomize: true // Apply jitter
  });
}
```

### 1.2 Python (Tenacity)
Use `tenacity` for decorator-driven retries in Python.

```python
import logging
from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception_type
import requests

logger = logging.getLogger(__name__)

# Retry on connection/server errors, wait exponentially with jitter, stop after 4 attempts
@retry(
    stop=stop_after_attempt(4),
    wait=wait_random_exponential(multiplier=0.1, max=2),
    retry=retry_if_exception_type((requests.exceptions.ConnectionError, requests.exceptions.Timeout)),
    reraise=True
)
def get_user_profile(user_id):
    logger.info(f"Fetching user profile: {user_id}")
    response = requests.get(f"https://api.example.com/users/{user_id}", timeout=2.0)
    response.raise_for_status()
    return response.json()
```

### 1.3 Rust (tokio-retry)
Use `tokio-retry` for async retry loops.

```rust
use tokio_retry::strategy::{ExponentialBackoff, jitter};
use tokio_retry::Retry;

async fn fetch_resource() -> Result<String, reqwest::Error> {
    let action = || async {
        reqwest::get("https://api.example.com/resource")
            .await?
            .text()
            .await
    };

    // Wait 10ms, 20ms, 40ms, etc. with random jitter
    let retry_strategy = ExponentialBackoff::from_millis(10)
        .map(jitter)
        .take(3);

    Retry::spawn(retry_strategy, action).await
}
```

---

## 2. Circuit Breaker Configurations

Circuit Breakers fail-fast and stop requests from hitting a failing downstream dependency once a failure threshold is crossed. This protects both the client and the server from resource exhaustion (e.g. threads blocking on timeouts).

```
         ┌───────────────────┐
         │      CLOSED       │ ◄─────────────────────────┐
         │ (Normal operation)│                           │
         └─────────┬─────────┘                           │
                   │ (Failures > threshold)              │
                   ▼                                     │
         ┌───────────────────┐                           │
         │       OPEN        │                           │
         │  (Fail-fast path) │                           │
         └─────────┬─────────┘                           │
                   │ (Cool-down timeout expires)         │
                   ▼                                     │
         ┌───────────────────┐                           │
         │     HALF-OPEN     │                           │
         │(Trial request run)├───────────────────────────┘
         └───────────────────┘   (Request succeeds)
```

### 2.1 Node.js (Opossum)
```javascript
const CircuitBreaker = require('opossum');

async function fetchFromDependency() {
  // Call to external system...
}

const options = {
  timeout: 3000, // Trip if function takes longer than 3 seconds
  errorThresholdPercentage: 50, // Trip if 50% of requests fail in the window
  resetTimeout: 15000 // Wait 15 seconds in Open state before trying again (Half-Open)
};

const breaker = new CircuitBreaker(fetchFromDependency, options);

breaker.fallback(() => {
  return { status: 'fallback', data: 'Default/cached resource' };
});

breaker.on('open', () => console.warn('Circuit Breaker opened! Failing fast.'));
breaker.on('halfOpen', () => console.log('Circuit Breaker half-opened. Testing service.'));
breaker.on('close', () => console.log('Circuit Breaker closed. Service recovered.'));
```

### 2.2 Python (PyBreaker)
```python
import pybreaker
import requests

# Create circuit breaker
db_breaker = pybreaker.CircuitBreaker(
    fail_max=5,          # Number of consecutive failures before opening
    reset_timeout=30.0   # Seconds before entering Half-Open state
)

# Define a fallback mechanism
def database_fallback():
    return {"status": "degraded", "data": []}

@db_breaker
def query_database():
    response = requests.get("https://db.example.com/query", timeout=2.0)
    response.raise_for_status()
    return response.json()

def safe_query():
    try:
        return query_database()
    except pybreaker.CircuitBrokenError:
        # Circuit is open, trigger fallback
        return database_fallback()
```

---

## 3. Chaos Engineering Configurations

Chaos Engineering verifies resiliency by injecting controlled faults (latency, package drops, process terminations) into dev or staging environments.

### 3.1 Local Fault Injection Script (`scripts/inject-faults.sh`)
Inject packet latency or drop rates into a local dev environment using Linux traffic control (`tc`).

```bash
#!/usr/bin/env bash
# Inject network latency/loss on local loopback interface for testing circuit breakers
set -euo pipefail

INTERFACE="lo"
ACTION="${1:-show}"

show_status() {
  echo "Current loopback traffic status:"
  tc qdisc show dev "$INTERFACE"
}

case "$ACTION" in
  start)
    echo "Injecting 200ms latency (+/- 50ms) and 10% packet loss on interface: $INTERFACE..."
    # Add netem (network emulator) rules
    sudo tc qdisc add dev "$INTERFACE" root netem delay 200ms 50ms loss 10%
    show_status
    ;;
  stop)
    echo "Clearing network fault injection rules..."
    sudo tc qdisc del dev "$INTERFACE" root || true
    show_status
    ;;
  show)
    show_status
    ;;
  *)
    echo "Usage: $0 {start|stop|show}"
    exit 1
    ;;
esac
```

### 3.2 Chaos Mesh Configuration Template (`chaos/network-loss.yaml`)
Kubernetes Custom Resource Definition (CRD) to simulate network delays in a cluster.

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-network-latency
  namespace: staging
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - staging
    labelSelectors:
      app: backend-api-server
  delay:
    latency: '500ms'
    jitter: '50ms'
  direction: to
  target:
    selector:
      app: database-postgres
    mode: all
  duration: '5m'
  scheduler:
    cron: '@every 10m'
```
