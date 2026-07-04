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
    
    const rootSessionPath = path.join(tempScanDir, '.repo-wizard', 'session.json');
    assert(fs.existsSync(rootSessionPath), 'root session.json is created');

    const session = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf8'));
    assert(session.repoSize === 'XS', 'inferred repoSize is XS for a small target repo');
    
    const notebookObs = path.join(reportsDir, 'agents', 'temp_initial_scan_test_repo-observations-notebook-auditor.md');
    assert(!fs.existsSync(notebookObs), 'skipped observations report is not generated for low-relevance notebook auditor');
    
    const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
    const notebookContract = manifest.contracts.find(c => c.agent_name === 'notebook-auditor');
    assert(notebookContract && notebookContract.status === 'skipped', 'notebook-auditor status is skipped in manifest');

    // Test: Invalid pillar option exits with 1
    const invalidPillarRun = runScript(scriptPath, ['--target-path', `"${tempScanDir}"`, '--pillar', 'INVALID_PILLAR']);
    assert(invalidPillarRun.code === 1, 'Invalid pillar option exits with 1');

    // Test: Valid pillar filter SECURITY
    const pillarRun = runScript(scriptPath, ['--target-path', `"${tempScanDir}"`, '--report-path', `"${tempScanDir}"`, '--pillar', 'SECURITY']);
    assert(pillarRun.code === 0, 'Pillar filtered run exits with 0');
    const filteredManifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
    const qaContract = filteredManifest.contracts.find(c => c.agent_name === 'accessibility-auditor'); // QUALITY pillar
    assert(qaContract && qaContract.status === 'skipped', 'accessibility-auditor (QUALITY) is skipped under SECURITY pillar filter');

    // Test: High Sweep Warning exits with 2 in headless mode when active > 6 and no pillar is specified
    fs.writeFileSync(path.join(tempScanDir, 'notebook.ipynb'), '{}');
    fs.writeFileSync(path.join(tempScanDir, 'db.sql'), 'SELECT 1;');
    
    // We pass '--headless' (or since process.env.ANTIGRAVITY_AGENT !== '1' in test process spawn, it defaults to headless)
    // Run without --pillar to trigger the warning exit code 2
    const warningRun = runScript(scriptPath, ['--target-path', `"${tempScanDir}"`, '--report-path', `"${tempScanDir}"`, '--headless']);
    assert(warningRun.code === 2, 'High Sweep Warning exits with 2 when active > 6 and no pillar specified');

    // Run with --pillar ALL to bypass the warning
    const bypassRun = runScript(scriptPath, ['--target-path', `"${tempScanDir}"`, '--report-path', `"${tempScanDir}"`, '--headless', '--pillar', 'ALL']);
    assert(bypassRun.code === 0, '--pillar ALL bypasses the High Sweep Warning');
    
  } finally {
    fs.rmSync(tempScanDir, { recursive: true, force: true });
  }
}

module.exports = { run };
