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
