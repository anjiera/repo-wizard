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
const { compileRealReports } = require('./dashboard-server');
const { archiveSession } = require('./reports-archive');

// ANSI escape codes for colorized CLI output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

console.log(`${BLUE}==>${RESET} ${BOLD}Compiling Repo Wizard reports from specialist observations...${RESET}`);

const pointerPath = path.join(__dirname, '..', '.repo-wizard', 'last_session_path.json');
let sessionPath = '';

if (fs.existsSync(pointerPath)) {
  try {
    const ptr = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
    if (ptr.lastSessionPath && fs.existsSync(ptr.lastSessionPath)) {
      sessionPath = ptr.lastSessionPath;
    }
  } catch (e) {
    // Ignore and fallback
  }
}

if (!sessionPath) {
  const defaultPath = path.join(__dirname, '..', '.repo-wizard', 'session.json');
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
  
  // Archive prior session and report files before compiling new ones
  const workspaceDir = path.dirname(path.dirname(sessionPath));
  archiveSession(workspaceDir);
  
  compileRealReports(session);
  console.log(`${GREEN}✓ Reports compiled successfully!${RESET}`);
} catch (err) {
  console.error(`${RED}✗ Error compiling reports:${RESET}`, err.stack);
  process.exit(1);
}
