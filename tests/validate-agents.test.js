'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-agents.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-agents.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-agents.js exits with 0 on healthy repository');

  // Test 2: Run with a missing evals file for an agent
  const tempAgentPath = path.join(ROOT, 'agents', 'temp-missing-eval-agent.md');
  const badAgentContent = `---
name: temp-missing-eval-agent
description: Temporary agent to trigger validation failures
---
## Step 1: Alignment & Target Stack
## Step 2: Codebase Scan & Auditing
## Step 3: Interactive Scaffolding Guidance
### 3.1 Developer Consent & Interactive Review
### 3.2 Controls Scope
### 3.3 Safety & Rollback
[scaffolding-robustness-protocol.md](../references/scaffolding-robustness-protocol.md)
`;
  fs.writeFileSync(tempAgentPath, badAgentContent);

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when an agent has no eval suite');
    assert(unhealthyRun.stdout.includes('temp-missing-eval-agent.md — No evaluation test suite defined'),
      'validate-agents.js prints correct missing eval error message');
  } finally {
    if (fs.existsSync(tempAgentPath)) {
      fs.unlinkSync(tempAgentPath);
    }
  }

  // Test 3: Run with a malformed agent header (missing Step 1)
  const malformedAgentPath = path.join(ROOT, 'agents', 'temp-malformed-agent.md');
  const malformedContent = `---
name: temp-malformed-agent
description: Malformed agent missing Step 1
---
## Step 2: Codebase Scan & Auditing
## Step 3: Interactive Scaffolding Guidance
### 3.1 Developer Consent & Interactive Review
### 3.2 Controls Scope
### 3.3 Safety & Rollback
[scaffolding-robustness-protocol.md](../references/scaffolding-robustness-protocol.md)
`;
  // We need to temporarily add a dummy eval case for it to avoid missing-eval error first
  const tempEvalPath = path.join(ROOT, 'evals', 'temp-malformed.js');
  const tempEvalContent = `
module.exports = {
  agent: 'temp-malformed',
  personaFile: '${malformedAgentPath.replace(/\\/g, '\\\\')}',
  testCases: [{ name: 'test', input: 'hi', rubrics: ['pass'] }]
};
`;
  fs.writeFileSync(malformedAgentPath, malformedContent);
  fs.writeFileSync(tempEvalPath, tempEvalContent);

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when an agent lacks required headers');
    assert(unhealthyRun.stdout.includes("Missing exact header: '## Step 1: Alignment & Target Stack'"),
      'validate-agents.js prints correct missing header error message');
  } finally {
    if (fs.existsSync(malformedAgentPath)) fs.unlinkSync(malformedAgentPath);
    if (fs.existsSync(tempEvalPath)) fs.unlinkSync(tempEvalPath);
  }
}

module.exports = { run };
