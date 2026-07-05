'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, assert } = require('./test-utils');

function run() {
  console.log('Testing run-fallback-sequential-orchestration.js...');
  const scriptPath = path.join(ROOT, 'scripts', 'run-fallback-sequential-orchestration.js');
  const manifestDir = path.join(ROOT, '.repo-wizard');
  const manifestPath = path.join(manifestDir, 'manifest.json');

  // Helper to ensure clean temp manifest dir
  if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir);
  
  // Backup existing manifest if any
  let originalManifestContent = null;
  if (fs.existsSync(manifestPath)) {
    originalManifestContent = fs.readFileSync(manifestPath, 'utf8');
  }

  try {
    // Test 1: Successful run with MOCK_CLI=true
    const mockManifest = {
      status: "pending",
      contracts: [
        {
          agent_name: "privacy-hardener",
          status: "pending",
          contract: {
            task_metadata: {
              target_modules: ["/src"],
              language: "javascript",
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        }
      ]
    };
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');

    // Run script with --mock-cli true parameter
    const mockRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --mock-cli true`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(mockRun.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 on successful mock run');
    
    // Check manifest status update (promoted to reports dir)
    const reportsDir = path.join(ROOT, '.repo-wizard', 'reports', 'test-repo');
    const targetManifestPath = path.join(reportsDir, 'manifest.json');
    const updatedManifest = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(updatedManifest.status === 'completed', 'manifest status updated to completed');
    assert(updatedManifest.contracts[0].status === 'completed', 'contract status updated to completed');
    
    // Check observations generated
    const obsPath = path.join(reportsDir, 'agents', 'test-repo-observations-privacy-hardener.md');
    assert(fs.existsSync(obsPath), 'mock observations file created successfully');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }

    // Test 1b: Skipped contracts remain skipped
    const mockManifestWithSkipped = {
      status: "pending",
      contracts: [
        {
          agent_name: "notebook-auditor",
          status: "skipped",
          contract: {
            task_metadata: {
              target_modules: ["/src"],
              language: "javascript",
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        },
        {
          agent_name: "privacy-hardener",
          status: "pending",
          contract: {
            task_metadata: {
              target_modules: ["/src"],
              language: "javascript",
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        }
      ]
    };
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifestWithSkipped, null, 2), 'utf8');

    const runWithSkipped = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --mock-cli true`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(runWithSkipped.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 when handling skipped contracts');
    const skippedManifestUpdated = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(skippedManifestUpdated.contracts[0].status === 'skipped', 'skipped contracts remain status skipped');
    assert(skippedManifestUpdated.contracts[1].status === 'completed', 'pending contracts are completed');
    
    const skippedObsPath = path.join(reportsDir, 'agents', 'test-repo-observations-notebook-auditor.md');
    assert(!fs.existsSync(skippedObsPath), 'observations file is not created for skipped agent in orchestration');

    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }

    // Test 1.5: Invalid --mock-cli value checks
    const invalidMockRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --mock-cli invalid_value`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return {
          code: err.status || 1,
          stdout: err.stdout ? err.stdout.toString() : '',
          stderr: err.stderr ? err.stderr.toString() : ''
        };
      }
    })();
    assert(invalidMockRun.code === 1, 'run-fallback-sequential-orchestration.js exits with 1 on invalid --mock-cli value');
    assert(invalidMockRun.stderr.includes('ERROR: Invalid or missing boolean value for parameter "--mock-cli"'), 'correct error message for invalid mock-cli parameter');

    // Test 2: Pre-flight validation fails on bad contract structure
    const badManifest = {
      status: "pending",
      contracts: [
        {
          agent_name: "privacy-hardener",
          status: "pending",
          contract: {
            task_metadata: {
              // language is missing
              target_modules: ["/src"],
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        }
      ]
    };
    fs.writeFileSync(manifestPath, JSON.stringify(badManifest, null, 2), 'utf8');

    const badRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --mock-cli true`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return {
          code: err.status || 1,
          stdout: err.stdout ? err.stdout.toString() : '',
          stderr: err.stderr ? err.stderr.toString() : ''
        };
      }
    })();

    assert(badRun.code === 1, 'run-fallback-sequential-orchestration.js exits with 1 on invalid parameter contract');
    assert(badRun.stderr.includes('task_metadata.language must be a non-empty string'), 'correct validation error outputted in stderr');

    // Test 3: Fallback triggered when no CLI binary exists
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');
    const fallbackRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}"`, {
          cwd: ROOT,
          stdio: 'pipe',
          env: { ...process.env, DISABLE_CLI: 'true', MOCK_REPO_NAME: 'test-repo' }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(fallbackRun.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 on fallback when CLI not found');
    const fallbackManifest = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(fallbackManifest.status === 'fallback_to_agent', 'manifest status updated to fallback_to_agent');
    assert(fallbackManifest.contracts[0].status === 'pending_agent_fallback', 'contract status updated to pending_agent_fallback');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }

    // Test 4: Redaction pipeline works on mock execution
    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2), 'utf8');
    const testRepoDir = path.join(ROOT, '.repo-wizard', 'reports', 'test-repo');
    if (fs.existsSync(testRepoDir)) fs.rmSync(testRepoDir, { recursive: true, force: true });
    fs.mkdirSync(testRepoDir, { recursive: true });
    
    const resolvedTestRepo = path.resolve(testRepoDir);

    const redactRun = (() => {
      try {
        const stdout = execSync(`node "${scriptPath}" --mock-cli true`, {
          cwd: resolvedTestRepo,
          stdio: 'pipe',
          env: {
            ...process.env,
            MOCK_REPO_NAME: 'test-repo',
            REDACT: 'true'
          }
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(redactRun.code === 0, 'run-fallback-sequential-orchestration.js exits with 0 on successful redact run');

    // Now run compile script to verify both unredacted and redacted files are created
    const compilePath = path.join(ROOT, 'scripts', 'reports-compile.js');
    const targetSessionPath = path.join(testRepoDir, 'session.json');
    const compileRun = (() => {
      try {
        const stdout = execSync(`node "${compilePath}" "${targetSessionPath}"`, {
          cwd: resolvedTestRepo,
          stdio: 'pipe'
        }).toString();
        return { code: 0, stdout };
      } catch (err) {
        return { code: err.status || 1, stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '' };
      }
    })();

    assert(compileRun.code === 0, `reports-compile.js exits with 0. stdout: ${compileRun.stdout}, stderr: ${compileRun.stderr}`);

    const execPath = path.join(testRepoDir, 'test-repo-executive-summary.md');
    const fullPath = path.join(testRepoDir, 'test-repo-full-report.md');
    const redactedExecPath = path.join(testRepoDir, 'redacted-executive-summary.md');
    const redactedFullPath = path.join(testRepoDir, 'redacted-test-repo-full-report.md');

    assert(fs.existsSync(execPath), 'unredacted executive summary exists');
    assert(fs.existsSync(fullPath), 'unredacted full report exists');
    assert(fs.existsSync(redactedExecPath), 'redacted executive summary exists');
    assert(fs.existsSync(redactedFullPath), 'redacted full report exists');

    // HTML versions
    assert(fs.existsSync(execPath.replace(/\.md$/, '.html')), 'unredacted executive summary html exists');
    assert(fs.existsSync(redactedExecPath.replace(/\.md$/, '.html')), 'redacted executive summary html exists');

    const unredactedContent = fs.readFileSync(execPath, 'utf8');
    const redactedContent = fs.readFileSync(redactedExecPath, 'utf8');

    // Unredacted report should contain real details
    assert(unredactedContent.includes('test-repo'), 'unredacted report preserves the repo name');

    // Redacted report should be anonymized
    assert(redactedContent.includes('target-repository'), 'redacted report anonymizes repo name');
    assert(!redactedContent.includes('test-org/test-repo.git'), 'redacted report does not contain real git url');

  } finally {
    // Restore original manifest
    if (originalManifestContent !== null) {
      fs.writeFileSync(manifestPath, originalManifestContent, 'utf8');
    } else if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
    const reportsDir = path.join(ROOT, '.repo-wizard', 'reports', 'test-repo');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  }

  // Running Compiled Analysis Path test
  console.log('Testing orchestration with custom --report-path...');
  const customReportDir = path.join(ROOT, 'temp_custom_reports');
  
  if (fs.existsSync(customReportDir)) {
    fs.rmSync(customReportDir, { recursive: true, force: true });
  }

  // Create manifest under the custom reports directory
  const rootManifest = path.join(customReportDir, '.repo-wizard', 'manifest.json');

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
              language: "javascript",
              build_system: "npm",
              execution_mode: "scaffold"
            }
          }
        }
      ]
    };
    
    fs.mkdirSync(path.dirname(rootManifest), { recursive: true });
    fs.writeFileSync(rootManifest, JSON.stringify(mockManifest, null, 2), 'utf8');

    // Run script with --mock-cli true and --report-path D:\...\temp_custom_reports
    const stdout = execSync(`node "${scriptPath}" --mock-cli true --report-path "${customReportDir}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, MOCK_REPO_NAME: 'test-repo' }
    }).toString();

    // Check manifest status update (promoted to custom reports dir)
    const reportsDir = path.join(customReportDir, '.repo-wizard', 'reports', 'test-repo');
    const targetManifestPath = path.join(reportsDir, 'manifest.json');
    assert(fs.existsSync(targetManifestPath), 'manifest promoted to custom report path');

    const updatedManifest = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
    assert(updatedManifest.status === 'completed', 'manifest status updated to completed under custom report path');
    
    // Check session.json contains reportPath
    const targetSessionPath = path.join(reportsDir, 'session.json');
    assert(fs.existsSync(targetSessionPath), 'session.json generated under custom report path');
    const session = JSON.parse(fs.readFileSync(targetSessionPath, 'utf8'));
    assert(path.resolve(session.reportPath) === path.resolve(customReportDir), 'session.json correctly persisted reportPath');

  } finally {
    if (fs.existsSync(customReportDir)) {
      fs.rmSync(customReportDir, { recursive: true, force: true });
    }
  }
}

module.exports = { run };
