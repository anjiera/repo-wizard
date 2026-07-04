'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-commands.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-commands.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-commands.js exits with 0 on healthy repository');

  // Test 2: Create a missing command equivalent
  const tempCommandPath = path.join(ROOT, 'commands', 'rw-temp-missing-command.toml');
  const commandContent = `description = "Test missing command equivalent"\nprompt = "hi"\n`;
  fs.writeFileSync(tempCommandPath, commandContent);

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-commands.js exits with 1 when commands are out of parity');
    assert(unhealthyRun.stdout.includes('rw-temp-missing-command — missing in: .claude/commands, .gemini/commands'),
      'validate-commands.js identifies exactly where the missing equivalents are');
  } finally {
    if (fs.existsSync(tempCommandPath)) {
      fs.unlinkSync(tempCommandPath);
    }
  }
}

module.exports = { run };
