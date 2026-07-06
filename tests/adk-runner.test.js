'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, assert } = require('./test-utils');

function run() {
  console.log('Testing ADK Team runner orchestration...');
  
  // Compile TS to ensure dist/index.js is up to date
  execSync('npm run build', { cwd: ROOT, stdio: 'ignore' });

  const manifestDir = path.join(ROOT, '.repo-wizard');
  const manifestPath = path.join(manifestDir, 'manifest.json');
  
  if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });
  
  let originalManifestContent = null;
  if (fs.existsSync(manifestPath)) {
    originalManifestContent = fs.readFileSync(manifestPath, 'utf8');
  }

  try {
    const mockManifest = {
      status: "pending",
      contracts: [
        {
          agent_name: "privacy-hardener",
          status: "pending",
          contract: {
            task_metadata: {
              target_modules: ["/src"],
              language: "typescript",
              build_system: "npm",
              execution_mode: "tool"
            }
          }
        }
      ]
    };
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');

    // Create a temporary script to execute the ADK runner
    const tempScript = path.join(ROOT, 'temp-adk-runner.js');
    fs.writeFileSync(tempScript, `
      const { runSweep } = require('./dist/index.js');
      runSweep('.repo-wizard/manifest.json').then(() => {
        process.exit(0);
      }).catch(err => {
        console.error(err);
        process.exit(1);
      });
    `, 'utf8');

    const adkRun = (() => {
      try {
        const stdout = execSync(`node "${tempScript}"`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, ADK_MOCK_RUN: 'true' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    fs.unlinkSync(tempScript);

    assert(adkRun.code === 0, 'ADK runSweep exits with 0 on successful mock run');
    
    // Check manifest status update
    const updatedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(updatedManifest.status === 'completed', 'manifest status updated to completed');
    assert(updatedManifest.contracts[0].status === 'completed', 'contract status updated to completed');
    
    // Check observations generated
    const obsPath = path.join(manifestDir, 'reports', 'repo-wizard', 'agents', 'repo-wizard-observations-privacy-hardener.md');
    assert(fs.existsSync(obsPath), 'ADK observations file created successfully');
    
  } finally {
    // Restore original manifest
    if (originalManifestContent !== null) {
      fs.writeFileSync(manifestPath, originalManifestContent, 'utf8');
    } else if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
    const reportsDir = path.join(manifestDir, 'reports');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  }
}

module.exports = { run };
