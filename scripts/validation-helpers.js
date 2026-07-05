'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const COLORS = require('../solo-dev-toolkit/scripts/cli-helpers');

const { walkWorkspaceDir } = require('./scan-helpers');

/**
 * Recursively scans directory for files matching the given extension
 */
function scanDir(dirPath, extension = '.js', filesList = []) {
  if (!fs.existsSync(dirPath)) return filesList;
  const files = walkWorkspaceDir(dirPath, {
    returnAbsolutePathsOnly: true
  });
  for (const file of files) {
    if (file.endsWith(extension)) {
      filesList.push(file);
    }
  }
  return filesList;
}

module.exports = {
  ROOT_DIR,
  COLORS,
  scanDir
};
