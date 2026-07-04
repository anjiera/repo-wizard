#!/usr/bin/env node
/**
 * scripts/update-session-size.js
 *
 * Safely updates the repoSize in both the root and reports session.json files
 * to prevent agents from corrupting Windows paths or writing incomplete files.
 *
 * Usage:
 *   node scripts/update-session-size.js --size <XS|S|M|L|XL>
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

const ROOT = path.resolve(__dirname, '..');

// Parse args
const args = process.argv.slice(2);
const sizeIdx = args.indexOf('--size');
let newSize = null;

if (sizeIdx !== -1 && args[sizeIdx + 1]) {
  newSize = args[sizeIdx + 1].toUpperCase();
}

const VALID_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

if (!newSize || !VALID_SIZES.includes(newSize)) {
  console.error(`${RED}✗ Error: Invalid or missing size. Must be one of: ${VALID_SIZES.join(', ')}.${RESET}`);
  console.log('Usage: node scripts/update-session-size.js --size <XS|S|M|L|XL>');
  process.exit(1);
}

// 1. Resolve paths to session.json
const rootSessionPath = path.join(ROOT, '.repo-wizard', 'session.json');
const pointerPath = path.join(ROOT, '.repo-wizard', 'last_session_path.json');
let reportsSessionPath = null;

if (fs.existsSync(pointerPath)) {
  try {
    const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
    if (pointer && pointer.lastSessionPath) {
      reportsSessionPath = pointer.lastSessionPath;
    }
  } catch (e) {
    // Ignore and fallback
  }
}

const targets = [];
if (fs.existsSync(rootSessionPath)) {
  targets.push(rootSessionPath);
}
if (reportsSessionPath && fs.existsSync(reportsSessionPath) && reportsSessionPath !== rootSessionPath) {
  targets.push(reportsSessionPath);
}

if (targets.length === 0) {
  console.error(`${RED}✗ Error: No session.json file found to update.${RESET}`);
  process.exit(1);
}

console.log(`${BLUE}==>${RESET} Updating session repository size to ${BOLD}${newSize}${RESET}...`);

let updatedCount = 0;

for (const sessionFile of targets) {
  try {
    const content = fs.readFileSync(sessionFile, 'utf8');
    const session = JSON.parse(content);
    
    // Update size
    session.repoSize = newSize;
    
    // Normalize paths to forward slashes just in case
    if (session.targetPath) {
      session.targetPath = session.targetPath.replace(/\\/g, '/');
    }
    if (session.reportPath) {
      session.reportPath = session.reportPath.replace(/\\/g, '/');
    }

    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2), 'utf8');
    console.log(`  ✓ Updated: ${sessionFile}`);
    updatedCount++;
  } catch (err) {
    console.error(`${RED}  ✗ Failed to update ${sessionFile}: ${err.message}${RESET}`);
  }
}

if (updatedCount > 0) {
  console.log(`${GREEN}✓ Success: Sizing tier updated successfully in ${updatedCount} session file(s).${RESET}\n`);
  process.exit(0);
} else {
  console.error(`${RED}✗ Error: Failed to update any session files.${RESET}`);
  process.exit(1);
}
