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
if (styleIdx !== -1) {
  if (process.argv[styleIdx + 1] && !process.argv[styleIdx + 1].startsWith('-')) {
    reportStyleOverride = process.argv[styleIdx + 1];
    process.argv.splice(styleIdx, 2);
  } else {
    process.argv.splice(styleIdx, 1);
  }
}

let isRedactOverride = false;
const redactIdx = process.argv.indexOf('--redact');
if (redactIdx !== -1) {
  isRedactOverride = true;
  process.argv.splice(redactIdx, 1);
}

let agentOverride = null;
const agentIdx = process.argv.indexOf('--agent');
if (agentIdx !== -1) {
  if (process.argv[agentIdx + 1] && !process.argv[agentIdx + 1].startsWith('-')) {
    agentOverride = process.argv[agentIdx + 1];
    process.argv.splice(agentIdx, 2);
  } else {
    process.argv.splice(agentIdx, 1);
  }
}

let headlessOverride = false;
const headlessIdx = process.argv.indexOf('--headless');
if (headlessIdx !== -1) {
  headlessOverride = true;
  process.argv.splice(headlessIdx, 1);
}

// Find first non-flag argument in remaining arguments for sessionPath
let sessionPath = process.argv.slice(2).find(arg => !arg.startsWith('-'));

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

// Validate path to prevent path traversal or writing to arbitrary directories
const resolvedSessionPath = path.resolve(sessionPath);
if (!resolvedSessionPath.startsWith(ROOT) || path.extname(resolvedSessionPath) !== '.json') {
  console.error(`${RED}✗ Error:${RESET} Invalid session file path. Path must reside within the workspace and have a .json extension.`);
  process.exit(1);
}

try {
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  if (reportStyleOverride) {
    session.reportStyle = reportStyleOverride;
  }
  if (isRedactOverride) {
    session.redact = true;
  }
  if (headlessOverride || process.env.HEADLESS === 'true') {
    session.headless = true;
  } else {
    // If not explicitly headless, ensure it updates/clears or reflects the correct state.
    // In on-demand compilations we can set it to false if --headless is not passed
    session.headless = false;
  }
  if (agentOverride) {
    session.agent = agentOverride;
  }
  
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');
  
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
  console.log(`  - Backlog CSV:        [backlog.csv](file:///${path.join(reportsDir, 'backlog.csv').replace(/\\/g, '/')})`);
  if (session.isRedact || session.redact) {
    console.log(`\n${BOLD}Redacted deliverables:${RESET}`);
    console.log(`  - Redacted Exec Summary:  [redacted-executive-summary.md](file:///${path.join(reportsDir, 'redacted-executive-summary.md').replace(/\\/g, '/')})`);
    console.log(`  - Redacted Full Report:   [redacted-${repoName}-full-report.md](file:///${path.join(reportsDir, `redacted-${repoName}-full-report.md`).replace(/\\/g, '/')})`);
  }
  console.log('');
} catch (err) {
  console.error(`${RED}✗ Error compiling reports:${RESET}`, err.stack);
  process.exit(1);
}
