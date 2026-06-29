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
  const repoName = path.basename(workspacePath);

  if (!fs.existsSync(wizardDir)) {
    return;
  }

  const reportsDir = path.join(wizardDir, 'reports', repoName);
  const rootSession = path.join(wizardDir, 'session.json');
  const reportsSession = path.join(reportsDir, 'session.json');

  const formatTimestamp = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
           `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  let sessionTime = new Date();
  if (fs.existsSync(rootSession)) {
    sessionTime = fs.statSync(rootSession).mtime;
  } else if (fs.existsSync(reportsSession)) {
    sessionTime = fs.statSync(reportsSession).mtime;
  }
  const timestamp = formatTimestamp(sessionTime);

  const historyDir = path.join(wizardDir, 'reports', 'history', repoName, timestamp);

  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const archivedFiles = [];

  const archiveFile = (srcPath) => {
    if (fs.existsSync(srcPath)) {
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

  // Ensure reportsDir exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Ensure we keep an unchanged copy of session.json and manifest.json in the reports folder
  if (fs.existsSync(rootSession) && !fs.existsSync(reportsSession)) {
    fs.copyFileSync(rootSession, reportsSession);
  }

  const rootManifest = path.join(wizardDir, 'manifest.json');
  const reportsManifest = path.join(reportsDir, 'manifest.json');
  if (fs.existsSync(rootManifest) && !fs.existsSync(reportsManifest)) {
    fs.copyFileSync(rootManifest, reportsManifest);
  }

  // 1. Archive session.json & manifest.json from the root
  archiveFile(rootSession);
  archiveFile(rootManifest);

  // 2. Archive all reports in reports/<repoName>/ (.md and .html only)
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
  }

  // 3. Remove all files in the agent folder (reports/<repoName>/agents/)
  const agentsDir = path.join(reportsDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    const items = fs.readdirSync(agentsDir);
    for (const item of items) {
      const itemPath = path.join(agentsDir, item);
      if (fs.statSync(itemPath).isFile()) {
        fs.unlinkSync(itemPath);
      }
    }
    try {
      fs.rmdirSync(agentsDir);
    } catch (e) {
      // Ignore
    }
  }

  // 4. Clean up reports directory and parent if completely empty (though they shouldn't be since session.json & manifest.json remain there)
  try {
    if (fs.readdirSync(reportsDir).length === 0) {
      fs.rmdirSync(reportsDir);
      const reportsParent = path.dirname(reportsDir);
      if (fs.readdirSync(reportsParent).length === 0) {
        fs.rmdirSync(reportsParent);
      }
    }
  } catch (e) {
    // Ignore
  }


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
