'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, SCRIPTS_DIR, assert } = require('./test-utils');

function run() {
  console.log('Testing register-plugin.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'register-plugin.js');
  const tempBinDir = path.join(ROOT, 'temp_register_bin');
  fs.mkdirSync(tempBinDir, { recursive: true });

  const isWindows = process.platform === 'win32';
  const mockAgyPath = path.join(tempBinDir, isWindows ? 'agy.cmd' : 'agy');

  if (isWindows) {
    fs.writeFileSync(mockAgyPath, '@echo off\nif "%1"=="--version" (\n  echo 1.0.0\n  exit /b 0\n)\nexit /b 0\n', 'utf8');
  } else {
    fs.writeFileSync(mockAgyPath, '#!/bin/sh\nif [ "$1" = "--version" ]; then\n  echo 1.0.0\n  exit 0\nfi\nexit 0\n', 'utf8');
    fs.chmodSync(mockAgyPath, '755');
  }

  const originalPath = process.env.PATH || process.env.Path;
  const separator = isWindows ? ';' : ':';
  const newPathEnv = `${tempBinDir}${separator}${originalPath}`;

  // Ensure clean target dev_path file
  const devPathFile = path.join(ROOT, '.repo-wizard', 'dev_path.txt');
  let originalDevPath = null;
  if (fs.existsSync(devPathFile)) {
    originalDevPath = fs.readFileSync(devPathFile, 'utf8');
    fs.unlinkSync(devPathFile);
  }

  try {
    const runResult = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}"`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: {
            ...process.env,
            PATH: newPathEnv,
            Path: newPathEnv // support both casing
          }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(runResult.code === 0, 'register-plugin.js exits with 0 on successful mock CLI registration');
    assert(fs.existsSync(devPathFile), 'dev_path.txt file is created');
    const content = fs.readFileSync(devPathFile, 'utf8').trim();
    assert(content === ROOT, 'dev_path.txt contains correct workspace root path');

  } finally {
    fs.rmSync(tempBinDir, { recursive: true, force: true });
    if (fs.existsSync(devPathFile)) {
      fs.unlinkSync(devPathFile);
    }
    if (originalDevPath) {
      fs.writeFileSync(devPathFile, originalDevPath, 'utf8');
    }
  }
}

module.exports = { run };
