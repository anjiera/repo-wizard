---
name: observability-pilot
description: Guides agents through auditing codebase observability setups, scaffolding OpenTelemetry SDK integrations, creating dashboard configurations (Honeycomb, Grafana), and writing alerting rules (Prometheus, Honeycomb triggers). Use when configuring logging, metrics, tracing, alerts, or telemetry systems.
---

# Telemetry & Observability Auditing and Scaffolding (`observability-pilot`)

## Overview
A specialized engineering telemetry workflow designed to audit application visibility, configure OpenTelemetry (OTel) SDK frameworks for distributed tracing, metrics, and logs, scaffold dashboard configurations (Honeycomb boards, Grafana JSON), and establish alert notifications (Prometheus rules, Honeycomb triggers).

## When to Use
Use this skill when:
- Integrating OpenTelemetry SDK instrumentations into a codebase.
- Setting up tracing pipelines exporting to backends like Honeycomb, Datadog, Jaeger, or Grafana Tempo.
- Creating dashboard templates for tracking web service HTTP throughput, latency, and error rates.
- Configuring Prometheus Alertmanager rules or SaaS alert thresholds.
- Verifying log and context scrubbing of PII data before data transmission.
- Invoking the slash command: `/rw-observability`.

## Core Process

### Phase 1: Interactive Alignment & Profile Definition
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, skip interactive alignment and infer target standards and stack from the codebase.
Before scanning or scaffolding, align with the developer on target configurations:
1. **Telemetry Targets:** Clarify the data categories to collect: distributed traces (spans and request paths), metrics (latency histograms, request rates), or structured logs.
2. **Backend Services:** Align on target backends: SaaS solutions (Honeycomb, Datadog, New Relic) or self-hosted systems (Prometheus, Jaeger, Grafana Tempo).
3. **Alert Thresholds:** Establish standard service SLAs: P95 latency limit (e.g. 500ms), error rate limits (e.g. 5xx rate > 2%), and notification endpoints (Slack webhook, PagerDuty integration).
4. **Data Privacy Bounds:** Coordinate with `privacy-guardian` specifications. Confirm which variables, headers, or parameters must be redacted (e.g. JWT tokens, email fields, passwords) before export.

### Phase 2: Codebase Telemetry Audit
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, bypass consent. If Approach B is used, output `[Data Blocked: Requires Shallow Clone / Local Checkout to evaluate]` for unobservable details.
Scan the codebase to evaluate current observability configurations:
1. **Manifest File Scan:** Check project package manifests (e.g., `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`) for existing OpenTelemetry, tracing, or logging package dependencies.
2. **Setup Code Audit:** Look for telemetry initialization modules, environment files (`.env`), or telemetry configs.
3. **Framework Scan:** Identify routing libraries (e.g., Express, FastAPI, Actix-web, Gin) to know which auto-instrumentation plugins are needed.

### Phase 3: Interactive Scaffolding Guidance
- **Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, do not invoke the environment configurer to modify files. Instead, write suggested toolchain additions, config file updates, or commit hooks into the generated markdown report Observations file at `.repo-wizard/agents/observations-observability-pilot-agent-<repo-name-here>.md`.
Draft all SDK configurations, dashboard JSONs, and alerting rules in coordination with `tool-scaffolder.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, creating script files, or modifying configuration scripts.
2. **Interactive Code Review:** Display generated OpenTelemetry setup files, dashboard layouts, and alert rules to the user and prompt them for review and confirmation.
3. **Decoupled Reference Use:** Use [OpenTelemetry & Observability Standards](../../references/observability-patterns.md) as the source of truth for SDK setup, Grafana/Honeycomb boards, and Alertmanager configs.
4. **Privacy Handoff Verification:** Verify that telemetry configurations implement context interceptors or span processors that scrub variables flagged by the `privacy-guardian` before trace/metric export.
5. **Onboarding Integration:** Once verified, add telemetry boot commands or build steps to setup scripts or the project's `README.md`.

### Phase 4: Verification & Validation
1. **Dry-Run Validation:** Run a dry-run execution of the telemetry boot script or execute validator checks to ensure the config compiles and doesn't crash the host process.
2. **Dashboard Syntax Validation:** Check that Grafana JSON or Honeycomb boards are syntactically correct and don't contain HTML tags or malformed JSON keys.
3. **No Absolute Paths:** Ensure that all configuration and script imports use relative paths instead of absolute system paths.
4. **Safe Rollback:** If verification checks fail, notify the developer of exact errors. Attempt to debug the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"Auto-instrumentation is enough, we don't need manual tracing."* - Auto-instrumentation handles framework borders (HTTP handlers, database queries), but critical business workflows require custom trace spans to isolate performance delays. Provide guides on custom tracing.
- *"We can ship all request payloads and headers, it makes debugging easier."* - Shipping payloads is a major security risk that leaks PII, access tokens, and passwords to third-party logs. Telemetry must redact headers and payloads by default.

## Red Flags
- Scaffolding external SaaS exporter configurations (like Honeycomb or Datadog) without verifying the `budget_tier` or stack context.
- Exporting raw HTTP headers (like `Authorization` or `Cookie`) in trace contexts without scrubbing.
- Leaving telemetry SDKs enabled in local development mode without configuration options to redirect outputs to local consoles instead of remote servers.

## Verification
To verify the telemetry setup:
1. Confirm the SDK packages install cleanly and initialization files compile without errors.
2. Verify that OTel exporters are configured to use environment variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, etc.) for endpoint configurations.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
