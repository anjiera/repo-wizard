'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-project-docs.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-project-docs.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-project-docs.js exits with 0 on healthy repository');

  // Test 2: Create a temp untracked reference file
  const tempRefPath = path.join(ROOT, 'references', 'temp-untracked-ref.md');
  fs.writeFileSync(tempRefPath, '# Temp Untracked Reference\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when reference file is untracked');
    assert(unhealthyRun.stdout.includes("Reference file 'temp-untracked-ref.md' is not indexed in references/README.md"),
      'validate-project-docs.js prints correct missing reference error message');
  } finally {
    if (fs.existsSync(tempRefPath)) fs.unlinkSync(tempRefPath);
  }

  // Test 3: Create a temp unlisted agent
  const tempAgentPath = path.join(ROOT, 'agents', 'temp-unlisted-agent.md');
  fs.writeFileSync(tempAgentPath, '# Temp Unlisted Agent\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when agent is unlisted in matrix');
    assert(unhealthyRun.stdout.includes("Agent persona 'temp-unlisted-agent' is not listed in docs/AGENT_MATRIX.md"),
      'validate-project-docs.js prints correct unlisted agent error message');
  } finally {
    if (fs.existsSync(tempAgentPath)) fs.unlinkSync(tempAgentPath);
  }

  // Test 4: Create a temp unlisted docs guide
  const tempGuidePath = path.join(ROOT, 'docs', 'temp-unlisted-guide.md');
  fs.writeFileSync(tempGuidePath, '# Temp Unlisted Guide\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when documentation file is unmapped in README');
    assert(unhealthyRun.stdout.includes("Documentation file 'docs/temp-unlisted-guide.md' is not mapped in root README.md"),
      'validate-project-docs.js prints correct unmapped guide error message');
  } finally {
    if (fs.existsSync(tempGuidePath)) fs.unlinkSync(tempGuidePath);
  }
}

module.exports = { run };
