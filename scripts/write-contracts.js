#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ensureReportDirectories } = require('./scan-helpers');
const { RESET, BOLD, GREEN, RED, BLUE } = require('../solo-dev-toolkit/scripts/cli-helpers');

const args = process.argv.slice(2);
let reportPath = null;

const reportIdx = args.indexOf('--report-path');
if (reportIdx !== -1 && args[reportIdx + 1] && !args[reportIdx + 1].startsWith('-')) {
  reportPath = args[reportIdx + 1];
}

const resolvedReport = reportPath ? path.resolve(reportPath) : process.cwd();
const rootWizardDir = path.join(resolvedReport, '.repo-wizard');
const manifestPath = path.join(rootWizardDir, 'manifest.json');
const sessionPath = path.join(rootWizardDir, 'session.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`${RED}✗ Error: manifest.json not found at ${manifestPath}. Run initial scan first.${RESET}`);
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const repoName = manifest.repo_name || path.basename(resolvedReport).replace(/[^a-zA-Z0-9_\-\.]/g, '') || 'project';

  // Ensure directories exist
  const { reportsDir: REPORTS_DIR, contractsDir: CONTRACTS_DIR } = ensureReportDirectories(resolvedReport, repoName);

  // Sync config files
  fs.copyFileSync(manifestPath, path.join(REPORTS_DIR, 'manifest.json'));
  if (fs.existsSync(sessionPath)) {
    fs.copyFileSync(sessionPath, path.join(REPORTS_DIR, 'session.json'));
  }

  // Unpack contracts
  let count = 0;
  for (const c of manifest.contracts || []) {
    if (c.status !== 'skipped') {
      const contractPath = path.join(CONTRACTS_DIR, `${c.agent_name}-contract.json`);
      fs.writeFileSync(contractPath, JSON.stringify(c.contract, null, 2), 'utf8');
      count++;
    }
  }

  console.log(`${GREEN}✓ Success:${RESET} Unpacked ${BOLD}${count}${RESET} active contracts to ${BLUE}${CONTRACTS_DIR}${RESET}`);
  process.exit(0);
} catch (e) {
  console.error(`${RED}✗ Error writing contracts: ${e.message}${RESET}`);
  process.exit(1);
}
