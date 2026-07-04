'use strict';

const fs = require('fs');
const path = require('path');
const { SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-deliverables.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-deliverables.js');

  // Test 1: Run self-tests
  const selfTestRun = runScript(scriptPath, ['--test', '--mock-cli']);
  assert(selfTestRun.code === 0, 'validate-deliverables.js self-test (--test) exits with 0');
  assert(selfTestRun.stdout.includes('Self-test PASSED.'), 'validate-deliverables.js prints self-test success message');

  // Test 2: Run against empty/non-existent directory (should return 0 with notice)
  const emptyDirRun = runScript(scriptPath, ['--dir', '"./non-existent-deliverables"']);
  assert(emptyDirRun.code === 0, 'validate-deliverables.js handles non-existent directory with 0 exit code');
  assert(emptyDirRun.stdout.includes('Directory does not exist'), 'validate-deliverables.js prints directory not found notice');
}

module.exports = { run };
