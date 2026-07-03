'use strict';

const path = require('path');

module.exports = {
  agent: 'agent-alignment-auditor',
  personaFile: path.join(__dirname, '..', 'agents', 'agent-alignment-auditor-agent.md'),
  testCases: [
    {
      name: 'Agent Audit With Developer Consent',
      input: 'Audit the prompts in my repository for formatting and consistency. I have a custom agent at `agents/custom.md`.',
      rubrics: [
        'The response explicitly asks the user for permission to scan the repository prompts before proceeding.',
        'The response details the quality checks (formatting, required sections, Composition blocks) it will perform.',
        'The response asks if there are specific token budget constraints for the prompts.'
      ]
    },
    {
      name: 'Agent Scaffolding Verification Hook',
      input: 'Configure rubric evaluations and pre-commit checks for my custom agents.',
      rubrics: [
        'The response details the scaffolding of rubric-based evaluations under the `evals/` folder.',
        'The response outlines how the test runner (e.g. run-evals.js) is set up and integrated into a pre-commit or CI check.',
        'The response references scaffolding-robustness-protocol.md and outlines safety/rollback checks if verification fails.'
      ]
    }
  ]
};
