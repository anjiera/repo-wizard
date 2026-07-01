#!/usr/bin/env node
/**
 * validate-scripts.js
 *
 * Validates that production JavaScript scripts do not contain "cheating" code,
 * such as dummy text multipliers, padding paragraphs, or mock variables
 * designed to bypass deliverable verification.
 *
 * Checks:
 *   - Production script files do not contain the specific word-count cheating paragraph.
 *   - Production script files do not contain suspicious string-repeat padding multipliers.
 *   - Any mock/dummy text variables are strictly isolated to test/mock files or mock functions.
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ANSI escape codes for premium console styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIRS = [
  path.join(ROOT, 'scripts'),
  path.join(ROOT, 'solo-dev-toolkit', 'scripts')
];

// Patterns representing cheating or padding logic (split regex strings to prevent self-matching)
const CHEATING_PARAGRAPH_REGEX = new RegExp('This is paragraph' + ' number.*to ensure that we meet the required word count', 'i');
const SUSPICIOUS_REPEAT_REGEX = /(?:'|")\s*(?:word|sentence|dummy|text|lorem|ipsum)\s*(?:'|")\s*\.repeat\s*\(\s*\d+\s*\)/i;
const SUSPICIOUS_VAR_REGEX = /const\s+(?:dummyText|dummyOverview)\s*=/i;

function validateFile(filePath) {
  const errors = [];
  const relativePath = path.relative(ROOT, filePath);

  // Skip files explicitly marked as mocks or tests in their path
  if (relativePath.toLowerCase().includes('mock') || relativePath.toLowerCase().includes('test')) {
    return errors;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    errors.push(`Unreadable file: ${err.message}`);
    return errors;
  }

  // Parse lines to support block exemptions via standard // mock-start / // mock-end comments
  const lines = content.split(/\r?\n/);
  let isInsideMockBlock = false;
  const filteredLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\/\/\s*mock-start\b/i.test(line)) {
      isInsideMockBlock = true;
      continue;
    }
    if (/^\/\/\s*mock-end\b/i.test(line)) {
      isInsideMockBlock = false;
      continue;
    }
    if (!isInsideMockBlock) {
      filteredLines.push(line);
    }
  }

  const scanContent = filteredLines.join('\n');

  // Check 1: Padding paragraph cheat
  if (CHEATING_PARAGRAPH_REGEX.test(scanContent)) {
    errors.push('Contains the word-count cheating paragraph used to pad report deliverables.');
  }

  // Check 2: Suspicious string repetition/multipliers
  if (SUSPICIOUS_REPEAT_REGEX.test(scanContent)) {
    const match = scanContent.match(SUSPICIOUS_REPEAT_REGEX);
    errors.push(`Contains suspicious string repetition multiplier: ${match[0]}`);
  }

  // Check 3: Suspicious mock variables in production files
  if (SUSPICIOUS_VAR_REGEX.test(scanContent)) {
    const match = scanContent.match(SUSPICIOUS_VAR_REGEX);
    errors.push(`Contains suspicious mock variable declaration: "${match[0]}"`);
  }

  return errors;
}

function scanDir(dirPath, filesList = []) {
  if (!fs.existsSync(dirPath)) return filesList;
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath, filesList);
    } else if (stat.isFile() && item.endsWith('.js')) {
      filesList.push(fullPath);
    }
  }

  return filesList;
}

function main() {
  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Checking scripts for cheating / padding logic...${RESET}`);

  const files = [];
  for (const dir of SCRIPTS_DIRS) {
    scanDir(dir, files);
  }

  let totalErrors = 0;

  for (const file of files) {
    const errors = validateFile(file);
    const relativePath = path.relative(ROOT, file);

    if (errors.length === 0) {
      console.log(`  ${GREEN}✓${RESET}  ${relativePath}`);
    } else {
      console.log(`  ${RED}✗${RESET}  ${relativePath}`);
      for (const msg of errors) {
        console.log(`       ${RED}ERROR:${RESET} ${msg}`);
      }
      totalErrors += errors.length;
    }
  }

  if (totalErrors > 0) {
    console.log(`\n${BOLD}${RED}${files.length} scripts checked — ${totalErrors} error(s) found${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}${files.length} scripts checked — ${totalErrors} error(s) found${RESET}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`\nERROR: validate-scripts failed unexpectedly: ${err.message}`);
  process.exit(1);
}
