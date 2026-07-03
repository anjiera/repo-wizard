#!/usr/bin/env node
/**
 * reports-compile.js
 *
 * Command-line utility to compile specialist observations and generate
 * Repo Wizard reports (Executive Summary, Full Report, Observations, backlog.csv).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { compileRealReports, getSafeRepoName } = require('./reports-compiler-engine');

const { RESET, BOLD, GREEN, RED, BLUE } = require('../solo-dev-toolkit/scripts/cli-helpers');
const ROOT = require('./root-resolver');

console.log(`${BLUE}==>${RESET} ${BOLD}Compiling Repo Wizard reports from specialist observations...${RESET}`);

let reportStyleOverride = null;
const styleIdx = process.argv.indexOf('--report-style');
if (styleIdx !== -1 && process.argv[styleIdx + 1] && !process.argv[styleIdx + 1].startsWith('-')) {
  reportStyleOverride = process.argv[styleIdx + 1];
  process.argv.splice(styleIdx, 2);
}

let sessionPath = process.argv[2];

if (!sessionPath) {
  const sessionPointerPath = path.join(ROOT, '.repo-wizard', 'last_session_path.json');
  if (fs.existsSync(sessionPointerPath)) {
    try {
      const pointer = JSON.parse(fs.readFileSync(sessionPointerPath, 'utf8'));
      if (pointer && pointer.lastSessionPath) {
        sessionPath = pointer.lastSessionPath;
      }
    } catch (e) {}
  }
}

if (!sessionPath) {
  const defaultPath = path.join(ROOT, '.repo-wizard', 'session.json');
  if (fs.existsSync(defaultPath)) {
    sessionPath = defaultPath;
  }
}

if (!sessionPath) {
  console.error(`${RED}✗ Error:${RESET} No active session found. Please run the onboarding wizard first.`);
  process.exit(1);
}

try {
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  if (reportStyleOverride) {
    session.reportStyle = reportStyleOverride;
  }
  
  compileRealReports(session);
  console.log(`${GREEN}✓ Reports compiled successfully!${RESET}\n`);

  const workspaceDir = session.targetPath || ROOT;
  const repoName = getSafeRepoName(workspaceDir);
  const reportsRoot = session.reportPath ? path.join(path.resolve(session.reportPath), '.repo-wizard', 'reports') : path.join(ROOT, '.repo-wizard', 'reports');
  const reportsDir = path.join(reportsRoot, repoName);
  console.log(`${BOLD}Generated deliverables:${RESET}`);
  console.log(`  - Executive Summary:  [${repoName}-executive-summary.md](file:///${path.join(reportsDir, repoName + '-executive-summary.md').replace(/\\/g, '/')})`);
  console.log(`  - Full Tech Report:   [${repoName}-full-report.md](file:///${path.join(reportsDir, repoName + '-full-report.md').replace(/\\/g, '/')})`);
  console.log(`  - Observations List:  [${repoName}-observations.md](file:///${path.join(reportsDir, repoName + '-observations.md').replace(/\\/g, '/')})`);
  if (session.mode === 'backlog') {
    console.log(`  - Backlog CSV:        [backlog.csv](file:///${path.join(reportsDir, 'backlog.csv').replace(/\\/g, '/')})`);
  }
  console.log('');
} catch (err) {
  console.error(`${RED}✗ Error compiling reports:${RESET}`, err.stack);
  process.exit(1);
}
