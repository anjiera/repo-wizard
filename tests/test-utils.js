'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

let stats = {
  testsRun: 0,
  testsPassed: 0
};

function assert(condition, message) {
  stats.testsRun++;
  if (condition) {
    stats.testsPassed++;
    console.log(`  ✓ Pass: ${message}`);
  } else {
    console.error(`  ✗ Fail: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Runs a command and returns its exit code and stdout/stderr
 */
function runScript(scriptPath, args = [], options = {}) {
  try {
    const stdout = execSync(`node "${scriptPath}" ${args.join(' ')}`, {
      cwd: options.cwd || ROOT,
      stdio: 'pipe',
      env: { ...process.env }
    }).toString();
    return { code: 0, stdout };
  } catch (err) {
    return {
      code: err.status || 1,
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : ''
    };
  }
}

module.exports = {
  ROOT,
  SCRIPTS_DIR,
  stats,
  assert,
  runScript
};
