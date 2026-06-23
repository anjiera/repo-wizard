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

const ROOT = path.resolve(__dirname, '..');
const REFS_DIR = path.join(ROOT, 'references');
const REFS_INDEX = path.join(REFS_DIR, 'README.md');
const AGENTS_DIR = path.join(ROOT, 'agents');
const MATRIX_FILE = path.join(ROOT, 'docs', 'AGENT_MATRIX.md');
const SKILLS_DIR = path.join(ROOT, 'skills');
const DOCS_DIR = path.join(ROOT, 'docs');
const README_FILE = path.join(ROOT, 'README.md');

let totalErrors = 0;

function reportError(msg) {
  totalErrors++;
  console.log(`  ✗ ERROR: ${msg}`);
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

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F7E0}-\u{1F7E9}]/gu;
const approvedSymbols = [
  '🟢', '🔵', '⚪', '🟡', '🔴', '⚫',
  '✓', '✗', '⚠',
  '\u2713', '\u2717', '\u26A0'
];

function scanForEmojis(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === '.repo-wizard' || entry.name === 'node_modules' || entry.name === 'temp_e2e_sandbox') {
        continue;
      }
      scanForEmojis(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === '.md' || ext === '.js' || ext === '.sh' || ext === '.ps1' || ext === '.json' || ext === '.toml') {
        let content;
        try {
          content = fs.readFileSync(fullPath, 'utf8');
        } catch (err) {
          continue;
        }
        const matches = content.match(emojiRegex);
        if (matches) {
          const offenders = matches.filter(m => !approvedSymbols.includes(m));
          if (offenders.length > 0) {
            const relPath = path.relative(ROOT, fullPath);
            reportError(`File '${relPath}' contains unapproved emojis: ${Array.from(new Set(offenders)).join(', ')}. Emojis are disallowed except for approved color circles.`);
          }
        }
      }
    }
  }
}

function validateNoUnapprovedEmojis() {
  console.log('Checking for unapproved emojis in codebase...');
  scanForEmojis(ROOT);
}

function main() {
  validateReferencesIndex();
  validateAgentMatrix();
  validateSkillMatrix();
  validateReadmeNavigation();
  validateNoUnapprovedEmojis();

  console.log(`\nDocumentation check complete: ${totalErrors} error(s) found.`);
  if (totalErrors > 0) {
    process.exit(1);
  } else {
    console.log('✓ All documentation upkeep audits passed successfully.');
    process.exit(0);
  }
}

main();
