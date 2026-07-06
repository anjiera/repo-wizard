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
## Step 3: Interactive Tooling Guidance
### 3.1 Developer Consent & Interactive Review
### 3.2 Controls Scope
### 3.3 Safety & Rollback
[tooling-robustness-protocol.md](../references/tooling-robustness-protocol.md)
`;
  fs.writeFileSync(tempAgentPath, badAgentContent);

  try {
    const unhealthyRun = runScript(scriptPath, ['--skip-registry']);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when an agent has no eval suite');
    assert(unhealthyRun.stdout.includes('temp-missing-eval-agent.md — No evaluation test suite defined'),
      'validate-agents.js prints correct missing eval error message');
  } finally {
    if (fs.existsSync(tempAgentPath)) {
      fs.unlinkSync(tempAgentPath);
    }
  }

  // Test 3: Run with a malformed agent header (missing Step 1)
  const malformedAgentPath = path.join(ROOT, 'agents', 'temp-malformed.md');
  const malformedContent = `---
name: temp-malformed
description: Malformed agent missing Step 1
---
## Step 2: Codebase Scan & Auditing
## Step 3: Interactive Tooling Guidance
### 3.1 Developer Consent & Interactive Review
### 3.2 Controls Scope
### 3.3 Safety & Rollback
[tooling-robustness-protocol.md](../references/tooling-robustness-protocol.md)
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
    const unhealthyRun = runScript(scriptPath, ['--skip-registry']);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when an agent lacks required headers');
    assert(unhealthyRun.stdout.includes("Missing exact header: '## Step 1: Alignment & Target Stack'"),
      'validate-agents.js prints correct missing header error message');
  } finally {
    if (fs.existsSync(malformedAgentPath)) fs.unlinkSync(malformedAgentPath);
    if (fs.existsSync(tempEvalPath)) fs.unlinkSync(tempEvalPath);
  }

  // Test 4: Run with a malformed delegator agent (missing handoff constraints)
  const malformedDelegatorAgentPath = path.join(ROOT, 'agents', 'temp-malformed-delegator.md');
  const malformedDelegatorContent = `---
name: temp-malformed-delegator
description: Malformed delegator agent missing constraints
---
## Core Execution & Auditing Directive
[paired Skill Workflow](../skills/temp-malformed-delegator/SKILL.md)
`;
  const tempDelegatorEvalPath = path.join(ROOT, 'evals', 'temp-malformed-delegator.js');
  const tempDelegatorEvalContent = `
module.exports = {
  agent: 'temp-malformed-delegator',
  personaFile: '${malformedDelegatorAgentPath.replace(/\\/g, '\\\\')}',
  testCases: [{ name: 'test', input: 'hi', rubrics: ['pass'] }]
};
`;
  fs.writeFileSync(malformedDelegatorAgentPath, malformedDelegatorContent);
  fs.writeFileSync(tempDelegatorEvalPath, tempDelegatorEvalContent);

  try {
    const unhealthyRun = runScript(scriptPath, ['--skip-registry']);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when a delegator agent lacks handoff constraints');
    assert(unhealthyRun.stdout.includes("Missing exact header: '## Handoff & Sandbox Constraints' or '## Execution Environment & Handoff Rule'"),
      'validate-agents.js prints correct missing constraints header error message');
  } finally {
    if (fs.existsSync(malformedDelegatorAgentPath)) fs.unlinkSync(malformedDelegatorAgentPath);
    if (fs.existsSync(tempDelegatorEvalPath)) fs.unlinkSync(tempDelegatorEvalPath);
  }

  // Test 5: Run with a delegator agent missing the shared constraints file reference
  const missingRefAgentPath = path.join(ROOT, 'agents', 'temp-missing-ref-delegator.md');
  const missingRefContent = `---
name: temp-missing-ref-delegator
description: Delegator agent missing shared constraints reference
---
## Core Execution & Auditing Directive
[paired Skill Workflow](../skills/temp-missing-ref-delegator/SKILL.md)

## Handoff & Sandbox Constraints
Some non-conforming local text without referencing the shared constraints file.
`;
  const tempMissingRefEvalPath = path.join(ROOT, 'evals', 'temp-missing-ref-delegator.js');
  const tempMissingRefEvalContent = `
module.exports = {
  agent: 'temp-missing-ref-delegator',
  personaFile: '${missingRefAgentPath.replace(/\\/g, '\\\\')}',
  testCases: [{ name: 'test', input: 'hi', rubrics: ['pass'] }]
};
`;
  fs.writeFileSync(missingRefAgentPath, missingRefContent);
  fs.writeFileSync(tempMissingRefEvalPath, tempMissingRefEvalContent);

  try {
    const unhealthyRun = runScript(scriptPath, ['--skip-registry']);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when a delegator agent lacks handoff-sandbox-constraints.md reference');
    assert(unhealthyRun.stdout.includes("Missing relative reference to '../references/handoff-sandbox-constraints.md' under handoff constraints."),
      'validate-agents.js prints correct missing reference error message');
  } finally {
    if (fs.existsSync(missingRefAgentPath)) fs.unlinkSync(missingRefAgentPath);
    if (fs.existsSync(tempMissingRefEvalPath)) fs.unlinkSync(tempMissingRefEvalPath);
  }
}

module.exports = { run };
