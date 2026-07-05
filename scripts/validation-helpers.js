'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  BLUE: '\x1b[34m'
};

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
