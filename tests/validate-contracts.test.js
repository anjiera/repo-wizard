'use strict';

const { assert } = require('./test-utils');
const { validateContract } = require('../scripts/validate-contracts');

function run() {
  console.log('Testing validate-contracts.js...');

  // Test 1: Valid contract
  const validContract = {
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: 'scaffold'
    },
    compliance_targets: [],
    tooling_specification: []
  };
  const errors1 = validateContract(validContract);
  assert(errors1.length === 0, 'validateContract accepts a valid contract');

  // Test 2: Invalid contract type
  const errors2 = validateContract("invalid");
  assert(errors2.length > 0 && errors2[0].includes('must be a valid JSON object'), 'fails on non-object contract');

  // Test 3: Missing task_metadata
  const errors3 = validateContract({ compliance_targets: [] });
  assert(errors3.length > 0 && errors3[0].includes('Missing or invalid "task_metadata"'), 'fails on missing task_metadata');

  // Test 4: Invalid execution_mode
  const errors4 = validateContract({
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: 'invalid_mode'
    }
  });
  assert(errors4.length > 0 && errors4.some(e => e.includes('execution_mode must be')), 'fails on invalid execution_mode');

  // Test 5: Missing backlog_parameters in backlog mode
  const errors5 = validateContract({
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: 'backlog'
    }
  });
  assert(errors5.length > 0 && errors5.some(e => e.includes('Missing "backlog_parameters"')), 'fails on missing backlog_parameters in backlog mode');
}

module.exports = { run };
