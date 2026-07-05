'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const COLORS = require('../solo-dev-toolkit/scripts/cli-helpers');

/**
 * Recursively scans directory for files matching the given extension
 */
function scanDir(dirPath, extension = '.js', filesList = []) {
  if (!fs.existsSync(dirPath)) return filesList;
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath, extension, filesList);
    } else if (stat.isFile() && item.endsWith(extension)) {
      filesList.push(fullPath);
    }
  }

  return filesList;
}

module.exports = {
  ROOT_DIR,
  COLORS,
  scanDir
};
