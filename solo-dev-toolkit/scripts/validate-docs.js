#!/usr/bin/env node
/**
 * solo-dev-toolkit/scripts/validate-docs.js
 *
 * Repository-agnostic documentation integrity checker.
 * 1. Checks for unapproved emojis in codebase files.
 * 2. Enforces line limit rules on AGENTS.md (max 300 lines).
 * 3. Verifies that markdown links use relative repository paths instead of absolute or file:// paths.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

const ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_MD_FILE = path.join(ROOT, 'AGENTS.md');
const MAX_AGENTS_MD_LINES = 300;

let totalErrors = 0;

function reportError(msg) {
  totalErrors++;
  console.log(`  ${RED}✗ ERROR:${RESET} ${msg}`);
}

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F7E0}-\u{1F7E9}]/gu;
const approvedSymbols = [
  '🟢', '🔵', '⚪', '🟡', '🔴', '⚫',
  '✓', '✗', '⚠',
  '\u2713', '\u2717', '\u26A0'
];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (['.git', '.repo-wizard', '.gemini', '.claude', '.agents', 'node_modules', 'temp_e2e_sandbox', 'dist', 'build', 'history'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === '.md' || ext === '.js' || ext === '.sh' || ext === '.ps1' || ext === '.json' || ext === '.toml' || ext === '.csv') {
        let content;
        try {
          content = fs.readFileSync(fullPath, 'utf8');
        } catch (err) {
          continue;
        }

        // 1. Emoji Check
        if (entry.name !== 'papercuts.csv') { // Skip registry file itself for emoji warning
          const matches = content.match(emojiRegex);
          if (matches) {
            const offenders = matches.filter(m => !approvedSymbols.includes(m));
            if (offenders.length > 0) {
              reportError(`File '${relPath}' contains unapproved emojis: ${Array.from(new Set(offenders)).join(', ')}. Emojis are disallowed except for approved status color circles.`);
            }
          }
        }

        // 2. Relative Markdown Links Check
        if (ext === '.md') {
          validateMarkdownLinks(relPath, content);
        }
      }
    }
  }
}

function validateMarkdownLinks(filePath, content) {
  const linkRegex = /\[([^\]]*?)\]\((.*?)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const linkUrl = match[2].trim().split('#')[0].trim();
    if (!linkUrl) continue;

    // Detect file://, absolute system paths, or Windows drive prefixes
    if (linkUrl.startsWith('file:') || path.isAbsolute(linkUrl) || /^[a-zA-Z]:/.test(linkUrl)) {
      reportError(`File '${filePath}' contains non-relative path link: '${match[0]}'. Links must use relative repository paths instead of absolute system or file:// paths.`);
    }
  }
}

function validateNoUnapprovedEmojisAndLinks() {
  console.log('Checking for unapproved emojis and absolute links in codebase...');
  scanDirectory(ROOT);
}

function validateAgentsMdLength() {
  if (!fs.existsSync(AGENTS_MD_FILE)) {
    return;
  }
  console.log('Checking AGENTS.md rule length...');
  const content = fs.readFileSync(AGENTS_MD_FILE, 'utf8');
  const lines = content.split(/\r?\n/).length;

  if (lines > MAX_AGENTS_MD_LINES) {
    reportError(`AGENTS.md has ${lines} lines, which exceeds the threshold of ${MAX_AGENTS_MD_LINES} lines. Please refactor detailed rules, guidelines, or checklists into separate files in references/ or skills/ to avoid agent cognitive overload.`);
  } else {
    console.log(`  ${GREEN}✓${RESET} AGENTS.md length is within limits (${lines}/${MAX_AGENTS_MD_LINES} lines).`);
  }
}

function main() {
  validateNoUnapprovedEmojisAndLinks();
  validateAgentsMdLength();

  if (totalErrors > 0) {
    console.log(`\n${BOLD}${RED}Generic documentation check complete: ${totalErrors} error(s) found.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}✓ All generic documentation upkeep audits passed successfully.${RESET}`);
    process.exit(0);
  }
}

main();
