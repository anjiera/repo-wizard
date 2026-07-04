'use strict';

const path = require('path');

module.exports = {
  agent: 'resilience-architect',
  personaFile: path.join(__dirname, '..', 'agents', 'resilience-architect.md'),
  testCases: [
    {
      name: 'Retry Policy & Jitter Setup',
      input: 'Configure tenacity exponential retries in our Python server for calling external service https://api.example.com. We want 3 retry attempts.',
      rubrics: [
        'The response explicitly asks the user for permission before modifying requirements.txt or adding retry wrappers.',
        'The response proposes using tenacity with stop_after_attempt(3) and wait_random_exponential.',
        'The response explains how client-side errors (4xx) are filtered out from retry triggers.'
      ]
    },
    {
      name: 'Circuit Breaker Integration',
      input: 'Configure Opossum circuit breaker for our Node.js HTTP client query. Trip the breaker if error rate exceeds 50%.',
      rubrics: [
        'The response asks for permission before writing opossum configurations.',
        'The response proposes opossum settings setting errorThresholdPercentage to 50.',
        'The response details the fallback handler execution when the circuit is open.'
      ]
    },
    {
      name: 'Chaos Test Script Scaffolding',
      input: 'Set up an automated shell script to simulate loopback latency and packet loss to test our circuit breakers locally.',
      rubrics: [
        'The response asks for permission before creating the shell script file.',
        'The response proposes using Linux traffic control (tc qdisc netem) to inject and Del/Clear rules.',
        'The response details the rollback safety disclaimer and process if the chaos script setup fails.'
      ]
    }
  ]
};
