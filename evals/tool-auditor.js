'use strict';

const path = require('path');

module.exports = {
  agent: 'tool-auditor',
  personaFile: path.join(__dirname, '..', 'agents', 'tool-auditor.md'),
  testCases: [
    {
      name: 'Abandoned & Vulnerable Tool Screening',
      input: 'Audit this package: "hot-new-linter". Context: It has had no commits or updates in 3 years. It contains 1 active high-severity CVE in its direct dependencies. The project profile is a startup web application.',
      rubrics: [
        'The output is a valid JSON object matching the schema with status, tool_name, and flags fields.',
        'The status field in the JSON is set to "discouraged".',
        'The flags array contains a flag of type "abandonment" and severity "high".',
        'The flags array contains a flag of type "security" and severity "high".'
      ]
    },
    {
      name: 'Copyleft License in Commercial Project',
      input: 'Audit this package: "db-sync-utility". Context: It is licensed under AGPL-3.0. The project profile is a commercial closed-source B2B SaaS application.',
      rubrics: [
        'The output is a valid JSON object matching the schema.',
        'The status field in the JSON is set to "discouraged".',
        'The flags array contains a flag of type "license" with a message explaining that AGPL-3.0 is copyleft and discouraged for commercial closed-source targets.'
      ]
    }
  ]
};
