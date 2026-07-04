'use strict';

const { assert } = require('./test-utils');
const { TEST_SUITE } = require('../scripts/run-evals');

function run() {
  console.log('Testing run-evals.js...');

  assert(Array.isArray(TEST_SUITE), 'run-evals.js exports TEST_SUITE as an array');
  assert(TEST_SUITE.length > 0, 'TEST_SUITE contains at least one agent test suite');

  for (const suite of TEST_SUITE) {
    assert(typeof suite.agent === 'string' && suite.agent, `suite has a valid agent: ${suite.agent}`);
    assert(typeof suite.personaFile === 'string' && suite.personaFile, `suite has a valid personaFile path`);
    assert(Array.isArray(suite.testCases), `suite ${suite.agent} has a testCases array`);
    
    for (const tc of suite.testCases) {
      assert(typeof tc.name === 'string' && tc.name, `testCase in ${suite.agent} has non-empty name`);
      assert(typeof tc.input === 'string' && tc.input, `testCase in ${suite.agent} has non-empty input`);
      assert(Array.isArray(tc.rubrics) && tc.rubrics.length > 0, `testCase ${tc.name} in ${suite.agent} has non-empty rubrics array`);
    }
  }
}

module.exports = { run };
