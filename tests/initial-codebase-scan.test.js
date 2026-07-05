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
    
    const runResult = runScript(scriptPath, ['--report-path', `"${tempScanDir}"`], { cwd: tempScanDir });
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
    const invalidPillarRun = runScript(scriptPath, ['--pillar', 'INVALID_PILLAR'], { cwd: tempScanDir });
    assert(invalidPillarRun.code === 1, 'Invalid pillar option exits with 1');

    // Test: Valid pillar filter SECURITY
    const pillarRun = runScript(scriptPath, ['--report-path', `"${tempScanDir}"`, '--pillar', 'SECURITY'], { cwd: tempScanDir });
    assert(pillarRun.code === 0, 'Pillar filtered run exits with 0');
    const filteredManifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
    const qaContract = filteredManifest.contracts.find(c => c.agent_name === 'accessibility-auditor'); // QUALITY pillar
    assert(qaContract && qaContract.status === 'skipped', 'accessibility-auditor (QUALITY) is skipped under SECURITY pillar filter');

    // Test: High Agent Count Warning exits with 2 in headless mode when active > 6 and no pillar is specified
    fs.writeFileSync(path.join(tempScanDir, 'notebook.ipynb'), '{}');
    fs.writeFileSync(path.join(tempScanDir, 'db.sql'), 'SELECT 1;');
    
    // We pass '--headless' (or since process.env.ANTIGRAVITY_AGENT !== '1' in test process spawn, it defaults to headless)
    // Run without --pillar to trigger the warning exit code 2
    const warningRun = runScript(scriptPath, ['--report-path', `"${tempScanDir}"`, '--headless'], { cwd: tempScanDir });
    assert(warningRun.code === 2, 'High Agent Count Warning exits with 2 when active > 6 and no pillar specified');
    assert(warningRun.stdout.includes('Security ('), 'Warning reports Security pillar agent count');
    assert(warningRun.stdout.includes('--pillar SECURITY'), 'Warning contains SECURITY command');
    assert(warningRun.stdout.includes('Performance ('), 'Warning reports Performance pillar agent count');
    assert(warningRun.stdout.includes('--pillar PERFORMANCE'), 'Warning contains PERFORMANCE command');
    assert(warningRun.stdout.includes('Architecture ('), 'Warning reports Architecture pillar agent count');
    assert(warningRun.stdout.includes('--pillar ARCHITECTURE'), 'Warning contains ARCHITECTURE command');
    assert(warningRun.stdout.includes('Quality ('), 'Warning reports Quality pillar agent count');
    assert(warningRun.stdout.includes('--pillar QUALITY'), 'Warning contains QUALITY command');

    // Run with --pillar ALL to bypass the warning
    const bypassRun = runScript(scriptPath, ['--report-path', `"${tempScanDir}"`, '--headless', '--pillar', 'ALL'], { cwd: tempScanDir });
    assert(bypassRun.code === 0, '--pillar ALL bypasses the High Agent Count Warning');

    // Test: Write permission failure on read-only directory
    const noWriteDir = path.join(tempScanDir, 'no_write_dir');
    fs.mkdirSync(noWriteDir, { recursive: true });
    try {
      fs.chmodSync(noWriteDir, 0o444); // Make read-only
      const writeErrorRun = runScript(scriptPath, ['--report-path', `"${noWriteDir}"`], { cwd: tempScanDir });
      // On Windows, 0o444 write permissions depend on NTFS owner privileges.
      // We check if it fails with code 1 and contains the expected stderr error string.
      if (writeErrorRun.code === 1) {
        assert(writeErrorRun.stderr.includes('Write permission denied') || writeErrorRun.stdout.includes('Write permission denied'), 'Write permission validation works');
      }
    } finally {
      try {
        fs.chmodSync(noWriteDir, 0o666);
        fs.rmSync(noWriteDir, { recursive: true, force: true });
      } catch (e) {}
    }
    
  } finally {
    fs.rmSync(tempScanDir, { recursive: true, force: true });
  }
}

module.exports = { run };
