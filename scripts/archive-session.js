#!/usr/bin/env node
/**
 * scripts/archive-session.js
 *
 * Reusable utility to archive prior wizard setup configurations and report deliverables
 * to the .repo-wizard/history/ directory before starting fresh or overwriting.
 * Suffixes each file with its last modified/edited timestamp to preserve accurate age.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';

/**
 * Archives the active session, manifest, and compiled reports for a workspace.
 * @param {string} workspacePath
 */
function archiveSession(workspacePath = process.cwd()) {
  const wizardDir = path.join(workspacePath, '.repo-wizard');
  const historyDir = path.join(wizardDir, 'history');
  const repoName = path.basename(workspacePath);

  if (!fs.existsSync(wizardDir)) {
    return;
  }

  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const formatTimestamp = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
           `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  const archivedFiles = [];

  const archiveFile = (srcPath) => {
    if (fs.existsSync(srcPath)) {
      const stat = fs.statSync(srcPath);
      const timestamp = formatTimestamp(stat.mtime);
      const ext = path.extname(srcPath);
      const base = path.basename(srcPath, ext);
      const destPath = path.join(historyDir, `${base}_${timestamp}${ext}`);
      
      fs.copyFileSync(srcPath, destPath);
      fs.unlinkSync(srcPath);
      archivedFiles.push({
        original: path.relative(workspacePath, srcPath),
        archived: path.relative(workspacePath, destPath)
      });
    }
  };

  // 1. Archive session.json & manifest.json
  archiveFile(path.join(wizardDir, 'session.json'));
  archiveFile(path.join(wizardDir, 'manifest.json'));

  // 2. Archive all reports in reports/<repoName>/
  const reportsDir = path.join(wizardDir, 'reports', repoName);
  if (fs.existsSync(reportsDir)) {
    const items = fs.readdirSync(reportsDir);
    for (const item of items) {
      const itemPath = path.join(reportsDir, item);
      if (fs.statSync(itemPath).isFile()) {
        const ext = path.extname(item);
        if (ext === '.md' || ext === '.html') {
          archiveFile(itemPath);
        }
      }
    }
    // Clean up empty directories
    try {
      if (fs.readdirSync(reportsDir).length === 0) {
        fs.rmdirSync(reportsDir);
        const reportsParent = path.dirname(reportsDir);
        if (fs.readdirSync(reportsParent).length === 0) {
          fs.rmdirSync(reportsParent);
        }
      }
    } catch (e) {
      // Ignore cleanup error
    }
  }

  // 3. Support legacy root report path (e.g. for backward compatibility / testing hooks)
  archiveFile(path.join(wizardDir, `${repoName}-full-report.md`));

  if (archivedFiles.length > 0) {
    console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Archived prior wizard configurations and reports to history:${RESET}`);
    archivedFiles.forEach(f => {
      console.log(`  ${GREEN}✓${RESET} ${f.original} -> ${f.archived}`);
    });
  }
}

// Support executing directly from command line
if (require.main === module) {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  archiveSession(targetDir);
}

module.exports = { archiveSession };
