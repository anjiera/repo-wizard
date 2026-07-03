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
const { archiveSession } = require('./reports-archive');
const { redactReportFiles } = require('./reports-compiler-engine');

const activeChildren = new Set();
const runningAgents = new Map();

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
});

const ROOT = require('./root-resolver');
let targetPath = null;
const targetIdx = process.argv.indexOf('--target-path');
if (targetIdx !== -1 && process.argv[targetIdx + 1] && !process.argv[targetIdx + 1].startsWith('-')) {
  targetPath = process.argv[targetIdx + 1];
}
if (!targetPath) {
  console.error('ERROR: Missing required explicit command-line parameter "--target-path".');
  process.exit(1);
}
const resolvedTarget = path.resolve(targetPath);
if (!fs.existsSync(resolvedTarget)) {
  console.error(`ERROR: Target directory "${resolvedTarget}" does not exist on disk.`);
  process.exit(1);
}

// Parse --report-path flag
let reportPath = null;
const reportPathIdx = process.argv.indexOf('--report-path');
if (reportPathIdx !== -1 && process.argv[reportPathIdx + 1] && !process.argv[reportPathIdx + 1].startsWith('-')) {
  reportPath = process.argv[reportPathIdx + 1];
}
const reportRoot = reportPath ? path.resolve(reportPath) : ROOT;

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
  repoName = path.basename(resolvedTarget).replace(/[^a-zA-Z0-9_\-\.]/g, '');
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
  archiveSession(reportRoot, { repoName });
}

const REPORTS_DIR = path.join(reportRoot, '.repo-wizard', 'reports', repoName);
const OBSERVATIONS_DIR = path.join(REPORTS_DIR, 'agents');
const CONTRACTS_DIR = path.join(REPORTS_DIR, 'contracts');

let fileCache = null;

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const rootManifest = path.join(reportRoot, '.repo-wizard', 'manifest.json');
const manifestPath = path.join(REPORTS_DIR, 'manifest.json');

// Promotion of fresh manifest written by the lead agent
if (fs.existsSync(rootManifest)) {
  ensureDirExists(REPORTS_DIR);
  fs.copyFileSync(rootManifest, manifestPath);
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
  const cliCmd = detectAgentCLI();
  console.log(`Execution Mode: ${isMock ? 'MOCK (Simulated Subagents)' : 'REAL (Spawning LLM Specialist Subagents)'} (mock-cli flag = "${isMock ? 'true' : 'false'}")`);


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
      if (entry.status === 'completed') {
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
      if (relevance === 'Low') {
        const skippedContent = `# Observations for ${agentName}\n\nSkipped: Low relevance to the workspace.\n\nRationale: ${rationale}\n\nDisclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.\n`;
        fs.writeFileSync(obsPath, skippedContent, 'utf8');
        
        entry.status = 'skipped';
        completed++;
        
        if (!isTTY) {
          console.log(`[SKIPPED] ${agentName} (Low relevance: ${rationale})`);
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


function buildFileCache(targetDir) {
  if (fileCache) return;
  fileCache = [];
  const visited = new Set();
  const MAX_FILES = 10000;

  const traverse = (dir, depth = 0) => {
    if (depth > 8 || fileCache.length >= MAX_FILES) return;
    let absPath;
    try {
      absPath = fs.realpathSync(dir);
    } catch (e) {
      absPath = path.resolve(dir);
    }
    if (visited.has(absPath)) return;
    visited.add(absPath);

    let files;
    try {
      files = fs.readdirSync(absPath);
    } catch (e) {
      return;
    }

    for (const file of files) {
      if (fileCache.length >= MAX_FILES) return;
      if (['.git', 'node_modules', 'dist', 'build', '.repo-wizard', 'bin', 'obj', '.agents', 'temp_e2e_sandbox', 'temp_mock_repo'].includes(file)) {
        continue;
      }
      const fullPath = path.join(absPath, file);
      try {
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
          continue;
        }
        fileCache.push({ name: file, path: fullPath, isDir: stat.isDirectory() });
        if (stat.isDirectory()) {
          traverse(fullPath, depth + 1);
        }
      } catch (e) { /* ignore */ }
    }
  };

  traverse(targetDir);
}

function checkFilesExist(dir, predicate, maxDepth = 4) {
  buildFileCache(resolvedTarget);
  const resolvedDir = path.resolve(dir);
  const resolvedDirWithSep = resolvedDir.endsWith(path.sep) ? resolvedDir : resolvedDir + path.sep;
  for (const item of fileCache) {
    if (item.path === resolvedDir || item.path.startsWith(resolvedDirWithSep)) {
      const relativePath = path.relative(resolvedDir, item.path);
      const parts = relativePath.split(path.sep);
      const relativeDepth = parts.length - 1;
      if (relativeDepth <= maxDepth) {
        if (predicate(item.name, item.path)) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkAgentRelevance(agentName, targetDir, contract) {
  // Always relevant core agents
  if (['supply-chain-auditor-agent', 'vcs-workflow-engineer-agent', 'technical-scribe-agent'].includes(agentName)) {
    return { relevance: 'High', rationale: 'Core governance/VCS agent' };
  }

  const hasExtension = (dir, ext, maxDepth = 4) => {
    return checkFilesExist(dir, (file) => file.endsWith(ext), maxDepth);
  };

  const hasFile = (dir, name) => {
    return checkFilesExist(dir, (file) => file === name);
  };

  const hasAnyFileOf = (dir, names) => {
    return checkFilesExist(dir, (file) => names.includes(file));
  };

  // Notebook Auditor
  if (agentName === 'notebook-auditor-agent') {
    if (!hasExtension(targetDir, '.ipynb')) {
      return { relevance: 'Low', rationale: 'No Jupyter Notebooks (.ipynb) found in workspace' };
    }
    return { relevance: 'High', rationale: 'Jupyter Notebooks detected' };
  }

  // React Performance / State Hardener
  if (['react-performance-auditor-agent', 'state-hardener-agent'].includes(agentName)) {
    let hasReact = false;
    const pkgJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if ((pkg.dependencies && pkg.dependencies.react) || (pkg.devDependencies && pkg.devDependencies.react)) {
          hasReact = true;
        }
      } catch (e) { /* ignore */ }
    }
    if (!hasReact) {
      // Check nested package.json files up to depth 5
      hasReact = checkFilesExist(targetDir, (file, fullPath) => {
        if (file === 'package.json') {
          try {
            const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            if ((pkg.dependencies && pkg.dependencies.react) || (pkg.devDependencies && pkg.devDependencies.react)) {
              return true;
            }
          } catch (e) { /* ignore */ }
        }
        return false;
      }, 5);
    }
    if (!hasReact) {
      hasReact = hasExtension(targetDir, '.jsx', 8) || hasExtension(targetDir, '.tsx', 8);
    }
    if (!hasReact) {
      return { relevance: 'Low', rationale: 'No React dependency or JSX/TSX files found in workspace' };
    }
    return { relevance: 'High', rationale: 'React elements detected in workspace' };
  }

  // Embedded Systems
  if (agentName === 'embedded-systems-auditor-agent') {
    const isFirmware = hasAnyFileOf(targetDir, ['CMakeLists.txt', 'Makefile']) || hasExtension(targetDir, '.ino');
    if (!isFirmware) {
      return { relevance: 'Low', rationale: 'No firmware build files (CMakeLists.txt, Makefile) or Arduino files found' };
    }
    return { relevance: 'High', rationale: 'Firmware build configurations detected' };
  }

  // Toolchain / Formal Methods / Fuzzing
  if (['toolchain-architect-agent', 'state-integrity-auditor-agent', 'fuzz-engineer-agent'].includes(agentName)) {
    const hasRust = hasFile(targetDir, 'Cargo.toml');
    const hasCpp = hasExtension(targetDir, '.cpp') || hasExtension(targetDir, '.c') || hasExtension(targetDir, '.h');
    const hasGo = hasFile(targetDir, 'go.mod');
    
    if (agentName === 'state-integrity-auditor-agent' || agentName === 'fuzz-engineer-agent') {
      if (!hasRust && !hasCpp && !hasGo) {
        return { relevance: 'Low', rationale: 'No Rust, Go, or C/C++ files found for formal verification or fuzzing' };
      }
    } else { // toolchain-architect-agent
      const hasToolchainStack = hasRust || hasCpp || hasFile(targetDir, 'CMakeLists.txt');
      if (!hasToolchainStack) {
        return { relevance: 'Low', rationale: 'No compiled language toolchain files (Cargo.toml, C/C++ source) found' };
      }
    }
    return { relevance: 'Medium', rationale: 'Compiled language files detected' };
  }

  // Data Pipeline
  if (agentName === 'data-pipeline-architect-agent') {
    const hasDataStack = hasAnyFileOf(targetDir, ['dags', 'airflow', 'prefect']) || hasExtension(targetDir, '.py');
    if (!hasDataStack) {
      return { relevance: 'Low', rationale: 'No Python scripts or Airflow DAG folders found' };
    }
    return { relevance: 'Medium', rationale: 'Python or data pipeline files present' };
  }

  // Deployment Engineer
  if (agentName === 'deployment-engineer-agent') {
    const hasDocker = hasAnyFileOf(targetDir, ['docker-compose.yml', 'docker-compose.yaml', 'Dockerfile']);
    if (!hasDocker) {
      return { relevance: 'Low', rationale: 'No Dockerfile or docker-compose files found in workspace' };
    }
    return { relevance: 'High', rationale: 'Container configurations detected' };
  }

  // Default is relevant
  return { relevance: 'High', rationale: 'Relevant to requested workspace features' };
}

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
  session.targetPath = targetPath;
  if (reportPath) {
    session.reportPath = reportPath;
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



