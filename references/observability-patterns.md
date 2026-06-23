# OpenTelemetry & Observability Standards

This document serves as the repository's source of truth for OpenTelemetry SDK configurations, Grafana/Honeycomb dashboard structures, and Prometheus/SaaS alerting definitions.

---

## 1. OpenTelemetry (OTel) SDK Configurations

OpenTelemetry provides a unified standard for collecting traces, metrics, and logs. All SDKs must export using OpenTelemetry Protocol (OTLP) over gRPC or HTTP.

### 1.1 Node.js (TypeScript)
Configure the OpenTelemetry Node SDK using the OTLP trace exporter.

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'my-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
      JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK shut down successfully'))
    .catch((err) => console.log('Error shutting down SDK', err))
    .finally(() => process.exit(0));
});
```

### 1.2 Python
Configure OpenTelemetry for Python using auto-instrumentation or manual initialization.

```python
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Define service metadata
resource = Resource(attributes={
    "service.name": os.getenv("OTEL_SERVICE_NAME", "my-service"),
    "service.version": os.getenv("OTEL_SERVICE_VERSION", "1.0.0")
})

# Set up trace provider and exporter
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/traces")
    )
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)
```

### 1.3 Rust
Configure OpenTelemetry in Rust using the `opentelemetry` and `opentelemetry-otlp` crates.

```rust
use opentelemetry::global;
use opentelemetry::sdk::{trace as sdktrace, Resource};
use opentelemetry::KeyValue;
use opentelemetry_otlp::WithExportConfig;

pub fn init_tracer() -> Result<sdktrace::Tracer, opentelemetry::trace::TraceError> {
    let service_name = std::env::var("OTEL_SERVICE_NAME").unwrap_or_else(|_| "my-service".to_string());
    
    opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .http()
                .with_endpoint(std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT").unwrap_or_else(|_| "http://localhost:4318/v1/traces".to_string())),
        )
        .with_trace_config(
            sdktrace::config().with_resource(Resource::new(vec![
                KeyValue::new("service.name", service_name),
            ])),
        )
        .install_batch(opentelemetry::runtime::Tokio)
}
```

### 1.4 Go
Initialize OpenTelemetry Go SDK trace pipelines.

```go
package telemetry

import (
	"context"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func InitTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
	serviceName := os.Getenv("OTEL_SERVICE_NAME")
	if serviceName == "" {
		serviceName = "my-service"
	}

	exporter, err := otlptracehttp.New(ctx, otlptracehttp.WithInsecure())
	if err != nil {
		return nil, err
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
		),
	)
	if err != nil {
		return nil, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)

	return tp, nil
}
```

---

## 2. Dashboard Templates

These structures outline configuration schemas for visualizing telemetry metrics.

### 2.1 Grafana Dashboard JSON Schema (Partial HTTP standard)
```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "collapsed": false,
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "id": 1,
      "title": "HTTP Request Volume & Success Rate",
      "type": "timeseries",
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "prometheus" },
          "editorMode": "code",
          "expr": "sum(rate(http_server_duration_count{status=~\"2..\"}[5m])) by (handler)",
          "legendFormat": "{{handler}} - 2xx",
          "refId": "A"
        },
        {
          "datasource": { "type": "prometheus", "uid": "prometheus" },
          "expr": "sum(rate(http_server_duration_count{status=~\"5..\"}[5m])) by (handler)",
          "legendFormat": "{{handler}} - 5xx Errors",
          "refId": "B"
        }
      ]
    },
    {
      "title": "P95 Request Latency (ms)",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "id": 2,
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "prometheus" },
          "expr": "histogram_quantile(0.95, sum(rate(http_server_duration_bucket[5m])) by (le))",
          "legendFormat": "P95 Latency",
          "refId": "A"
        }
      ]
    }
  ],
  "schemaVersion": 36,
  "style": "dark",
  "tags": ["o11y", "http"],
  "title": "System Service HTTP Metrics",
  "version": 1
}
```

### 2.2 Honeycomb Board Configuration Template
```json
{
  "name": "Service Health Board",
  "description": "Critical indicators for latency, error rates, and throughput",
  "queries": [
    {
      "caption": "P95 Latency by Endpoint",
      "query": {
        "calculations": [
          { "op": "P95", "column": "duration_ms" }
        ],
        "breakdowns": [ "http.target" ],
        "time_range": 7200
      }
    },
    {
      "caption": "Error Rate Spike Tracker",
      "query": {
        "calculations": [
          { "op": "COUNT" }
        ],
        "filters": [
          { "column": "http.status_code", "op": ">=", "value": 500 }
        ],
        "breakdowns": [ "http.target" ],
        "time_range": 7200
      }
    }
  ]
}
```

---

## 3. Alerting Rules

Define alerts to notify teams when metrics cross safety limits.

### 3.1 Prometheus Alertmanager Rules (`alerts/service-alerts.yml`)
```yaml
groups:
  - name: HTTP Service Alerts
    rules:
      # Alert on high 5xx server error rates
      - alert: HighHttpErrorRate
        expr: sum(rate(http_server_duration_count{status=~"5.."}[5m])) / sum(rate(http_server_duration_count[5m])) * 100 > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High HTTP 5xx error rate detected: {{ $value }}%"
          description: "HTTP 5xx server errors account for over 5% of requests on instance {{ $labels.instance }} for the last 2 minutes."

      # Alert on high response latencies
      - alert: HighP95Latency
        expr: histogram_quantile(0.95, sum(rate(http_server_duration_bucket[5m])) by (le)) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High P95 latency: {{ $value }}ms"
          description: "P95 latency of HTTP requests exceeds 1000ms on instance {{ $labels.instance }} for the last 5 minutes."
```

### 3.2 Honeycomb Trigger Configurations
```json
{
  "name": "Latency Spike Trigger",
  "description": "Notify Slack/PagerDuty if P95 latency crosses 1 second",
  "query": {
    "calculations": [
      { "op": "P95", "column": "duration_ms" }
    ],
    "time_range": 600
  },
  "threshold": 1000,
  "frequency": 60,
  "alert_recipients": [
    { "type": "slack", "target": "#ops-alerts" }
  ]
}
```

---

## 4. W3C Trace Context Propagation

To trace async task boundaries across subagent executions and API borders, use the W3C Trace Context standard. Tracing headers ensure that distributed operations share a single Trace ID and parent-child span hierarchy.

### 4.1 Trace Context Headers
* **`traceparent`**: A 4-part hyphen-separated identifier:
  `version-trace_id-parent_id-trace_flags`
  - Example: `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
  - `version`: `00`
  - `trace_id`: `4bf92f3577b34da6a3ce929d0e0e4736` (16-byte random hex)
  - `parent_id` / `span_id`: `00f067aa0ba902b7` (8-byte random hex)
  - `trace_flags`: `01` (recorded/sampled)
* **`tracestate`**: Key-value pairs carrying vendor-specific routing and filtering metadata.
  - Example: `congo=t61rcWkgMzE,rojo=00f067aa0ba902b7`

### 4.2 Injection & Extraction Examples

#### Node.js (Express HTTP Client)
```javascript
import { api, propagation, defaultTextMapSetter, defaultTextMapGetter } from '@opentelemetry/api';

// Inject headers before sending request
function injectTraceHeaders(headers) {
  const context = api.context.active();
  propagation.inject(context, headers, defaultTextMapSetter);
  return headers;
}

// Extract headers when receiving request
function extractTraceContext(req) {
  return propagation.extract(api.context.active(), req.headers, defaultTextMapGetter);
}
```

#### Python (Requests / FastAPI)
```python
from opentelemetry import propagate
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

# Inject tracing context into headers
def inject_headers(headers: dict):
    TraceContextTextMapPropagator().inject(headers)
    return headers

# Extract tracing context from request headers
def extract_context(headers: dict):
    return TraceContextTextMapPropagator().extract(carrier=headers)
```

---

## 5. RED & USE Metrics Specifications

System performance auditing must capture metrics measuring both endpoint quality and physical hardware constraints.

### 5.1 RED Metrics (Service & API Layer)
Designed for request-driven architectures to monitor microservices and APIs.
* **Rate**: The number of requests processed per second (e.g. `http_requests_total`).
* **Errors**: The number of failed requests (returning 5xx HTTP codes or exceptions).
* **Duration**: The time taken to process requests, measured as percentiles (P50, P90, P99).

### 5.2 USE Metrics (Infrastructure & System Layer)
Designed for hardware resources (CPUs, Memory, Disks, Network Interfaces).
* **Utilization**: The percentage of time the resource was busy (e.g., CPU utilization percentage).
* **Saturation**: The backlog of work that could not be processed immediately (e.g., CPU load average / run queue length, memory swap rate).
* **Errors**: The count of physical errors (e.g., disk read/write retries, network dropped packets).

---

## 6. PII Log Purging Filters

To prevent sensitive user-identifying data (PII) or secrets from polluting logs and trace payloads:

### 6.1 Regex Purge Targets
* **Social Security Numbers (SSN)**: `\b\d{3}-\d{2}-\d{4}\b`
* **Credit Cards**: `\b(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b`
* **API Keys / Auth Tokens**: `\b(?:key|token|password|secret|auth|jwt|credential)(?:[\s_'"-]*[=:]\s*["']?)([a-zA-Z0-9-._~+/]{20,})\b`
* **Email Addresses**: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`

### 6.2 Middleware Implementation (Node.js)
```javascript
const PII_PATTERNS = [
  /([a-zA-Z0-9-._~+/]{20,})/g, // general tokens
  /\b\d{3}-\d{2}-\d{4}\b/g,      // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
];

function sanitizeLog(message) {
  if (typeof message !== 'string') {
    message = JSON.stringify(message);
  }
  let sanitized = message;
  // Replace identified PII tokens with static mask
  for (const pattern of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_PII]');
  }
  return sanitized;
}

export function loggerMiddleware(req, res, next) {
  console.log(sanitizeLog(`Request: ${req.method} ${req.url} - Query: ${JSON.stringify(req.query)}`));
  next();
}
```

