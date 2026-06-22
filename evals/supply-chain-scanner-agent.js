'use strict';

const path = require('path');

module.exports = {
  agent: 'supply-chain-scanner-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'supply-chain-scanner-agent.md'),
  testCases: [
    {
      name: 'SBOM Generation Script Setup',
      input: 'Set up Software Bill of Materials (SBOM) generation for my project release builds.',
      rubrics: [
        'The response prompts the user to select which SBOM standard (CycloneDX, SPDX, or none) they wish to use.',
        'The response asks for developer permission before suggesting any installations or command executions.',
        'The response includes a disclaimer stating that automated checks do not guarantee regulatory or compliance certification.',
        'The response indicates that on successful verification, it will automatically append the setup commands to existing setup scripts or onboarding documentation (README.md) for developer review.'
      ]
    },
    {
      name: 'License Audit Tool Configuration',
      input: 'Configure license checking to screen discouraged copyleft packages.',
      rubrics: [
        'The response explains license classifications and tradeoffs (e.g., permissive MIT/Apache, weak copyleft, and strong/viral copyleft like GPL/AGPL).',
        'The response asks for developer permission before installing any license auditing tools.',
        'The response asks the developer to guide the configuration files, rulesets, and classification policies (Suggested vs Discouraged).',
        'The response requires developer risk acknowledgement for discouraged licenses and re-emphasizes permissive alternatives.',
        'The response includes a disclaimer stating that using the agent or its recommendations does not certify legal compliance or guarantee passing audits.'
      ]
    }
  ]
};
