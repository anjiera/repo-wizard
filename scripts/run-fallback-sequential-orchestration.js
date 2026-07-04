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
const { generateMockCompiledAnalysis } = require('./mock-report-generator');
const { redactReportFiles } = require('./redactor');
const { checkAgentRelevance, buildFileCache, archiveSession, promoteStateFiles, ensureReportDirectories } = require('./scan-helpers');
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
const activeChildren = new Set();
const runningAgents = new Map();

let isRemote = false;
let checkoutPath = null;
let keepCheckout = false;

// ANSI escape codes for premium console formatting
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

function cleanupChildren() {
  for (const child of activeChildren) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' });
      } else {
        process.kill(-child.pid, 'SIGKILL');
      }
    } catch (e) {
      try {
        child.kill('SIGKILL');
      } catch (err) {
        // ignore
      }
    }
  }
  activeChildren.clear();
}

// Register process exit and abort signal hooks
const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
signals.forEach(sig => {
  process.on(sig, () => {
    console.error(`\nReceived signal ${sig}, cleaning up child processes...`);
    cleanupChildren();
    process.exit(1);
  });
});

process.on('exit', () => {
  cleanupChildren();
  if (isRemote && !keepCheckout && checkoutPath) {
    const resolvedPath = path.resolve(checkoutPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        deleteFolderRecursive(resolvedPath);
      } catch (delErr) {
        // ignore
      }
    }
  }
});

const ROOT = require('./root-resolver');
const https = require('https');

let targetPath = null;
const targetIdx = process.argv.indexOf('--target-path');
if (targetIdx !== -1 && process.argv[targetIdx + 1] && !process.argv[targetIdx + 1].startsWith('-')) {
  targetPath = process.argv[targetIdx + 1];
}
if (!targetPath) {
  console.error('ERROR: Missing required explicit command-line parameter "--target-path".');
  process.exit(1);
}

isRemote = /^(https?:\/\/|git@)/.test(targetPath);
const checkoutIdx = process.argv.indexOf('--checkout-path');
if (checkoutIdx !== -1 && process.argv[checkoutIdx + 1] && !process.argv[checkoutIdx + 1].startsWith('-')) {
  checkoutPath = process.argv[checkoutIdx + 1];
}

keepCheckout = process.argv.includes('--keep-checkout');

let resolvedTarget = null;
if (!isRemote) {
  if (checkoutIdx !== -1 || keepCheckout) {
    console.error('ERROR: Parameters "--checkout-path" and "--keep-checkout" are only valid when "--target-path" is a remote Git repository URL.');
    process.exit(1);
  }
  resolvedTarget = path.resolve(targetPath);
  if (!fs.existsSync(resolvedTarget)) {
    console.error(`ERROR: Target directory "${resolvedTarget}" does not exist on disk.`);
    process.exit(1);
  }
}

// Parse --report-path flag
let reportPath = null;
const reportPathIdx = process.argv.indexOf('--report-path');
if (reportPathIdx !== -1 && process.argv[reportPathIdx + 1] && !process.argv[reportPathIdx + 1].startsWith('-')) {
  reportPath = process.argv[reportPathIdx + 1];
}
const reportRoot = reportPath ? path.resolve(reportPath) : ROOT;

// Parse --pillar flag
let pillarFilter = null;
const pillarIdx = process.argv.indexOf('--pillar');
if (pillarIdx !== -1 && process.argv[pillarIdx + 1] && !process.argv[pillarIdx + 1].startsWith('-')) {
  pillarFilter = process.argv[pillarIdx + 1].toUpperCase();
}
const ALLOWED_PILLARS = ['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'QUALITY', 'ALL'];
if (pillarFilter && !ALLOWED_PILLARS.includes(pillarFilter)) {
  console.error(`ERROR: Invalid pillar option '${pillarFilter}'. Allowed options are: ${ALLOWED_PILLARS.join(', ')}.`);
  process.exit(1);
}

// Parse --report-style flag
let reportStyle = 'whitepaper';
const styleIdx = process.argv.indexOf('--report-style');
if (styleIdx !== -1 && process.argv[styleIdx + 1] && !process.argv[styleIdx + 1].startsWith('-')) {
  reportStyle = process.argv[styleIdx + 1];
}

// Parse and validate --mock-cli flag
let isMock = false;
const mockCliIdx = process.argv.indexOf('--mock-cli');
if (mockCliIdx !== -1) {
  if (mockCliIdx + 1 >= process.argv.length) {
    console.error('ERROR: Invalid or missing boolean value for parameter "--mock-cli". Must be "true" or "false".');
    process.exit(1);
  }
  const mockCliVal = process.argv[mockCliIdx + 1];
  if (mockCliVal === 'true') {
    isMock = true;
  } else if (mockCliVal === 'false') {
    isMock = false;
  } else {
    console.error('ERROR: Invalid or missing boolean value for parameter "--mock-cli". Must be "true" or "false".');
    process.exit(1);
  }
}

let repoName = process.env.MOCK_REPO_NAME;
if (!repoName) {
  if (isRemote) {
    const parts = targetPath.split('/');
    const rawRepo = parts[parts.length - 1] || 'project';
    repoName = rawRepo.replace(/\.git$/, '').replace(/[^a-zA-Z0-9_\-\.]/g, '');
  } else {
    repoName = path.basename(resolvedTarget).replace(/[^a-zA-Z0-9_\-\.]/g, '');
  }
  if (!repoName || repoName === '.' || repoName === '..' || repoName.toLowerCase() === 'reports' || repoName.toLowerCase() === 'history') {
    repoName = 'project';
  }
}

// Ensure reportRoot and .repo-wizard directory exist recursively
if (!fs.existsSync(path.join(reportRoot, '.repo-wizard'))) {
  fs.mkdirSync(path.join(reportRoot, '.repo-wizard'), { recursive: true });
}

// Archive prior session and report files before beginning orchestration
if (!isMock) {
  archiveSession(reportRoot, { repoName, pillar: pillarFilter });
}

const { reportsDir: REPORTS_DIR, agentsDir: OBSERVATIONS_DIR, contractsDir: CONTRACTS_DIR } = ensureReportDirectories(reportRoot, repoName);
const manifestPath = path.join(REPORTS_DIR, 'manifest.json');

const rootManifest = path.join(reportRoot, '.repo-wizard', 'manifest.json');

// Promotion of fresh manifest written by the lead agent
if (fs.existsSync(rootManifest)) {
  promoteStateFiles(reportRoot, repoName);
  try {
    fs.unlinkSync(rootManifest);
  } catch (e) {
    // ignore
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
    const val = process.env.AGENT_CLI;
    if (/^[a-zA-Z0-9_\-\.\\\/:]+$/.test(val)) {
      if (val.includes('\\') || val.includes('/')) {
        const absVal = path.resolve(val);
        if (fs.existsSync(absVal) && fs.statSync(absVal).isFile()) {
          return absVal;
        }
      } else {
        return val;
      }
    }
  }
  
  const candidates = ['antigravity', 'agy', 'claude'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      // Verify that the CLI supports the run-agent subcommand
      const helpOutput = execSync(`${cmd} --help`, { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] });
      if (helpOutput && helpOutput.includes('run-agent')) {
        return cmd;
      }
    } catch (e) {
      // Binary not found or failed, try next candidate
    }
  }
  return null;
}

async function main() {
  // Disable block-buffering on non-TTY streams
  if (process.stdout._handle && typeof process.stdout._handle.setBlocking === 'function') {
    process.stdout._handle.setBlocking(true);
  }
  if (process.stderr._handle && typeof process.stderr._handle.setBlocking === 'function') {
    process.stderr._handle.setBlocking(true);
  }

  if (isRemote) {
    if (!checkoutPath) {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      checkoutPath = await new Promise((resolve) => {
        rl.question('Please enter a target checkout directory path for the remote repository: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
      if (!checkoutPath) {
        console.error('ERROR: Checkout path is required for remote scans.');
        process.exit(1);
      }
    }

    if (path.basename(checkoutPath).toLowerCase() !== repoName.toLowerCase()) {
      checkoutPath = path.join(checkoutPath, repoName);
    }
    resolvedTarget = path.resolve(checkoutPath);

    console.log(`\n${BLUE}==> Running in Remote Scan Mode for URL: ${targetPath}${RESET}`);
    console.log(`    - Why? A remote Git URL indicates you are running a report on a repository you are not actively developing on.`);
    console.log(`    - Non-interactive (headless) mode has been automatically enabled.`);
    console.log(`    - A temporary shallow clone (--depth=1) will be downloaded to the checkout path.`);
    if (!keepCheckout) {
      console.log(`    - Note: This clone directory is temporary and will be deleted upon completion.`);
    } else {
      console.log(`    - Note: This clone directory will be preserved on disk since --keep-checkout was specified.`);
    }
    console.log('');

    // GitHub size estimation & connectivity warnings
    console.log(`Checking connection and estimating size for remote repository: ${targetPath}...`);
    const info = await getRemoteRepoInfo(targetPath);
    if (info.offline) {
      console.warn(`\n${RED}WARNING: The GitHub API appears to be offline or unreachable (${info.error}). The subsequent shallow clone operation may fail.${RESET}\n`);
    } else if (info.error) {
      console.warn(`\nWARNING: Could not retrieve repository info from GitHub API (${info.error}). Proceeding with clone...`);
    } else if (info.size !== undefined) {
      console.log(`Estimated repository size: ${(info.size / 1024).toFixed(2)} MB`);
      if (info.size > 100000) {
        console.warn(`\n${RED}WARNING: The remote repository size exceeds 100MB. Shallow clone may require significant bandwidth and disk space.${RESET}\n`);
      }
    }

    if (!fs.existsSync(resolvedTarget)) {
      console.log(`Performing shallow clone to target directory: ${resolvedTarget}...`);
      try {
        execSync(`git clone --depth=1 ${targetPath} "${resolvedTarget}"`, { stdio: 'inherit' });
      } catch (cloneErr) {
        console.error(`ERROR: Failed to clone remote repository: ${cloneErr.message}`);
        process.exit(1);
      }
    } else {
      console.log(`Checkout target directory "${resolvedTarget}" already exists. Skipping clone.`);
    }
  }

  console.log(`\n${BLUE}==>${RESET} ${BOLD}Repo Wizard has started. This analysis conducts deep codebase diagnostics and runs specialist subagents. It may take 5+ minutes depending on the repository size.${RESET}\n`);

  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: Manifest file not found at ${manifestPath}`);
    process.exit(1);
  }

  // Pre-populate file cache synchronously to avoid race conditions
  buildFileCache(resolvedTarget);

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
    if (entry.status === 'skipped' || entry.status === 'completed') {
      continue;
    }
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
  console.log(`${GREEN}✓ Codebase Diagnostics & Sweep completed successfully.${RESET}\n`);

  // 2. Detect CLI Environment
  // Check if running inside Google Antigravity native chat sandbox.
  // The ANTIGRAVITY_AGENT environment variable is automatically set to '1' by the platform.
  // This indicates the capability to spawn parallel specialist subagents natively via invoke_subagent.
  const isNativeSandbox = process.env.ANTIGRAVITY_AGENT === '1' || !!(manifest && manifest.nativeChatEnvironment);

  const cliCmd = isNativeSandbox ? null : detectAgentCLI();
  console.log(`Execution Mode: ${isMock ? 'MOCK (Simulated Subagents)' : 'REAL (Spawning LLM Specialist Subagents)'} (mock-cli flag = "${isMock ? 'true' : 'false'}")`);

  if (isNativeSandbox && !isMock) {
    console.log('[INFO] Google Antigravity Native Chat Sandbox detected.');
    console.log('Initiating native agent execution handoff...\n');

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

  if (!cliCmd && !isMock) {
    console.log('NOTICE: No platform CLI binary (antigravity, agy, claude) found in PATH.');
    console.log('Gracefully falling back to native LLM-driven agent execution.\n');

    // Update manifest to trigger agent-driven fallback
    manifest.status = 'fallback_to_agent';
    manifest.contracts.forEach(entry => {
      if (entry.status !== 'completed' && entry.status !== 'skipped') {
        entry.status = 'pending_agent_fallback';
      }
    });


    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    process.exit(0);
  }

  // 3. Execution Phase
  ensureDirExists(OBSERVATIONS_DIR);
  ensureDirExists(CONTRACTS_DIR);
  const total = manifest.contracts.length;
  let completed = 0;
  const isTTY = process.stdout.isTTY && !process.env.CI;

  console.log(`${BLUE}==>${RESET} ${BOLD}Coordinated Specialist Audits...${RESET}`);
  console.log(`Starting execution of ${total} specialist agents...`);
  
  if (isMock) {
    // Mock Execution for testing/sandboxes
    for (let i = 0; i < total; i++) {
      const entry = manifest.contracts[i];
      if (entry.status === 'completed' || entry.status === 'skipped') {
        completed++;
        continue;
      }

      
      const agentName = entry.agent_name;
      const obsPath = path.join(OBSERVATIONS_DIR, `${repoName}-observations-${agentName}.md`);
      
      if (isTTY) {
        const pct = total > 0 ? Math.round((completed / total) * 10) : 10;
        const percentValue = total > 0 ? Math.round((completed / total) * 100) : 100;
        process.stdout.write(`\rProgress: [${'█'.repeat(pct)}${'░'.repeat(10 - pct)}] ${percentValue}% (${completed}/${total}) - running ${agentName}`);
      } else {
        console.log(`[INFO] Spawning ${agentName}...`);
      }

      // mock-start
      // Simulate a small process output
      fs.writeFileSync(obsPath, `# Observations for ${agentName}\n\nThis is a simulated observation report.\n\nDisclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.\n`, 'utf8');
      
      // Simulate writing a mock scaffolding contract
      const contractPath = path.join(CONTRACTS_DIR, `${agentName}-contract.json`);
      const mockContract = {
        contract_version: '1.0.0',
        packages: [
          { name: 'mock-package', version: '^1.0.0', scope: 'devDependencies' }
        ],
        configs: [
          { path: `mock-config-${agentName}.json`, content: '{\n  "mocked": true\n}' }
        ],
        verification_command: 'echo "Mock verification passed"'
      };
      fs.writeFileSync(contractPath, JSON.stringify(mockContract, null, 2), 'utf8');
      // mock-end

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

    completeOrchestration(manifest);
  }

  // Real Subprocess Execution
  const errors = [];

  const runAgentPromise = (entry) => {
    return new Promise((resolve) => {
      const agentName = entry.agent_name;
      const obsPath = path.join(OBSERVATIONS_DIR, `${repoName}-observations-${agentName}.md`);

      // Run the fast codebase relevance check
      const { relevance, rationale } = checkAgentRelevance(agentName, resolvedTarget, entry.contract);
      const agentRegistry = require('../agents/agent-registry.json');
      const agentInfo = agentRegistry[agentName];
      const specPillar = agentInfo ? agentInfo.pillar : null;
      const isPillarMatch = !pillarFilter || pillarFilter === 'ALL' || specPillar === pillarFilter;

      if (relevance === 'Low' || !isPillarMatch) {
        const skipRationale = !isPillarMatch ? `Pillar mismatch (target: ${pillarFilter})` : `Low relevance: ${rationale}`;
        entry.status = 'skipped';
        completed++;
        
        if (!isTTY) {
          console.log(`[SKIPPED] ${agentName} (${skipRationale})`);
        }
        resolve();
        return;
      }

      if (entry.status === 'completed' || entry.status === 'skipped') {
        completed++;
        resolve();
        return;
      }

      if (!isTTY) {
        console.log(`[INFO] Spawning ${agentName}...`);
      }

      const contractStr = JSON.stringify(entry.contract);
      const child = spawn(cliCmd, [
        '--dangerously-skip-permissions',
        'run-agent',
        agentName,
        '--prompt',
        `Evaluate repository metadata and configure targets matching parameter contract: ${contractStr}`
      ], {
        cwd: ROOT,
        env: { ...process.env, PAGER: 'cat' },
        detached: process.platform !== 'win32'
      });

      activeChildren.add(child);
      runningAgents.set(agentName, Date.now());

      let stdoutData = '';
      let stderrData = '';
      let stdoutBuffer = '';
      let stderrBuffer = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdoutData += text;
        if (!isTTY) {
          stdoutBuffer += text;
          let idx;
          while ((idx = stdoutBuffer.indexOf('\n')) !== -1) {
            const line = stdoutBuffer.substring(0, idx).trim();
            stdoutBuffer = stdoutBuffer.substring(idx + 1);
            if (line) {
              console.log(`[${agentName}] ${line}`);
            }
          }
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderrData += text;
        if (!isTTY) {
          stderrBuffer += text;
          let idx;
          while ((idx = stderrBuffer.indexOf('\n')) !== -1) {
            const line = stderrBuffer.substring(0, idx).trim();
            stderrBuffer = stderrBuffer.substring(idx + 1);
            if (line) {
              console.error(`[${agentName}] [stderr] ${line}`);
            }
          }
        }
      });
      let timeoutMs = 120000;
      if (process.env.AGENT_TIMEOUT) {
        const parsedTimeout = parseInt(process.env.AGENT_TIMEOUT, 10);
        if (!isNaN(parsedTimeout) && parsedTimeout > 0) {
          timeoutMs = parsedTimeout;
        }
      }
      const timer = setTimeout(() => {
        if (!resolved) {
          console.error(`[TIMEOUT] ${agentName} run timed out after ${timeoutMs / 1000}s. Terminating process...`);
          try {
            if (process.platform === 'win32') {
              const { exec } = require('child_process');
              exec(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' });
            } else {
              process.kill(-child.pid, 'SIGKILL');
            }
          } catch (e) {
            try {
              child.kill('SIGKILL');
            } catch (err) {
              // ignore
            }
          }
          runningAgents.delete(agentName);
          activeChildren.delete(child);
          errors.push({ agent: agentName, code: -99, stderr: `Process timed out after ${timeoutMs / 1000}s` });
          safeResolve();
        }
      }, timeoutMs);

      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve();
        }
      };

      child.on('error', (err) => {
        runningAgents.delete(agentName);
        activeChildren.delete(child);
        errors.push({ agent: agentName, code: -1, stderr: `Failed to spawn process: ${err.message}` });
        if (!isTTY) {
          console.error(`[ERROR] ${agentName} failed to spawn: ${err.message}`);
        }
        safeResolve();
      });

      child.on('close', (code) => {
        if (resolved) return;
        runningAgents.delete(agentName);
        activeChildren.delete(child);
        if (!isTTY) {
          if (stdoutBuffer.trim()) {
            console.log(`[${agentName}] ${stdoutBuffer.trim()}`);
          }
          if (stderrBuffer.trim()) {
            console.error(`[${agentName}] [stderr] ${stderrBuffer.trim()}`);
          }
        }
        if (code === 0) {
          fs.writeFileSync(obsPath, stdoutData || `# Observations for ${agentName}\n\nEmpty observations output.\n`, 'utf8');
          
          // Verify if the agent wrote a contract. If not, write an empty default contract
          const contractPath = path.join(CONTRACTS_DIR, `${agentName}-contract.json`);
          if (!fs.existsSync(contractPath)) {
            const defaultContract = {
              contract_version: '1.0.0',
              packages: [],
              configs: [],
              verification_command: ''
            };
            fs.writeFileSync(contractPath, JSON.stringify(defaultContract, null, 2), 'utf8');
          }

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
  } else {
    progressInterval = setInterval(() => {
      const BLUE = '\x1b[34m';
      const BOLD = '\x1b[1m';
      const RESET = '\x1b[0m';
      const activeList = [];
      const now = Date.now();
      for (const [name, start] of runningAgents.entries()) {
        const elapsed = Math.round((now - start) / 1000);
        activeList.push(`${name} (elapsed: ${elapsed}s)`);
      }
      const activeStr = activeList.length > 0 ? activeList.join(', ') : 'none';
      const percentValue = total > 0 ? Math.round((completed / total) * 100) : 100;
      console.log(`${BOLD}${BLUE}==>${RESET} ${BOLD}[Progress]${RESET} ${percentValue}% completed (${completed}/${total}). Active specialists: ${activeStr}`);
    }, 15000);
  }

  let concurrencyLimit = 4;
  if (process.env.MAX_CONCURRENCY) {
    const parsed = parseInt(process.env.MAX_CONCURRENCY, 10);
    if (!isNaN(parsed) && parsed > 0) {
      concurrencyLimit = Math.min(parsed, 16);
    }
  }
  await runWithLimit(concurrencyLimit, manifest.contracts, runAgentPromise);

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
  completeOrchestration(manifest);
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});



function completeOrchestration(manifest) {
  manifest.status = 'completed';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // Ensure session.json is updated/created with valid compiledAnalysis payload for mock runs
  const sessionPath = path.join(path.dirname(manifestPath), 'session.json');
  let session = {};
  if (fs.existsSync(sessionPath)) {
    try {
      session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    } catch (e) {}
  }
  
  session.status = 'completed';
  session.targetPath = targetPath ? targetPath.replace(/\\/g, '/') : targetPath;
  if (reportPath) {
    session.reportPath = reportPath.replace(/\\/g, '/');
  }
  session.answersInferred = session.answersInferred !== undefined ? session.answersInferred : true;
  session.reportStyle = reportStyle || 'whitepaper';
  
  if (isMock && !session.compiledAnalysis) {
    session.compiledAnalysis = generateMockCompiledAnalysis(targetPath);
  }
  
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');

  // Redaction pipeline if requested
  const isRedact = process.argv.includes('--redact') || process.env.REDACT === 'true';
  if (isRedact) {
    console.log('Anonymize Reports flag detected. Redacting target repository metadata inside reports...');
    redactReportFiles(REPORTS_DIR, repoName, targetPath);
  }

  process.exit(0);
}
function getRemoteRepoInfo(url) {
  return new Promise((resolve) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      resolve({ error: 'Not a GitHub URL' });
      return;
    }
    const owner = match[1];
    let repo = match[2];
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}`,
      method: 'GET',
      headers: {
        'User-Agent': 'repo-wizard-orchestrator'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({ size: json.size });
          } catch (e) {
            resolve({ error: 'Failed to parse JSON response' });
          }
        } else {
          resolve({ error: `API responded with status code ${res.statusCode}` });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message, offline: true });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'API request timed out', offline: true });
    });

    req.end();
  });
}

function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}
