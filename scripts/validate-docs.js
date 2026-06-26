#!/usr/bin/env node
/**
 * scripts/validate-docs.js
 *
 * Enforces documentation upkeep checks in the pre-commit hook:
 * 1. References Directory: Every file in references/ (excluding README) must be cataloged in references/README.md.
 * 2. Agent Matrix Coverage: Every agent in agents/ must be listed in docs/AGENT_MATRIX.md.
 * 3. Skill Matrix Coverage: Every skill directory in skills/ must be listed in docs/AGENT_MATRIX.md.
 * 4. Main Navigation Coverage: Every guide in docs/ (excluding generated HTML files) must be referenced in the root README.md.
 *
 * Exit codes: 0 = all clear, 1 = validation errors
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
const YELLOW = '\x1b[33m';

const ROOT = path.resolve(__dirname, '..');
const REFS_DIR = path.join(ROOT, 'references');
const REFS_INDEX = path.join(REFS_DIR, 'README.md');
const AGENTS_DIR = path.join(ROOT, 'agents');
const MATRIX_FILE = path.join(ROOT, 'docs', 'AGENT_MATRIX.md');
const SKILLS_DIR = path.join(ROOT, 'skills');
const DOCS_DIR = path.join(ROOT, 'docs');
const README_FILE = path.join(ROOT, 'README.md');
const AGENTS_MD_FILE = path.join(ROOT, 'AGENTS.md');
const MAX_AGENTS_MD_LINES = 300;

let totalErrors = 0;

function reportError(msg) {
  totalErrors++;
  console.log(`  ${RED}✗ ERROR:${RESET} ${msg}`);
}

function validateReferencesIndex() {
  console.log('Checking References catalog coverage (references/README.md)...');
  if (!fs.existsSync(REFS_INDEX)) {
    reportError('references/README.md is missing.');
    return;
  }

  const indexContent = fs.readFileSync(REFS_INDEX, 'utf8');
  const files = fs.readdirSync(REFS_DIR)
    .filter(f => fs.statSync(path.join(REFS_DIR, f)).isFile() && f !== 'README.md' && f !== 'README.html' && !f.startsWith('.') && !f.endsWith('.swp'));

  for (const file of files) {
    if (!indexContent.includes(file)) {
      reportError(`Reference file '${file}' is not indexed in references/README.md. Please add it to the catalog.`);
    }
  }
}

function validateAgentMatrix() {
  console.log('Checking Agent Matrix coverage (docs/AGENT_MATRIX.md)...');
  if (!fs.existsSync(MATRIX_FILE)) {
    reportError('docs/AGENT_MATRIX.md is missing.');
    return;
  }

  const matrixContent = fs.readFileSync(MATRIX_FILE, 'utf8');
  const agentFiles = fs.readdirSync(AGENTS_DIR)
    .filter(f => fs.statSync(path.join(AGENTS_DIR, f)).isFile() && f.endsWith('.md') && !f.startsWith('.') && !f.endsWith('.swp'));

  for (const file of agentFiles) {
    // Remove extension to find matching persona names (e.g. "legal-neutrality-agent")
    const agentName = path.basename(file, '.md');
    if (!matrixContent.includes(agentName)) {
      reportError(`Agent persona '${agentName}' is not listed in docs/AGENT_MATRIX.md. Please add it to the taxonomy matrix.`);
    }
  }
}

function validateSkillMatrix() {
  console.log('Checking Skills Matrix coverage (docs/AGENT_MATRIX.md)...');
  if (!fs.existsSync(MATRIX_FILE)) return;

  const matrixContent = fs.readFileSync(MATRIX_FILE, 'utf8');
  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory() && !d.startsWith('.'));

  for (const dir of skillDirs) {
    if (!matrixContent.includes(dir)) {
      reportError(`Skill directory '${dir}' is not listed in docs/AGENT_MATRIX.md. Please add it to the taxonomy matrix.`);
    }
  }
}

function validateReadmeNavigation() {
  console.log('Checking Main README navigation map (README.md)...');
  if (!fs.existsSync(README_FILE)) {
    reportError('Root README.md is missing.');
    return;
  }

  const readmeContent = fs.readFileSync(README_FILE, 'utf8');
  const docsFiles = fs.readdirSync(DOCS_DIR)
    .filter(f => fs.statSync(path.join(DOCS_DIR, f)).isFile() && f.endsWith('.md') && f !== 'README.md' && !f.startsWith('.') && !f.endsWith('.swp'));

  for (const file of docsFiles) {
    if (!readmeContent.includes(file)) {
      reportError(`Documentation file 'docs/${file}' is not mapped in root README.md. Please add it to the Documentation & Navigation Map section.`);
    }
  }
}

const { execSync } = require('child_process');

function runGenericValidateDocs() {
  try {
    execSync('node solo-dev-toolkit/scripts/validate-docs.js', { stdio: 'inherit', cwd: ROOT });
  } catch (err) {
    totalErrors++;
  }
}

function main() {
  validateReferencesIndex();
  validateAgentMatrix();
  validateSkillMatrix();
  validateReadmeNavigation();
  runGenericValidateDocs();

  if (totalErrors > 0) {
    console.log(`\n${BOLD}${RED}Documentation check complete: ${totalErrors} error(s) found.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}✓ All documentation upkeep audits passed successfully.${RESET}`);
    process.exit(0);
  }
}

main();
