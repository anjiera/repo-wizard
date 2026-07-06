'use strict';

const fs = require('fs');
const path = require('path');

const pluginDir = path.resolve(__dirname, '..');
const devPathFile = path.join(pluginDir, '.repo-wizard', 'dev_path.txt');
let ROOT = process.cwd();

if (fs.existsSync(devPathFile)) {
  try {
    let customRoot = fs.readFileSync(devPathFile, 'utf8').trim();
    if (customRoot) {
      customRoot = path.resolve(pluginDir, customRoot);
      if (fs.existsSync(customRoot)) {
        ROOT = customRoot;
      }
    }
  } catch (e) {
    // Ignore and fallback
  }
}

module.exports = ROOT;
