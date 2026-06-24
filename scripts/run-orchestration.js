#!/usr/bin/env node
/**
 * run-orchestration.js
 *
 * Coordinates execution of specialized agents using parameter contracts.
 * Supports:
 *   1. Pre-flight schema validation of contracts.
 *   2. TTY-sensitive progress logging (animated dashboard on terminal, clean lines on IDE GUI).
 *   3. Platform CLI auto-detection.
 *   4. Concurrent agent spawning.
 *   5. Graceful fallback to agent-driven execution if no CLI is present.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { validateContract } = require('./validate-contracts');

const ROOT = path.resolve(__dirname, '..');
const targetPath = process.env.TARGET_PATH || ROOT;
const repoName = process.env.MOCK_REPO_NAME || path.basename(targetPath);
const REPORTS_DIR = path.join(ROOT, 'reports', repoName);
const OBSERVATIONS_DIR = path.join(REPORTS_DIR, 'agents');

let manifestPath = path.join(REPORTS_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  const legacyPath = path.join(ROOT, '.repo-wizard', 'manifest.json');
  if (fs.existsSync(legacyPath)) {
    manifestPath = legacyPath;
  }
}

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Zero-dependency helper to run tasks with a concurrency limit
 */
async function runWithLimit(limit, items, workerFn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => workerFn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// Detect Agent CLI in the system PATH
function detectAgentCLI() {
  if (process.env.DISABLE_CLI === 'true') {
    return null;
  }
  if (process.env.AGENT_CLI) {
    return process.env.AGENT_CLI;
  }
  
  const candidates = ['antigravity', 'agy', 'claude'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // Binary not found or failed, try next candidate
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: Manifest file not found at ${manifestPath}`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: Failed to parse manifest JSON: ${err.message}`);
    process.exit(1);
  }

  if (!manifest.contracts || !Array.isArray(manifest.contracts)) {
    console.error('ERROR: Manifest must contain a "contracts" array.');
    process.exit(1);
  }

  // 1. Run Pre-flight Parameter Contract Validation
  console.log('Running pre-flight parameter contract validation...');
  const validationErrors = [];
  for (const entry of manifest.contracts) {
    const errors = validateContract(entry.contract);
    if (errors.length > 0) {
      validationErrors.push({ agent: entry.agent_name, errors });
    }
  }

  if (validationErrors.length > 0) {
    console.error('\nERROR: Pre-flight contract validation failed:');
    validationErrors.forEach(ve => {
      console.error(`  Agent "${ve.agent}":`);
      ve.errors.forEach(e => console.error(`    - ${e}`));
    });
    process.exit(1);
  }
  console.log('✓ All parameter contracts passed pre-flight validation.\n');

  // 2. Detect CLI Environment
  const cliCmd = detectAgentCLI();
  const isMock = process.env.MOCK_CLI === 'true';

  if (!cliCmd && !isMock) {
    console.log('NOTICE: No platform CLI binary (antigravity, agy, claude) found in PATH.');
    console.log('Gracefully falling back to native LLM-driven agent execution.\n');

    // Update manifest to trigger agent-driven fallback
    manifest.status = 'fallback_to_agent';
    manifest.contracts.forEach(entry => {
      if (entry.status !== 'completed') {
        entry.status = 'pending_agent_fallback';
      }
    });

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    process.exit(0);
  }

  // 3. Execution Phase
  ensureDirExists(OBSERVATIONS_DIR);
  const total = manifest.contracts.length;
  let completed = 0;
  const isTTY = process.stdout.isTTY && !process.env.CI;

  console.log(`Starting execution of ${total} specialist agents...`);
  
  if (isMock) {
    // Mock Execution for testing/sandboxes
    for (let i = 0; i < total; i++) {
      const entry = manifest.contracts[i];
      if (entry.status === 'completed') {
        completed++;
        continue;
      }
      
      const agentName = entry.agent_name;
      const repoName = process.env.MOCK_REPO_NAME || 'mock-repo';
      const obsPath = path.join(OBSERVATIONS_DIR, `observations-${agentName}-${repoName}.md`);
      
      if (isTTY) {
        const pct = total > 0 ? Math.round((completed / total) * 10) : 10;
        const percentValue = total > 0 ? Math.round((completed / total) * 100) : 100;
        process.stdout.write(`\rProgress: [${'█'.repeat(pct)}${'░'.repeat(10 - pct)}] ${percentValue}% (${completed}/${total}) - running ${agentName}`);
      } else {
        console.log(`[INFO] Spawning ${agentName}...`);
      }

      // Simulate a small process output
      fs.writeFileSync(obsPath, `# Observations for ${agentName}\n\nThis is a simulated observation report.\n\nDisclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.\n`, 'utf8');
      
      entry.status = 'completed';
      completed++;
      
      if (!isTTY) {
        console.log(`[DONE] ${agentName}`);
      }
    }

    if (isTTY) {
      process.stdout.write(`\rProgress: [██████████] 100% (${total}/${total}) - All specialists completed successfully.\n`);
    } else {
      console.log('\n[SUCCESS] All specialists completed successfully.');
    }

    manifest.status = 'completed';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    process.exit(0);
  }

  // Real Subprocess Execution
  const errors = [];

  const runAgentPromise = (entry) => {
    return new Promise((resolve) => {
      if (entry.status === 'completed') {
        completed++;
        resolve();
        return;
      }

      const agentName = entry.agent_name;
      const repoName = process.env.MOCK_REPO_NAME || path.basename(ROOT);
      const obsPath = path.join(OBSERVATIONS_DIR, `observations-${agentName}-${repoName}.md`);

      if (!isTTY) {
        console.log(`[INFO] Spawning ${agentName}...`);
      }

      const contractStr = JSON.stringify(entry.contract);
      const child = spawn(cliCmd, [
        'run-agent',
        agentName,
        '--prompt',
        `Evaluate repository metadata and configure targets matching parameter contract: ${contractStr}`
      ], {
        cwd: ROOT,
        env: { ...process.env, PAGER: 'cat' }
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      child.on('error', (err) => {
        errors.push({ agent: agentName, code: -1, stderr: `Failed to spawn process: ${err.message}` });
        if (!isTTY) {
          console.error(`[ERROR] ${agentName} failed to spawn: ${err.message}`);
        }
        safeResolve();
      });

      child.on('close', (code) => {
        if (code === 0) {
          fs.writeFileSync(obsPath, stdoutData || `# Observations for ${agentName}\n\nEmpty observations output.\n`, 'utf8');
          entry.status = 'completed';
          completed++;
          if (!isTTY) {
            console.log(`[DONE] ${agentName}`);
          }
        } else {
          errors.push({ agent: agentName, code, stderr: stderrData });
          if (!isTTY) {
            console.error(`[ERROR] ${agentName} exited with code ${code}`);
          }
        }
        safeResolve();
      });
    });
  };

  if (isTTY) {
    process.stdout.write(`\rProgress: [░░░░░░░░░░] 0% (0/${total}) - starting specialists`);
  }

  let progressInterval;
  if (isTTY) {
    progressInterval = setInterval(() => {
      const pct = total > 0 ? Math.round((completed / total) * 10) : 10;
      const percentValue = total > 0 ? Math.round((completed / total) * 100) : 100;
      process.stdout.write(`\rProgress: [${'█'.repeat(pct)}${'░'.repeat(10 - pct)}] ${percentValue}% (${completed}/${total})`);
    }, 200);
  }

  const CONCURRENCY_LIMIT = 4;
  await runWithLimit(CONCURRENCY_LIMIT, manifest.contracts, runAgentPromise);

  if (progressInterval) {
    clearInterval(progressInterval);
  }

  if (isTTY) {
    process.stdout.write(`\rProgress: [██████████] 100% (${total}/${total})\n`);
  }

  if (errors.length > 0) {
    console.error('\nERROR: Some specialist agent runs failed:');
    errors.forEach(e => {
      console.error(`  Agent "${e.agent}" exited with code ${e.code}. Stderr: ${e.stderr.substring(0, 200)}...`);
    });
    
    // Save state so we can resume later from the failed ones
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    process.exit(1);
  }

  console.log('\n[SUCCESS] All specialists completed successfully.');
  manifest.status = 'completed';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  process.exit(0);
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
