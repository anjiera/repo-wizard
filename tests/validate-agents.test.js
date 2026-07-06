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

  // Test 2 removed as run-evals is obsolete

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
  fs.writeFileSync(malformedAgentPath, malformedContent);

  try {
    const unhealthyRun = runScript(scriptPath, ['--skip-registry']);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when an agent lacks required headers');
    assert(unhealthyRun.stdout.includes("Missing exact header: '## Step 1: Alignment & Target Stack'"),
      'validate-agents.js prints correct missing header error message');
  } finally {
    if (fs.existsSync(malformedAgentPath)) fs.unlinkSync(malformedAgentPath);
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
  fs.writeFileSync(malformedDelegatorAgentPath, malformedDelegatorContent);

  try {
    const unhealthyRun = runScript(scriptPath, ['--skip-registry']);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when a delegator agent lacks handoff constraints');
    assert(unhealthyRun.stdout.includes("Missing exact header: '## Handoff & Sandbox Constraints' or '## Execution Environment & Handoff Rule'"),
      'validate-agents.js prints correct missing constraints header error message');
  } finally {
    if (fs.existsSync(malformedDelegatorAgentPath)) fs.unlinkSync(malformedDelegatorAgentPath);
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
  fs.writeFileSync(missingRefAgentPath, missingRefContent);

  try {
    const unhealthyRun = runScript(scriptPath, ['--skip-registry']);
    assert(unhealthyRun.code === 1, 'validate-agents.js exits with 1 when a delegator agent lacks handoff-sandbox-constraints.md reference');
    assert(unhealthyRun.stdout.includes("Missing relative reference to '../references/handoff-sandbox-constraints.md' under handoff constraints."),
      'validate-agents.js prints correct missing reference error message');
  } finally {
    if (fs.existsSync(missingRefAgentPath)) fs.unlinkSync(missingRefAgentPath);
  }
}

module.exports = { run };
