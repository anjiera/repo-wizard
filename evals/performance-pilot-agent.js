'use strict';

const path = require('path');

module.exports = {
  agent: 'performance-pilot-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'performance-pilot-agent.md'),
  testCases: [
    {
      name: 'Local Micro-benchmarking Setup',
      input: 'Configure Criterion.rs micro-benchmarks in my Rust cargo project. We want to benchmark our parsing module.',
      rubrics: [
        'The response explicitly asks the user for permission before modifying Cargo.toml or creating the benches directory.',
        'The response proposes a Criterion benchmark template that imports Criterion and registers a benchmark group.',
        'The response outlines the cargo bench execution command and how to review the results.'
      ]
    },
    {
      name: 'Load Testing Configuration',
      input: 'Set up concurrent k6 HTTP load testing for our backend API. We want to test the /api/v1/health and /api/v1/items endpoints.',
      rubrics: [
        'The response asks for permission before creating the k6 script file.',
        'The response details the target SLAs (error rate and response latency thresholds) in the k6 options block.',
        'The response explains how to execute k6 locally and what metrics are collected.'
      ]
    },
    {
      name: 'CI Performance Budget Integration',
      input: 'Set up an automated check in our CI pipeline to fail if the average latency of our health endpoint exceeds 100ms.',
      rubrics: [
        'The response asks for permission before modifying CI configuration files or adding regression scripts.',
        'The response proposes a script that runs the performance test, parses the latency output, and asserts it is below the 100ms threshold.',
        'The response details the rollback safety disclaimer and process if the CI integration test fails.'
      ]
    }
  ]
};
