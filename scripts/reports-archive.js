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

const { archiveSession, getSafeRepoName } = require('./scan-helpers');

// Support executing directly from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetDir = process.cwd();

  const reportPathIdx = args.indexOf('--report-path');
  let reportRoot = ROOT;
  if (reportPathIdx !== -1 && args[reportPathIdx + 1] && !args[reportPathIdx + 1].startsWith('-')) {
    reportRoot = path.resolve(args[reportPathIdx + 1]);
  }

  archiveSession(reportRoot, { repoName: getSafeRepoName(targetDir), pruneContracts: true });
}

module.exports = { archiveSession };
