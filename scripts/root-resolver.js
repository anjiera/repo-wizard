'use strict';

const fs = require('fs');
const path = require('path');

let ROOT = path.resolve(__dirname, '..');
const devPathFile = path.join(ROOT, '.repo-wizard', 'dev_path.txt');

if (fs.existsSync(devPathFile)) {
  try {
    let customRoot = fs.readFileSync(devPathFile, 'utf8').trim();
    if (customRoot) {
      customRoot = path.resolve(ROOT, customRoot);
      if (fs.existsSync(customRoot)) {
        ROOT = customRoot;
      }
    }
  } catch (e) {
    // Ignore and fallback
  }
}

module.exports = ROOT;
