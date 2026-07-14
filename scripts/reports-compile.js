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
const url = require('url');
const { compileRealReports, getSafeRepoName } = require('./reports-compiler-engine');

const { RESET, BOLD, GREEN, RED, BLUE } = require('../solo-dev-toolkit/scripts/cli-helpers');
const ROOT = require('./root-resolver');

console.log(`${BLUE}==>${RESET} ${BOLD}Compiling Repo Wizard reports from specialist observations...${RESET}`);

let reportStyleOverride = null;
let reportPathOverride = null;
let isRedactOverride = false;
let agentOverride = null;
let headlessOverride = false;
let pillarOverride = null;
let sessionPath = null;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--report-style') {
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      reportStyleOverride = args[i + 1];
      i++;
    }
  } else if (arg === '--report-path') {
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      reportPathOverride = args[i + 1];
      i++;
    }
  } else if (arg === '--agent') {
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      agentOverride = args[i + 1];
      i++;
    }
  } else if (arg === '--pillar') {
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      pillarOverride = args[i + 1];
      i++;
    }
  } else if (arg === '--redact') {
    isRedactOverride = true;
  } else if (arg === '--headless') {
    headlessOverride = true;
  } else if (arg.startsWith('-')) {
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      i++;
    }
  } else {
    if (!sessionPath) {
      sessionPath = arg;
    }
  }
}

if (!sessionPath) {
  const baseDir = reportPathOverride ? path.resolve(ROOT, reportPathOverride) : ROOT;
  const sessionPointerPath = path.join(baseDir, '.repo-wizard', 'last_session_path.json');
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
  const baseDir = reportPathOverride ? path.resolve(ROOT, reportPathOverride) : ROOT;
  const defaultPath = path.join(baseDir, '.repo-wizard', 'session.json');
  if (fs.existsSync(defaultPath)) {
    sessionPath = defaultPath;
  }
}

// Validate path to prevent path traversal or writing to arbitrary directories
if (!sessionPath) {
  console.error(`${RED}✗ Error:${RESET} Active session file not found. Please run the codebase scan first.`);
  process.exit(1);
}

if (!fs.existsSync(sessionPath)) {
  console.error(`${RED}✗ Error:${RESET} Session file not found at "${sessionPath}".`);
  process.exit(1);
}

const resolvedSessionPath = path.resolve(sessionPath);
const baseDir = reportPathOverride ? path.resolve(ROOT, reportPathOverride) : ROOT;
const relative = path.relative(baseDir, resolvedSessionPath);
if (relative.startsWith('..') || path.isAbsolute(relative) || path.extname(resolvedSessionPath) !== '.json') {
  console.error(`${RED}✗ Error:${RESET} Invalid session file path. Path must reside within the workspace and have a .json extension.`);
  process.exit(1);
}

try {
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  if (reportStyleOverride) {
    session.reportStyle = reportStyleOverride;
  }
  if (reportPathOverride) {
    session.reportPath = reportPathOverride;
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
  if (pillarOverride) {
    session.pillar = pillarOverride;
  }
  
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');
  
  compileRealReports(session);
  console.log(`${GREEN}✓ Reports compiled successfully!${RESET}\n`);

  const workspaceDir = session.targetPath || ROOT;
  const repoName = getSafeRepoName(workspaceDir);
  const reportsRoot = session.reportPath ? path.join(path.resolve(session.reportPath), '.repo-wizard', 'reports') : path.join(ROOT, '.repo-wizard', 'reports');
  const reportsDir = path.join(reportsRoot, repoName);
  const execUrl = url.pathToFileURL(path.join(reportsDir, repoName + '-executive-summary.md')).toString();
  const fullUrl = url.pathToFileURL(path.join(reportsDir, repoName + '-full-report.md')).toString();
  const obsUrl = url.pathToFileURL(path.join(reportsDir, repoName + '-observations.md')).toString();
  const csvUrl = url.pathToFileURL(path.join(reportsDir, 'backlog.csv')).toString();

  console.log(`${BOLD}Generated deliverables:${RESET}`);
  console.log(`  - Executive Summary:  [${repoName}-executive-summary.md](${execUrl})`);
  console.log(`  - Full Tech Report:   [${repoName}-full-report.md](${fullUrl})`);
  console.log(`  - Observations List:  [${repoName}-observations.md](${obsUrl})`);
  console.log(`  - Backlog CSV:        [backlog.csv](${csvUrl})`);
  if (session.isRedact || session.redact) {
    const redactedExecUrl = url.pathToFileURL(path.join(reportsDir, 'redacted-executive-summary.md')).toString();
    const redactedFullUrl = url.pathToFileURL(path.join(reportsDir, `redacted-${repoName}-full-report.md`)).toString();
    console.log(`\n${BOLD}Redacted deliverables:${RESET}`);
    console.log(`  - Redacted Exec Summary:  [redacted-executive-summary.md](${redactedExecUrl})`);
    console.log(`  - Redacted Full Report:   [redacted-${repoName}-full-report.md](${redactedFullUrl})`);
  }
  console.log('');
} catch (err) {
  console.error(`${RED}✗ Error compiling reports:${RESET}`, err.stack);
  process.exit(1);
}
