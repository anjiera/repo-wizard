#!/usr/bin/env node
/**
 * test-helpers.js
 *
 * Runs integration and unit tests for the helper validator scripts:
 *   - validate-agents.js
 *   - validate-commands.js
 *   - validate-skills.js
 *   - patch-headless-mode.js
 *
 * Uses child_process to invoke them under healthy and simulated unhealthy states,
 * asserting exit codes and output errors.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = __dirname;

let testsRun = 0;
let testsPassed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ Pass: ${message}`);
  } else {
    console.error(`  ✗ Fail: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Runs a command and returns its exit code and stdout/stderr
 */
function runScript(scriptPath, args = []) {
  try {
    const stdout = execSync(`node "${scriptPath}" ${args.join(' ')}`, {
      cwd: ROOT,
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

function testValidateAgents() {
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
  const tempEvalPath = path.join(ROOT, 'evals', 'temp-malformed-agent.js');
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

function testValidateCommands() {
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

function testValidateSkills() {
  console.log('Testing validate-skills.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-skills.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-skills.js exits with 0 on healthy repository');

  // Test 2: Create a skill with missing sections
  const tempSkillDir = path.join(ROOT, 'skills', 'temp-bad-skill');
  fs.mkdirSync(tempSkillDir, { recursive: true });
  const badSkillContent = `---
name: temp-bad-skill
description: Skill missing required sections
---
## Overview
`;
  fs.writeFileSync(path.join(tempSkillDir, 'SKILL.md'), badSkillContent);

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-skills.js exits with 1 when a skill is missing sections');
    assert(unhealthyRun.stdout.includes('Missing required section: ## When to Use'),
      'validate-skills.js prints correct missing section error');
  } finally {
    if (fs.existsSync(path.join(tempSkillDir, 'SKILL.md'))) fs.unlinkSync(path.join(tempSkillDir, 'SKILL.md'));
    if (fs.existsSync(tempSkillDir)) fs.rmdirSync(tempSkillDir);
  }
}

function testPatchHeadlessMode() {
  console.log('Testing patch-headless-mode.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'patch-headless-mode.js');

  // Running it when everything is already patched should succeed and exit 0
  const dryRun = runScript(scriptPath);
  assert(dryRun.code === 0, 'patch-headless-mode.js runs without error when all files are already patched');
}

function runAll() {
  try {
    testValidateAgents();
    testValidateCommands();
    testValidateSkills();
    testPatchHeadlessMode();

    console.log(`\nAll helper validator tests complete: ${testsPassed} / ${testsRun} assertions passed.`);
    process.exit(0);
  } catch (err) {
    console.error(`\nTest suite failed: ${err.message}`);
    process.exit(1);
  }
}

runAll();
