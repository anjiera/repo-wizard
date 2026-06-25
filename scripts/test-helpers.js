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

function testValidateDocs() {
  console.log('Testing validate-docs.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-docs.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-docs.js exits with 0 on healthy repository');

  // Test 2: Create a temp untracked reference file
  const tempRefPath = path.join(ROOT, 'references', 'temp-untracked-ref.md');
  fs.writeFileSync(tempRefPath, '# Temp Untracked Reference\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-docs.js exits with 1 when reference file is untracked');
    assert(unhealthyRun.stdout.includes("Reference file 'temp-untracked-ref.md' is not indexed in references/README.md"),
      'validate-docs.js prints correct missing reference error message');
  } finally {
    if (fs.existsSync(tempRefPath)) fs.unlinkSync(tempRefPath);
  }

  // Test 3: Create a temp unlisted agent
  const tempAgentPath = path.join(ROOT, 'agents', 'temp-unlisted-agent.md');
  fs.writeFileSync(tempAgentPath, '# Temp Unlisted Agent\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-docs.js exits with 1 when agent is unlisted in matrix');
    assert(unhealthyRun.stdout.includes("Agent persona 'temp-unlisted-agent' is not listed in docs/AGENT_MATRIX.md"),
      'validate-docs.js prints correct unlisted agent error message');
  } finally {
    if (fs.existsSync(tempAgentPath)) fs.unlinkSync(tempAgentPath);
  }

  // Test 4: Create a temp unlisted docs guide
  const tempGuidePath = path.join(ROOT, 'docs', 'temp-unlisted-guide.md');
  fs.writeFileSync(tempGuidePath, '# Temp Unlisted Guide\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-docs.js exits with 1 when documentation file is unmapped in README');
    assert(unhealthyRun.stdout.includes("Documentation file 'docs/temp-unlisted-guide.md' is not mapped in root README.md"),
      'validate-docs.js prints correct unmapped guide error message');
  } finally {
    if (fs.existsSync(tempGuidePath)) fs.unlinkSync(tempGuidePath);
  }
}

function testRunOrchestration() {
  console.log('Testing run-orchestration.js...');
  const scriptPath = path.join(ROOT, 'scripts', 'run-orchestration.js');
  const manifestDir = path.join(ROOT, '.repo-wizard');
  const manifestPath = path.join(manifestDir, 'manifest.json');
  const agentsDir = path.join(manifestDir, 'agents');

  // Helper to ensure clean temp manifest dir
  if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir);
  
  // Backup existing manifest if any
  let originalManifestContent = null;
  if (fs.existsSync(manifestPath)) {
    originalManifestContent = fs.readFileSync(manifestPath, 'utf8');
  }

  try {
    // Test 1: Successful run with MOCK_CLI=true
    const mockManifest = {
      status: "pending",
      contracts: [
        {
          agent_name: "privacy-guardian-agent",
          status: "pending",
          contract: {
            task_metadata: {
              target_modules: ["/src"],
              language: "javascript",
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        }
      ]
    };
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');

    // Run script with MOCK_CLI=true env
    const mockRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}"`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_CLI: 'true', MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(mockRun.code === 0, 'run-orchestration.js exits with 0 on successful mock run');
    
    // Check manifest status update
    const updatedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(updatedManifest.status === 'completed', 'manifest status updated to completed');
    assert(updatedManifest.contracts[0].status === 'completed', 'contract status updated to completed');
    
    // Check observations generated
    const reportsDir = path.join(ROOT, '.repo-wizard', 'reports', 'test-repo');
    const obsPath = path.join(reportsDir, 'agents', 'test-repo-observations-privacy-guardian-agent.md');
    assert(fs.existsSync(obsPath), 'mock observations file created successfully');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }

    // Test 2: Pre-flight validation fails on bad contract structure
    const badManifest = {
      status: "pending",
      contracts: [
        {
          agent_name: "privacy-guardian-agent",
          status: "pending",
          contract: {
            task_metadata: {
              // language is missing
              target_modules: ["/src"],
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        }
      ]
    };
    fs.writeFileSync(manifestPath, JSON.stringify(badManifest, null, 2), 'utf8');

    const badRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}"`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_CLI: 'true', MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return {
          code: err.status || 1,
          stdout: err.stdout ? err.stdout.toString() : '',
          stderr: err.stderr ? err.stderr.toString() : ''
        };
      }
    })();

    assert(badRun.code === 1, 'run-orchestration.js exits with 1 on invalid parameter contract');
    assert(badRun.stderr.includes('task_metadata.language must be a non-empty string'), 'correct validation error outputted in stderr');

    // Test 3: Fallback triggered when no CLI binary exists
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');
    const fallbackRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}"`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, DISABLE_CLI: 'true', MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(fallbackRun.code === 0, 'run-orchestration.js exits with 0 on fallback when CLI not found');
    const fallbackManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(fallbackManifest.status === 'fallback_to_agent', 'manifest status updated to fallback_to_agent');
    assert(fallbackManifest.contracts[0].status === 'pending_agent_fallback', 'contract status updated to pending_agent_fallback');

  } finally {
    // Restore original manifest
    if (originalManifestContent !== null) {
      fs.writeFileSync(manifestPath, originalManifestContent, 'utf8');
    } else if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
  }
}

function testValidateDeliverables() {
  console.log('Testing validate-deliverables.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-deliverables.js');

  // Test 1: Run self-tests
  const selfTestRun = runScript(scriptPath, ['--test']);
  assert(selfTestRun.code === 0, 'validate-deliverables.js self-test (--test) exits with 0');
  assert(selfTestRun.stdout.includes('Self-test PASSED.'), 'validate-deliverables.js prints self-test success message');

  // Test 2: Run against empty/non-existent directory (should return 0 with notice)
  const emptyDirRun = runScript(scriptPath, ['--dir', '"./non-existent-deliverables"']);
  assert(emptyDirRun.code === 0, 'validate-deliverables.js handles non-existent directory with 0 exit code');
  assert(emptyDirRun.stdout.includes('Directory does not exist'), 'validate-deliverables.js prints directory not found notice');
}

function runAll() {
  try {
    testValidateAgents();
    testValidateCommands();
    testValidateSkills();
    testPatchHeadlessMode();
    testValidateDocs();
    testRunOrchestration();
    testValidateDeliverables();

    console.log(`\nAll helper validator tests complete: ${testsPassed} / ${testsRun} assertions passed.`);
    process.exit(0);
  } catch (err) {
    console.error(`\nTest suite failed: ${err.message}`);
    process.exit(1);
  }
}

runAll();

