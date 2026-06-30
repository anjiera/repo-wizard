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

const activeChildren = new Set();
const runningAgents = new Map();

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
if (targetIdx !== -1 && process.argv[targetIdx + 1]) {
  targetPath = process.argv[targetIdx + 1];
}
if (!targetPath) {
  targetPath = process.cwd();
}
const resolvedTarget = path.resolve(targetPath);
let repoName = process.env.MOCK_REPO_NAME;
if (!repoName) {
  repoName = path.basename(resolvedTarget).replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!repoName || repoName === '.' || repoName === '..' || repoName.toLowerCase() === 'reports') {
    repoName = 'project';
  }
}
const REPORTS_DIR = path.join(ROOT, '.repo-wizard', 'reports', repoName);
const OBSERVATIONS_DIR = path.join(REPORTS_DIR, 'agents');
const CONTRACTS_DIR = path.join(REPORTS_DIR, 'contracts');

let fileCache = null;

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
    const val = process.env.AGENT_CLI;
    if (/^[a-zA-Z0-9_\-\.\\\/:]+$/.test(val)) {
      return val;
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
  ensureDirExists(CONTRACTS_DIR);
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
        
        entry.status = 'completed';
        completed++;
        
        if (!isTTY) {
          console.log(`[SKIPPED] ${agentName} (Low relevance: ${rationale})`);
        }
        resolve();
        return;
      }

      if (entry.status === 'completed') {
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
  if (['supply-chain-scanner-agent', 'vcs-workflow-agent', 'technical-scribe-agent'].includes(agentName)) {
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

  // Notebook Sanitizer
  if (agentName === 'notebook-sanitizer-agent') {
    if (!hasExtension(targetDir, '.ipynb')) {
      return { relevance: 'Low', rationale: 'No Jupyter Notebooks (.ipynb) found in workspace' };
    }
    return { relevance: 'High', rationale: 'Jupyter Notebooks detected' };
  }

  // React Performance / State Sanitizer
  if (['react-performance-pilot-agent', 'state-sanitizer-agent'].includes(agentName)) {
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
  if (agentName === 'embedded-systems-pilot-agent') {
    const isFirmware = hasAnyFileOf(targetDir, ['CMakeLists.txt', 'Makefile']) || hasExtension(targetDir, '.ino');
    if (!isFirmware) {
      return { relevance: 'Low', rationale: 'No firmware build files (CMakeLists.txt, Makefile) or Arduino files found' };
    }
    return { relevance: 'High', rationale: 'Firmware build configurations detected' };
  }

  // Toolchain / Formal Methods / Fuzzing
  if (['toolchain-pilot-agent', 'formal-methods-pilot-agent', 'fuzzing-pilot-agent'].includes(agentName)) {
    const hasRust = hasFile(targetDir, 'Cargo.toml');
    const hasCpp = hasExtension(targetDir, '.cpp') || hasExtension(targetDir, '.c') || hasExtension(targetDir, '.h');
    const hasGo = hasFile(targetDir, 'go.mod');
    
    if (agentName === 'formal-methods-pilot-agent' || agentName === 'fuzzing-pilot-agent') {
      if (!hasRust && !hasCpp && !hasGo) {
        return { relevance: 'Low', rationale: 'No Rust, Go, or C/C++ files found for formal verification or fuzzing' };
      }
    } else { // toolchain-pilot-agent
      const hasToolchainStack = hasRust || hasCpp || hasFile(targetDir, 'CMakeLists.txt');
      if (!hasToolchainStack) {
        return { relevance: 'Low', rationale: 'No compiled language toolchain files (Cargo.toml, C/C++ source) found' };
      }
    }
    return { relevance: 'Medium', rationale: 'Compiled language files detected' };
  }

  // Data Pipeline
  if (agentName === 'data-pipeline-pilot-agent') {
    const hasDataStack = hasAnyFileOf(targetDir, ['dags', 'airflow', 'prefect']) || hasExtension(targetDir, '.py');
    if (!hasDataStack) {
      return { relevance: 'Low', rationale: 'No Python scripts or Airflow DAG folders found' };
    }
    return { relevance: 'Medium', rationale: 'Python or data pipeline files present' };
  }

  // Deployment Pilot
  if (agentName === 'deployment-pilot-agent') {
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

  // Redaction pipeline if requested
  const isRedact = process.argv.includes('--redact') || process.env.REDACT === 'true';
  if (isRedact) {
    console.log('Anonymize Reports flag detected. Redacting target repository metadata inside reports...');
    redactReportFiles(REPORTS_DIR, repoName, targetPath);
  }

  process.exit(0);
}

function redactGitUrls(text) {
  const gitUrlRegex = /(https?:\/\/|git@)([a-zA-Z0-9\-._~]+)([\/:][a-zA-Z0-9\-._~]+)\/([a-zA-Z0-9\-._~]+)/gi;
  return text.replace(gitUrlRegex, (match, p1, p2, p3, p4) => {
    const prefix = p3.charAt(0);
    const suffix = match.endsWith('.git') ? '.git' : '';
    return `${p1}${p2}${prefix}redacted-org/redacted-repo${suffix}`;
  });
}

function redactPaths(text, targetPath) {
  if (!targetPath) return text;
  const absPath = path.resolve(targetPath);
  const isRoot = absPath === path.resolve(absPath, '..');
  if (isRoot) return text;

  const forwardSlashPath = absPath.replace(/\\/g, '/');
  const backslashPath = absPath.replace(/\//g, '\\');
  const doubleBackslashPath = backslashPath.replace(/\\/g, '\\\\');
  
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const patterns = [
    new RegExp(escapeRegExp(forwardSlashPath), 'gi'),
    new RegExp(escapeRegExp(backslashPath), 'gi'),
    new RegExp(escapeRegExp(doubleBackslashPath), 'gi')
  ];
  
  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, 'target-workspace-path');
  }
  return result;
}

function redactRepoName(text, repoName) {
  if (!repoName || repoName === 'project') return text;
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapeRegExp(repoName), 'gi');
  return text.replace(regex, 'target-repository');
}

function redactReportText(text, repoName, targetPath) {
  if (!text || typeof text !== 'string') return text;
  let redacted = text;
  redacted = redactGitUrls(redacted);
  if (targetPath) {
    redacted = redactPaths(redacted, targetPath);
  }
  if (repoName) {
    redacted = redactRepoName(redacted, repoName);
  }
  return redacted;
}

function redactReportFiles(reportsDir, repoName, targetPath) {
  if (!fs.existsSync(reportsDir)) return;
  const traverse = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.lstatSync(fullPath);
      if (stat.isSymbolicLink()) {
        continue;
      }
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        if (file === 'manifest.json' || file === 'session.json') {
          continue;
        }
        const ext = path.extname(file).toLowerCase();
        if (['.md', '.html', '.csv'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const redacted = redactReportText(content, repoName, targetPath);
            fs.writeFileSync(fullPath, redacted, 'utf8');
          } catch (e) {
            console.error(`Failed to redact file ${fullPath}:`, e.message);
          }
        }
      }
    }
  };
  traverse(reportsDir);
}

