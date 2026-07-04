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

function testValidateDocs() {
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

function testRunOrchestration() {
  console.log('Testing run-fallback-sequential-orchestration.js...');
  const scriptPath = path.join(ROOT, 'scripts', 'run-fallback-sequential-orchestration.js');
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
          agent_name: "privacy-hardener",
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

    // Run script with --mock-cli true parameter
    const mockRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --target-path "${ROOT}" --mock-cli true`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(mockRun.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 on successful mock run');
    
    // Check manifest status update (promoted to reports dir)
    const reportsDir = path.join(ROOT, '.repo-wizard', 'reports', 'test-repo');
    const targetManifestPath = path.join(reportsDir, 'manifest.json');
    const updatedManifest = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(updatedManifest.status === 'completed', 'manifest status updated to completed');
    assert(updatedManifest.contracts[0].status === 'completed', 'contract status updated to completed');
    
    // Check observations generated
    const obsPath = path.join(reportsDir, 'agents', 'test-repo-observations-privacy-hardener.md');
    assert(fs.existsSync(obsPath), 'mock observations file created successfully');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }

    // Test 1b: Skipped contracts remain skipped
    const mockManifestWithSkipped = {
      status: "pending",
      contracts: [
        {
          agent_name: "notebook-auditor",
          status: "skipped",
          contract: {
            task_metadata: {
              target_modules: ["/src"],
              language: "javascript",
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        },
        {
          agent_name: "privacy-hardener",
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
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifestWithSkipped, null, 2), 'utf8');

    const runWithSkipped = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --target-path "${ROOT}" --mock-cli true`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(runWithSkipped.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 when handling skipped contracts');
    const skippedManifestUpdated = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(skippedManifestUpdated.contracts[0].status === 'skipped', 'skipped contracts remain status skipped');
    assert(skippedManifestUpdated.contracts[1].status === 'completed', 'pending contracts are completed');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }


    // Test 1.5: Invalid --mock-cli value checks
    const invalidMockRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --target-path "${ROOT}" --mock-cli invalid_value`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
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
    assert(invalidMockRun.code === 1, 'run-fallback-sequential-orchestration.js exits with 1 on invalid --mock-cli value');
    assert(invalidMockRun.stderr.includes('ERROR: Invalid or missing boolean value for parameter "--mock-cli"'), 'correct error message for invalid mock-cli parameter');

    // Test 2: Pre-flight validation fails on bad contract structure
    const badManifest = {
      status: "pending",
      contracts: [
        {
          agent_name: "privacy-hardener",
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
        const stdout = execSync(`node "${scriptPath}" --target-path "${ROOT}" --mock-cli true`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
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

    assert(badRun.code === 1, 'run-fallback-sequential-orchestration.js exits with 1 on invalid parameter contract');
    assert(badRun.stderr.includes('task_metadata.language must be a non-empty string'), 'correct validation error outputted in stderr');

    // Test 3: Fallback triggered when no CLI binary exists
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');
    const fallbackRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --target-path "${ROOT}"`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, DISABLE_CLI: 'true', MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(fallbackRun.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 on fallback when CLI not found');
    const fallbackManifest = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(fallbackManifest.status === 'fallback_to_agent', 'manifest status updated to fallback_to_agent');
    assert(fallbackManifest.contracts[0].status === 'pending_agent_fallback', 'contract status updated to pending_agent_fallback');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }

    // Test 4: Redaction pipeline works on mock execution
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');
    const testRepoDir = path.join(ROOT, '.repo-wizard', 'reports', 'test-repo');
    if (!fs.existsSync(testRepoDir)) fs.mkdirSync(testRepoDir, { recursive: true });
    
    const resolvedTestRepo = path.resolve(testRepoDir);
    const dummyPath = path.join(testRepoDir, 'dummy-report.md');
    fs.writeFileSync(dummyPath, `Target repo is test-repo located at ${resolvedTestRepo}. Git URL is git@github.com:test-org/test-repo.git`, 'utf8');

    const redactRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --target-path "${resolvedTestRepo}" --mock-cli true`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: {
            ...process.env,
            MOCK_REPO_NAME: 'test-repo',
            REDACT: 'true'
          }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(redactRun.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 on successful redact run');
    const dummyContent = fs.readFileSync(dummyPath, 'utf8');
    assert(dummyContent.includes('Target repo is target-repository located at target-workspace-path'), 'repo name and path redacted');
    assert(dummyContent.includes('Git URL is git@github.com:redacted-org/redacted-repo.git'), 'git url redacted');
    
    if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);

  } finally {
    // Restore original manifest
    if (originalManifestContent !== null) {
      fs.writeFileSync(manifestPath, originalManifestContent, 'utf8');
    } else if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
    const reportsDir = path.join(ROOT, '.repo-wizard', 'reports', 'test-repo');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  }
}

function testCompiledAnalysisPath() {
  console.log('Testing orchestration with custom --report-path...');
  const scriptPath = path.join(SCRIPTS_DIR, 'run-fallback-sequential-orchestration.js');
  const customReportDir = path.join(ROOT, 'temp_custom_reports');
  
  if (fs.existsSync(customReportDir)) {
    fs.rmSync(customReportDir, { recursive: true, force: true });
  }

  // Create manifest under the custom reports directory
  const rootManifest = path.join(customReportDir, '.repo-wizard', 'manifest.json');

  try {
    const mockManifest = {
      status: "pending",
      contracts: [
        {
          agent_name: "privacy-hardener",
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
    
    fs.mkdirSync(path.dirname(rootManifest), { recursive: true });
    fs.writeFileSync(rootManifest, JSON.stringify(mockManifest, null, 2), 'utf8');

    // Run script with --mock-cli true and --report-path D:\...\temp_custom_reports
    const stdout = execSync(`node "${scriptPath}" --target-path "${ROOT}" --mock-cli true --report-path "${customReportDir}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
    }).toString();

    // Check manifest status update (promoted to custom reports dir)
    const reportsDir = path.join(customReportDir, '.repo-wizard', 'reports', 'test-repo');
    const targetManifestPath = path.join(reportsDir, 'manifest.json');
    assert(fs.existsSync(targetManifestPath), 'manifest promoted to custom report path');

    const updatedManifest = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(updatedManifest.status === 'completed', 'manifest status updated to completed under custom report path');
    
    // Check session.json contains reportPath
    const targetSessionPath = path.join(reportsDir, 'session.json');
    assert(fs.existsSync(targetSessionPath), 'session.json generated under custom report path');
    const session = JSON.parse(fs.readFileSync(targetSessionPath, 'utf8'));
    assert(session.reportPath === customReportDir, 'session.json correctly persisted reportPath');

  } finally {
    if (fs.existsSync(customReportDir)) {
      fs.rmSync(customReportDir, { recursive: true, force: true });
    }
  }
}

function testValidateDeliverables() {
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

function testReportStyling() {
  console.log('Testing md-to-html.js report styling options...');
  const { convertMdToHtml } = require('../solo-dev-toolkit/scripts/md-to-html');

  // Test 1: Compile with default (whitepaper)
  const defaultHtml = convertMdToHtml('# Title', 'Title', 'whitepaper');
  assert(defaultHtml.includes('--bg-primary: #ffffff'), 'Default (whitepaper) background should be white');
  assert(defaultHtml.includes('--text-primary: #1f2937'), 'Default (whitepaper) text should be dark gray');

  // Test 2: Compile with dark-blue
  const darkBlueHtml = convertMdToHtml('# Title', 'Title', 'dark-blue');
  assert(darkBlueHtml.includes('--bg-primary: #fafafa'), 'dark-blue light-mode background should be #fafafa');
  assert(darkBlueHtml.includes('--bg-primary: #0f172a'), 'dark-blue dark-mode background should be #0f172a');

  // Test 3: Malformed style falls back to whitepaper without crashing
  const originalConsoleError = console.error;
  let loggedError = false;
  console.error = () => { loggedError = true; };

  try {
    const invalidHtml = convertMdToHtml('# Title', 'Title', 'some-nonexistent-style');
    assert(invalidHtml.includes('--bg-primary: #ffffff'), 'Invalid style fallback should use whitepaper bg color');
    assert(loggedError, 'A warning/error log should have been recorded for the invalid style name');
  } finally {
    console.error = originalConsoleError;
  }
}

function testScanHelpers() {
  console.log('Testing scan-helpers.js...');
  const { getRepoSize, checkAgentRelevance, clearFileCache } = require('./scan-helpers');

  // Test 1: getRepoSize thresholds
  assert(getRepoSize(500, 5) === 'XS', 'getRepoSize returns XS for small codebase');
  assert(getRepoSize(1500, 10) === 'S', 'getRepoSize returns S for small-medium codebase');
  assert(getRepoSize(12000, 20) === 'M', 'getRepoSize returns M for medium codebase');
  assert(getRepoSize(60000, 50) === 'L', 'getRepoSize returns L for large codebase');
  assert(getRepoSize(200000, 100) === 'XL', 'getRepoSize returns XL for extra-large codebase');

  // Test 2: checkAgentRelevance for notebook-auditor
  const tempTestDir = path.join(ROOT, 'temp_scan_helpers_test_dir');
  if (!fs.existsSync(tempTestDir)) {
    fs.mkdirSync(tempTestDir, { recursive: true });
  }

  try {
    clearFileCache();
    const rel1 = checkAgentRelevance('notebook-auditor', tempTestDir);
    assert(rel1.relevance === 'Low', 'notebook-auditor has Low relevance when no notebooks exist');

    fs.writeFileSync(path.join(tempTestDir, 'test.ipynb'), '{}');
    clearFileCache();
    const rel2 = checkAgentRelevance('notebook-auditor', tempTestDir);
    assert(rel2.relevance === 'High', 'notebook-auditor has High relevance when notebook is added');

    clearFileCache();
    const relVCS = checkAgentRelevance('vcs-workflow-engineer', tempTestDir);
    assert(relVCS.relevance === 'High', 'vcs-workflow-engineer always has High relevance');

  } finally {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
    clearFileCache();
  }
}

function testInitialCodebaseScan() {
  console.log('Testing initial-codebase-scan.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'initial-codebase-scan.js');
  
  const tempScanDir = path.join(ROOT, 'temp_initial_scan_test_repo');
  if (fs.existsSync(tempScanDir)) {
    fs.rmSync(tempScanDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempScanDir, { recursive: true });
  
  try {
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(path.join(tempScanDir, `file${i}.js`), 'console.log("hello");\n');
    }
    
    const runResult = runScript(scriptPath, ['--target-path', `"${tempScanDir}"`, '--report-path', `"${tempScanDir}"`]);
    assert(runResult.code === 0, 'initial-codebase-scan.js exits with 0 on target path');
    
    const reportsDir = path.join(tempScanDir, '.repo-wizard', 'reports', 'temp_initial_scan_test_repo');
    const sessionJsonPath = path.join(reportsDir, 'session.json');
    const manifestJsonPath = path.join(reportsDir, 'manifest.json');
    
    assert(fs.existsSync(sessionJsonPath), 'session.json is created');
    assert(fs.existsSync(manifestJsonPath), 'manifest.json is created');
    
    const session = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf8'));
    assert(session.repoSize === 'XS', 'inferred repoSize is XS for a small target repo');
    
    const notebookObs = path.join(reportsDir, 'agents', 'temp_initial_scan_test_repo-observations-notebook-auditor.md');
    assert(fs.existsSync(notebookObs), 'skipped observations report generated for low-relevance notebook auditor');
    
  } finally {
    fs.rmSync(tempScanDir, { recursive: true, force: true });
  }
}

function testValidateScripts() {
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

function testValidateContracts() {
  console.log('Testing validate-contracts.js...');
  const { validateContract } = require('./validate-contracts');

  // Test 1: Valid contract
  const validContract = {
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: 'scaffold'
    },
    compliance_targets: [],
    tooling_specification: []
  };
  const errors1 = validateContract(validContract);
  assert(errors1.length === 0, 'validateContract accepts a valid contract');

  // Test 2: Invalid contract type
  const errors2 = validateContract("invalid");
  assert(errors2.length > 0 && errors2[0].includes('must be a valid JSON object'), 'fails on non-object contract');

  // Test 3: Missing task_metadata
  const errors3 = validateContract({ compliance_targets: [] });
  assert(errors3.length > 0 && errors3[0].includes('Missing or invalid "task_metadata"'), 'fails on missing task_metadata');

  // Test 4: Invalid execution_mode
  const errors4 = validateContract({
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: 'invalid_mode'
    }
  });
  assert(errors4.length > 0 && errors4.some(e => e.includes('execution_mode must be')), 'fails on invalid execution_mode');

  // Test 5: Missing backlog_parameters in backlog mode
  const errors5 = validateContract({
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: 'backlog'
    }
  });
  assert(errors5.length > 0 && errors5.some(e => e.includes('Missing "backlog_parameters"')), 'fails on missing backlog_parameters in backlog mode');
}

function runAll() {
  try {
    testValidateAgents();
    testValidateCommands();
    testValidateSkills();
    testValidateDocs();
    testRunOrchestration();
    testCompiledAnalysisPath();
    testValidateDeliverables();
    testReportStyling();
    testScanHelpers();
    testInitialCodebaseScan();
    testValidateScripts();
    testValidateContracts();

    console.log(`\nAll helper validator tests complete: ${testsPassed} / ${testsRun} assertions passed.`);
    process.exit(0);
  } catch (err) {
    console.error(`\nTest suite failed: ${err.message}`);
    process.exit(1);
  }
}

runAll();





