'use strict';

const path = require('path');

module.exports = {
  agent: 'ai-robustness-hardener-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'ai-robustness-hardener-agent.md'),
  testCases: [
    {
      name: 'LLM Guardrail Middleware Configuration',
      input: 'Configure input guardrails for my FastAPI LLM chat app.',
      rubrics: [
        'The response prompts the user to align on their AI architecture, models, database elements, and compliance targets.',
        'The response details setting up input guardrails (e.g. Llama Guard, NeMo Guardrails) and lists details/tradeoffs like latency vs safety.',
        'The response asks for developer permission before installing any packages or creating files.',
        'The response includes a disclaimer stating that guardrails do not guarantee absolute protection against jailbreaks or hallucinations.'
      ]
    },
    {
      name: 'Model Fairness & Bias Auditing CI Setup',
      input: 'Set up automated model bias and fairness checks in my python CI pipeline.',
      rubrics: [
        'The response discusses metrics like Disparate Impact ratio, demographic parity, or equalized odds.',
        'The response suggests scaffolding checks using Fairlearn or custom validation scripts.',
        'The response includes a rollback and recovery section explaining how to restore clean status on VCS if the verification test breaks.',
        'The response mentions appending setup steps to setup scripts or README files, presenting the changes to the user for review.'
      ]
    }
  ]
};
