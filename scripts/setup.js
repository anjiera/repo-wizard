#!/usr/bin/env node
/**
 * scripts/setup.js
 *
 * Unified cross-platform setup orchestrator for Repo Wizard.
 * - Verifies Node.js version (>= 18)
 * - Verifies Git installation
 * - Installs native Git pre-commit hooks
 * - Executes all structural validators and local test suites
 * - Checks for optional LLM evaluation prerequisites (GEMINI_API_KEY)
 * - Checks for agy CLI to validate plugin integrity
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ANSI escape codes for premium console styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';

function logStep(msg) {
  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}${msg}${RESET}`);
}

function logSuccess(msg) {
  console.log(`${GREEN}✓ ${msg}${RESET}`);
}

function logWarning(msg) {
  console.log(`${YELLOW}⚠ ${msg}${RESET}`);
}

function logError(msg) {
  console.error(`${RED}✗ ${msg}${RESET}`);
}

function checkNodeVersion() {
  const majorVersion = parseInt(process.versions.node.split('.')[0], 10);
  if (majorVersion < 18) {
    logError(`Node.js version 18 or higher is required. Current version is ${process.version}.`);
    process.exit(1);
  }
  logSuccess(`Node.js version check passed: ${process.version}`);
}

function checkGitInstalled() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    logSuccess('Git is installed');
  } catch (err) {
    logError('Git was not found on your path. Please install Git to continue.');
    process.exit(1);
  }
}

function installHooks() {
  logStep('Installing Git hooks...');
  try {
    execSync('node scripts/install-hooks.js', { stdio: 'inherit', cwd: ROOT });
    execSync('node solo-dev-toolkit/scripts/sdt-install-hooks.js', { stdio: 'inherit', cwd: ROOT });
  } catch (err) {
    logError('Failed to install Git hooks.');
    process.exit(1);
  }
}

function runValidationsAndTests() {
  logStep('Running repository validation and test suite...');
  
  const tasks = [
    { name: 'validate-skills.js', cmd: 'node scripts/validate-skills.js' },
    { name: 'validate-commands.js', cmd: 'node scripts/validate-commands.js' },
    { name: 'validate-agents.js', cmd: 'node scripts/validate-agents.js' },
    { name: 'validate-docs.js', cmd: 'node scripts/validate-docs.js' },
    { name: 'test-helpers.js', cmd: 'node scripts/test-helpers.js' },
    { name: 'sdt-test-helpers.js', cmd: 'node solo-dev-toolkit/scripts/sdt-test-helpers.js' },
    { name: 'run-e2e-tests.js', cmd: 'node scripts/run-e2e-tests.js' }
  ];

  for (const task of tasks) {
    console.log(`Running ${task.name}...`);
    try {
      execSync(task.cmd, { stdio: 'inherit', cwd: ROOT });
      logSuccess(`${task.name} passed`);
    } catch (err) {
      logError(`${task.name} failed. Setup aborted.`);
      process.exit(1);
    }
  }
}

function checkGeminiKey() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('');
    logWarning('GEMINI_API_KEY environment variable is not set.');
    console.log(`  Dynamic LLM-as-a-Judge evaluations (${CYAN}node scripts/run-evals.js${RESET}) will be skipped.`);
    console.log(`  To run evals locally, obtain an API key and set it in your shell:`);
    console.log(`    PowerShell: ${CYAN}$env:GEMINI_API_KEY="your-key"${RESET}`);
    console.log(`    Bash:       ${CYAN}export GEMINI_API_KEY="your-key"${RESET}`);
  } else {
    logSuccess('GEMINI_API_KEY is configured for judge evaluations');
  }
}

function checkAgyCli() {
  let agyCmd = null;
  try {
    execSync('agy --version', { stdio: 'ignore' });
    agyCmd = 'agy';
  } catch (err) {
    // agy is not installed on path
  }

  if (!agyCmd) {
    const fallbackPath = 'D:\\agy\\bin\\agy.exe';
    if (fs.existsSync(fallbackPath)) {
      agyCmd = fallbackPath;
    }
  }

  if (agyCmd) {
    logStep('Validating Antigravity plugin structure...');
    try {
      execSync(`"${agyCmd}" plugin validate .`, { stdio: 'inherit', cwd: ROOT });
      logSuccess('Antigravity plugin structure is valid');
      
      if (agyCmd !== 'agy') {
        console.log('');
        logWarning(`Google Antigravity CLI (agy) is at ${CYAN}${agyCmd}${RESET} but is not on your system PATH.`);
        console.log(`  To add it to your PATH on Windows, see the instructions below.`);
      }
    } catch (err) {
      logWarning('Antigravity plugin validation returned warnings or errors.');
    }
  } else {
    console.log('');
    logWarning('Google Antigravity CLI (agy) was not found in your environment path.');
    console.log(`  To use this repository as a native Antigravity plugin, make sure the CLI is installed.`);
    console.log(`  You can register this local plugin directory via:`);
    console.log(`    node scripts/register-plugin.js`);
  }
}

function main() {
  console.log(`${BOLD}${GREEN}===========================================${RESET}`);
  console.log(`${BOLD}${GREEN}   Repo Wizard Environment Setup & Verification${RESET}`);
  console.log(`${BOLD}${GREEN}===========================================${RESET}`);
  
  checkNodeVersion();
  checkGitInstalled();
  installHooks();
  runValidationsAndTests();
  checkGeminiKey();
  checkAgyCli();

  console.log(`\n${BOLD}${GREEN}==================================================${RESET}`);
  console.log(`${BOLD}${GREEN}✓ Setup complete! Repo Wizard is ready for development.${RESET}`);
  console.log(`\n  To launch the interactive dashboard GUI, run:`);
  console.log(`    ${CYAN}node scripts/dashboard-server.js${RESET}`);
  console.log(`${BOLD}${GREEN}==================================================${RESET}\n`);
}

main();


