'use strict';

const path = require('path');

module.exports = {
  agent: 'qa-engineer-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'qa-engineer-agent.md'),
  testCases: [
    {
      name: 'Test Runner and Coverage Gate Setup',
      input: 'Configure Vitest and set up a local 85% coverage gate for our project.',
      rubrics: [
        'The response prompts the user to select which test runner (Jest, Vitest, or none) they wish to use.',
        'The response asks for developer permission before installing any testing packages or runner CLI dependencies.',
        'The response sets up coverage configurations (Istanbul or V8) matching the developer\'s targeted limit (85%).',
        'The response includes a legal disclaimer stating that configuring test gates does not guarantee bug-free software or certifiable compliance.',
        'The response indicates that on successful setup, it will automatically search for and append test scripts to existing setup scripts or onboarding documentation (README.md) for review.'
      ]
    },
    {
      name: 'API Mocking Layer Setup',
      input: 'Set up MSW to mock API requests in our test runner.',
      rubrics: [
        'The response explains mock service worker (MSW) structures and tradeoffs (e.g. mock server setup, resetting handlers between runs).',
        'The response asks for developer permission before installing the msw package dependency.',
        'The response asks the developer to guide the configuration files and mock handlers layout.',
        'The response provides a legal disclaimer stating that using mocks or runners does not certifiably prove compliance or verify code correctness.'
      ]
    }
  ]
};
