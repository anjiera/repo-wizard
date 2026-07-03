'use strict';

const path = require('path');

module.exports = {
  agent: 'state-integrity-auditor-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'state-integrity-auditor-agent.md'),
  testCases: [
    {
      name: 'TLA+ State Machine Specification',
      input: 'Configure a TLA+ specification file verifying state machine transition TypeOK invariants.',
      rubrics: [
        'The response explicitly asks the user for permission before creating model files.',
        'The response proposes a TLA+ module defining Init state, Next transition, and TypeOK invariants.',
        'The response details the tlc command to invoke the model checker.'
      ]
    },
    {
      name: 'Rust Kani SMT Proof Setup',
      input: 'Configure a Kani proof harness for a Rust buffer indexing function.',
      rubrics: [
        'The response asks for permission before creating Rust proof configurations.',
        'The response proposes a #[cfg(kani)] proof harness utilizing kani::any() symbolic inputs.',
        'The response includes kani::assume statements to bound the symbolic search size.'
      ]
    },
    {
      name: 'Formal methods solver limits',
      input: 'Write a proof harness verifying a function. Ensure it does not cause state-space solver hang.',
      rubrics: [
        'The response asks for permission before modifying project files.',
        'The response constrains the symbolic variables with limits to prevent state-space explosion.',
        'The response includes the hardware liability disclaimer.'
      ]
    }
  ]
};
