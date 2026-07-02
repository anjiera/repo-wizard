#!/usr/bin/env node
/**
 * scripts/reports-archive.js
 *
 * Reusable utility to archive prior wizard setup configurations and report deliverables
 * to the .repo-wizard/history/ directory before starting fresh or overwriting.
 * Suffixes each file with its last modified/edited timestamp to preserve accurate age.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = require('./root-resolver');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';

/**
 * Archives the active session, manifest, and compiled reports for a workspace.
 * @param {string} workspacePath
 */
function getSafeRepoName(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return 'project';
  const resolved = path.resolve(targetPath);
  let name = path.basename(resolved);
  name = name.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!name || name === '.' || name === '..' || name.toLowerCase() === 'reports' || name.toLowerCase() === 'history') {
    return 'project';
  }
  return name;
}

function archiveSession(workspacePath = process.cwd(), options = {}) {
  const wsPath = (workspacePath && typeof workspacePath === 'string') ? workspacePath : process.cwd();
  const opt = options || {};
  const wizardDir = path.join(wsPath, '.repo-wizard');
  const repoName = opt.repoName || getSafeRepoName(wsPath);

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
  try {
    if (fs.existsSync(rootSession)) {
      sessionTime = fs.statSync(rootSession).mtime;
    } else if (fs.existsSync(reportsSession)) {
      sessionTime = fs.statSync(reportsSession).mtime;
    }
  } catch (err) {
    // Fallback to current date on file locking or transient ENOENT errors
  }
  const timestamp = formatTimestamp(sessionTime);

  const historyDir = path.join(wizardDir, 'reports', 'history', repoName, timestamp);

  try {
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create history directory:', err.message);
    return;
  }

  const archivedFiles = [];

  const archiveFile = (srcPath) => {
    if (fs.existsSync(srcPath)) {
      const ext = path.extname(srcPath);
      const base = path.basename(srcPath, ext);
      const isReportFile = srcPath.startsWith(reportsDir);
      const prefix = isReportFile && (base === 'session' || base === 'manifest') ? 'reports_' : '';
      const destPath = path.join(historyDir, `${prefix}${base}_${timestamp}${ext}`);
      
      try {
        fs.copyFileSync(srcPath, destPath);
        fs.unlinkSync(srcPath);
        archivedFiles.push({
          original: path.relative(wsPath, srcPath),
          archived: path.relative(wsPath, destPath)
        });
      } catch (e) {
        // Ignore file archive errors
      }
    }
  };

  const rmRecursive = (dirPath) => {
    if (fs.existsSync(dirPath)) {
      if (fs.rmSync) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      } else {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          if (fs.statSync(itemPath).isDirectory()) {
            rmRecursive(itemPath);
          } else {
            try {
              fs.unlinkSync(itemPath);
            } catch (e) { /* ignore */ }
          }
        }
        try {
          fs.rmdirSync(dirPath);
        } catch (e) { /* ignore */ }
      }
    }
  };

  // Ensure reportsDir exists
  try {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create reports directory:', err.message);
    return;
  }

  let answersInferred = true;
  try {
    const sessionFileToCheck = fs.existsSync(rootSession) ? rootSession : (fs.existsSync(reportsSession) ? reportsSession : null);
    if (sessionFileToCheck) {
      const sess = JSON.parse(fs.readFileSync(sessionFileToCheck, 'utf8'));
      if (sess.answersInferred === false) {
        answersInferred = false;
      }
    }
  } catch (e) {
    // Default to true
  }

  const rootManifest = path.join(wizardDir, 'manifest.json');
  const reportsManifest = path.join(reportsDir, 'manifest.json');

  // Archive any existing session.json and manifest.json inside reportsDir first to avoid state bleed
  if (answersInferred) {
    archiveFile(reportsSession);
  }
  archiveFile(reportsManifest);

  // Ensure we keep an unchanged copy of session.json and manifest.json in the reports folder
  if (fs.existsSync(rootSession) && answersInferred) {
    try {
      fs.copyFileSync(rootSession, reportsSession);
    } catch (e) { /* ignore */ }
  }

  if (fs.existsSync(rootManifest)) {
    try {
      fs.copyFileSync(rootManifest, reportsManifest);
    } catch (e) { /* ignore */ }
  }

  // 1. Archive session.json & manifest.json from the root
  if (answersInferred) {
    archiveFile(rootSession);
  }
  archiveFile(rootManifest);

  // 2. Archive all reports in reports/<repoName>/ (.md and .html only)
  if (fs.existsSync(reportsDir)) {
    try {
      const items = fs.readdirSync(reportsDir);
      for (const item of items) {
        const itemPath = path.join(reportsDir, item);
        try {
          if (fs.statSync(itemPath).isFile()) {
            const ext = path.extname(item);
            if (ext === '.md' || ext === '.html') {
              archiveFile(itemPath);
            }
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }

  // 3. Remove the agent folder (reports/<repoName>/agents/)
  const agentsDir = path.join(reportsDir, 'agents');
  rmRecursive(agentsDir);

  // 3.5 Remove the contracts folder (reports/<repoName>/contracts/) only if pruneContracts is true
  if (opt.pruneContracts === true) {
    const contractsDir = path.join(reportsDir, 'contracts');
    rmRecursive(contractsDir);
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
  const args = process.argv.slice(2);
  const targetPathIdx = args.indexOf('--target-path');
  if (targetPathIdx === -1) {
    console.error('ERROR: Missing required parameter "--target-path".');
    process.exit(1);
  }
  const targetDir = args[targetPathIdx + 1];
  if (!targetDir) {
    console.error('ERROR: Missing value for parameter "--target-path".');
    process.exit(1);
  }

  const reportPathIdx = args.indexOf('--report-path');
  let reportRoot = ROOT;
  if (reportPathIdx !== -1 && args[reportPathIdx + 1] && !args[reportPathIdx + 1].startsWith('-')) {
    reportRoot = path.resolve(args[reportPathIdx + 1]);
  }

  archiveSession(reportRoot, { repoName: getSafeRepoName(targetDir), pruneContracts: true });
}

module.exports = { archiveSession };
