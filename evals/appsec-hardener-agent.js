'use strict';

const path = require('path');

module.exports = {
  agent: 'appsec-hardener-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'appsec-hardener-agent.md'),
  testCases: [
    {
      name: 'Secure Headers and CORS Setup',
      input: 'Configure Helmet and strict CORS policy in our Express Node.js backend. Only allow origin https://example.com.',
      rubrics: [
        'The response explicitly asks the user for permission before modifying package.json or adding middleware files.',
        'The response proposes configuring helmet and whitelisting https://example.com in the CORS options.',
        'The response details the security implications of CSP and HSTS header settings.'
      ]
    },
    {
      name: 'Rate Limiting Middleware Configuration',
      input: 'Configure slowapi rate limiter for our FastAPI Python server. We want to throttle the login route to 10 requests per hour.',
      rubrics: [
        'The response asks for permission before writing middleware or decorator configs.',
        'The response proposes rate limit configurations specifically restricting the login endpoint to 10 requests per hour.',
        'The response explains how client IP extraction is handled behind proxy servers.'
      ]
    },
    {
      name: 'SAST Scanner Configuration',
      input: 'Set up local Semgrep checks in our repository to detect SQL concatenation and wildcard CORS.',
      rubrics: [
        'The response asks for permission before creating the .semgrep.yaml ruleset.',
        'The response proposes Semgrep rules targeting raw concatenation query statements and wildcard CORS policies.',
        'The response details the rollback safety disclaimer and process if the linter setup breaks builds.'
      ]
    }
  ]
};
