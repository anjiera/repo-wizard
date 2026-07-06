#!/usr/bin/env node
/**
 * run-adk-orchestrator.js
 *
 * Primary orchestrator entry point that invokes the Google ADK InMemoryRunner.
 * Parses the --report-path and coordinates the execution of the LlmAgents.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { runPipeline } = require('../dist/orchestration/runner.js');
const { ensureReportDirectories } = require('./scan-helpers');
const { RESET, BOLD, GREEN, RED, BLUE } = require('../solo-dev-toolkit/scripts/cli-helpers');

const ROOT = require('./root-resolver');

let targetPath = process.cwd();
let resolvedTarget = path.resolve(targetPath);

if (!fs.existsSync(resolvedTarget)) {
  console.error(`ERROR: Target directory "${resolvedTarget}" does not exist on disk.`);
  process.exit(1);
}

// Parse --report-path flag
let reportPath = null;
const reportPathIdx = process.argv.indexOf('--report-path');
if (reportPathIdx !== -1 && process.argv[reportPathIdx + 1] && !process.argv[reportPathIdx + 1].startsWith('-')) {
  reportPath = process.argv[reportPathIdx + 1];
}
const reportRoot = reportPath ? path.resolve(reportPath) : ROOT;

let repoName = process.env.MOCK_REPO_NAME;
if (!repoName) {
  repoName = path.basename(resolvedTarget).replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!repoName || repoName === '.' || repoName === '..' || repoName.toLowerCase() === 'reports' || repoName.toLowerCase() === 'history') {
    repoName = 'project';
  }
}

const { reportsDir: REPORTS_DIR } = ensureReportDirectories(reportRoot, repoName);
const manifestPath = path.join(REPORTS_DIR, 'manifest.json');

async function main() {
  console.log(`\n${BLUE}==>${RESET} ${BOLD}Repo Wizard ADK Runner has started. This analysis conducts deep codebase diagnostics and runs specialist subagents natively via ADK.${RESET}\n`);

  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: Manifest file not found at ${manifestPath}`);
    process.exit(1);
  }

  console.log(`Execution Mode: ADK Native Runner (Node.js InMemoryRunner)`);
  
  try {
    // Invoke the ADK Runner Pipeline!
    await runPipeline(manifestPath);
    console.log(`\n${GREEN}✓ ADK Orchestration complete!${RESET}`);
    process.exit(0);
  } catch (err) {
    console.error(`\n${RED}✗ ADK Pipeline Error:${RESET} ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
