'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing initial-codebase-scan.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'initial-codebase-scan.js');
  
  const tempScanDir = path.join(ROOT, 'temp_initial_scan_test_repo');
  if (fs.existsSync(tempScanDir)) {
    fs.rmSync(tempScanDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempScanDir, { recursive: true });
  
  try {
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(path.join(tempScanDir, `file${i}.js`), 'console.log("hello");\n');
    }
    
    const runResult = runScript(scriptPath, ['--target-path', `"${tempScanDir}"`, '--report-path', `"${tempScanDir}"`]);
    assert(runResult.code === 0, 'initial-codebase-scan.js exits with 0 on target path');
    
    const reportsDir = path.join(tempScanDir, '.repo-wizard', 'reports', 'temp_initial_scan_test_repo');
    const sessionJsonPath = path.join(reportsDir, 'session.json');
    const manifestJsonPath = path.join(reportsDir, 'manifest.json');
    
    assert(fs.existsSync(sessionJsonPath), 'session.json is created');
    assert(fs.existsSync(manifestJsonPath), 'manifest.json is created');
    
    const session = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf8'));
    assert(session.repoSize === 'XS', 'inferred repoSize is XS for a small target repo');
    
    const notebookObs = path.join(reportsDir, 'agents', 'temp_initial_scan_test_repo-observations-notebook-auditor.md');
    assert(fs.existsSync(notebookObs), 'skipped observations report generated for low-relevance notebook auditor');
    
  } finally {
    fs.rmSync(tempScanDir, { recursive: true, force: true });
  }
}

module.exports = { run };
