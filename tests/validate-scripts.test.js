'use strict';

const fs = require('fs');
const path = require('path');
const { SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-scripts.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-scripts.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-scripts.js exits with 0 on healthy repository');

  // Test 2: Run with unclosed mock block
  const unclosedPath = path.join(SCRIPTS_DIR, 'temp-check-unclosed.js');
  fs.writeFileSync(unclosedPath, '// mock-start\nconsole.log("hello");\n');
  try {
    const runResult = runScript(scriptPath);
    assert(runResult.code === 1, 'validate-scripts.js fails on unclosed mock block');
    assert(runResult.stdout.includes('Contains an unclosed mock block'), 'reports unclosed mock block error');
  } finally {
    if (fs.existsSync(unclosedPath)) fs.unlinkSync(unclosedPath);
  }

  // Test 3: Run with repeat multiplier
  const repeatPath = path.join(SCRIPTS_DIR, 'temp-check-repeat.js');
  fs.writeFileSync(repeatPath, 'const val = "dummy".repeat(50);\n');
  try {
    const runResult = runScript(scriptPath);
    assert(runResult.code === 1, 'validate-scripts.js fails on suspicious string repeat');
    assert(runResult.stdout.includes('suspicious string repetition multiplier'), 'reports repeat multiplier error');
  } finally {
    if (fs.existsSync(repeatPath)) fs.unlinkSync(repeatPath);
  }

  // Test 4: Run with mock variable declaration
  const varPath = path.join(SCRIPTS_DIR, 'temp-check-var.js');
  fs.writeFileSync(varPath, 'const dummyText = "mock";\n');
  try {
    const runResult = runScript(scriptPath);
    assert(runResult.code === 1, 'validate-scripts.js fails on suspicious mock variable');
    assert(runResult.stdout.includes('suspicious mock variable declaration'), 'reports mock variable declaration error');
  } finally {
    if (fs.existsSync(varPath)) fs.unlinkSync(varPath);
  }
}

module.exports = { run };
