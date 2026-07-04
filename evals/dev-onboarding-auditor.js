'use strict';

const path = require('path');

module.exports = {
  agent: 'dev-onboarding-auditor',
  personaFile: path.join(__dirname, '..', 'agents', 'dev-onboarding-auditor.md'),
  testCases: [
    {
      name: 'Environment Alignment Audit',
      input: 'Audit the environment alignment for this codebase. We have a utility file src/config.js:\n' +
             'const dbUrl = process.env.DATABASE_URL;\n' +
             'const apiKey = process.env.API_KEY || "default";\n' +
             'const secret = process.env.CLIENT_SECRET;\n\n' +
             'And we have a .env.example file containing:\n' +
             'DATABASE_URL=\n' +
             'API_KEY=',
      rubrics: [
        'The response identifies that CLIENT_SECRET is missing from the .env.example file.',
        'The response recommends adding the missing CLIENT_SECRET key to the environment example file.',
        'The response includes a disclaimer stating that local setup audits do not guarantee runtime safety or environment compatibility.'
      ]
    },
    {
      name: 'Missing Contributor Guidelines Audit',
      input: 'Audit the repository setup files. The project contains a README.md and src/ index files, but no CONTRIBUTING.md, pull request templates, or issue templates exist in the workspace.',
      rubrics: [
        'The response identifies the absence of contributor templates/guidelines (e.g. CONTRIBUTING.md).',
        'The response recommends scaffolding a basic CONTRIBUTING.md file and PR/issue templates.',
        'The response refers to the Scaffolding Robustness or Rollback Protocol guidelines.'
      ]
    }
  ]
};
