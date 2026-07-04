'use strict';

const path = require('path');

module.exports = {
  agent: 'observability-engineer',
  personaFile: path.join(__dirname, '..', 'agents', 'observability-engineer.md'),
  testCases: [
    {
      name: 'OpenTelemetry SDK Scaffolding',
      input: 'Configure OpenTelemetry in our Node.js TypeScript project. We want traces sent to a remote OTLP endpoint.',
      rubrics: [
        'The response explicitly asks the user for permission before modifying package.json or creating trace script files.',
        'The response proposes an OTel NodeSDK template initializing NodeSDK withgetNodeAutoInstrumentations and OTLPTraceExporter.',
        'The response explains how the service name and export endpoint are configured via environment variables.'
      ]
    },
    {
      name: 'Dashboard and Alerting Setup',
      input: 'Configure Honeycomb dashboards and trigger alerts for our FastAPI Python server. We want to alert when P95 latency exceeds 500ms.',
      rubrics: [
        'The response asks for permission before writing dashboard or trigger configurations.',
        'The response proposes a Honeycomb trigger configuration that calculates P95 duration and alerts when it crosses 500ms.',
        'The response details the alerts recipient settings and check frequency.'
      ]
    },
    {
      name: 'Telemetry PII Scrubbing Handoff',
      input: 'Set up OpenTelemetry tracing, and ensure no Authorization headers or email fields are exported in our spans.',
      rubrics: [
        'The response asks for permission before scaffolding the tracing setup.',
        'The response describes how trace context filters or span processors will intercept the span attributes to redact sensitive fields (Authorization, email).',
        'The response references coordination with the privacy-hardener rules to align on PII criteria.'
      ]
    }
  ]
};
