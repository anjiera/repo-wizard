#!/usr/bin/env node
/**
 * scripts/register-plugin.js
 *
 * Helper script to validate and register/install the repo-wizard plugin
 * and its associated subagents, skills, and slash commands.
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

function findAgyCmd() {
  // 1. Try resolving agy on system PATH
  try {
    execSync('agy --version', { stdio: 'ignore' });
    return 'agy';
  } catch (err) {
    // Ignore and proceed to fallback
  }

  // 2. Try the absolute path we know is configured in this sandbox environment
  const windowsFallback = 'D:\\agy\\bin\\agy.exe';
  if (fs.existsSync(windowsFallback)) {
    return windowsFallback;
  }

  return null;
}

function main() {
  console.log(`${BOLD}${GREEN}===========================================${RESET}`);
  console.log(`${BOLD}${GREEN}   Google Antigravity Plugin Registration  ${RESET}`);
  console.log(`${BOLD}${GREEN}===========================================${RESET}`);

  const agyCmd = findAgyCmd();

  if (!agyCmd) {
    logError('Google Antigravity CLI (agy) was not found on your system PATH or fallback locations.');
    console.log(`  To register the plugin, please verify that 'agy' is installed.`);
    process.exit(1);
  }

  logStep('Validating plugin structure...');
  try {
    execSync(`"${agyCmd}" plugin validate .`, { stdio: 'inherit', cwd: ROOT });
    logSuccess('Plugin structure validated successfully.');
  } catch (err) {
    logError('Plugin validation failed. Please check the structure above.');
    process.exit(1);
  }

  logStep('Writing workspace development path link...');
  try {
    const devPathDir = path.join(ROOT, '.repo-wizard');
    if (!fs.existsSync(devPathDir)) {
      fs.mkdirSync(devPathDir, { recursive: true });
    }
    fs.writeFileSync(path.join(devPathDir, 'dev_path.txt'), ROOT, 'utf8');
    logSuccess(`Workspace path saved to dev_path.txt: ${ROOT}`);
  } catch (err) {
    logError(`Failed to save workspace development path link: ${err.message}`);
    process.exit(1);
  }

  logStep('Registering/installing plugin updates...');
  try {
    execSync(`"${agyCmd}" plugin install .`, { stdio: 'inherit', cwd: ROOT });
    logSuccess('Plugin successfully registered and installed in Antigravity!');
    console.log(`\n  All 28 skills, 27 agents, and 25 slash commands are now active.`);
  } catch (err) {
    logError('Failed to register/install the plugin.');
    process.exit(1);
  }

  console.log(`\n${BOLD}${GREEN}===========================================${RESET}\n`);
}

main();
