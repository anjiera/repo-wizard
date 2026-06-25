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

const ROOT = path.resolve(__dirname, '..');
const targetPath = process.env.TARGET_PATH || ROOT;
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
      const timeoutMs = process.env.AGENT_TIMEOUT ? parseInt(process.env.AGENT_TIMEOUT, 10) : 120000;
      const timer = setTimeout(() => {
        if (!resolved) {
          console.error(`[TIMEOUT] ${agentName} run timed out after ${timeoutMs / 1000}s. Terminating process...`);
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
      concurrencyLimit = parsed;
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
  manifest.status = 'completed';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  process.exit(0);
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});

function checkFilesExist(dir, predicate, depth = 0, maxDepth = 4, visited = new Set()) {
  if (depth > maxDepth) return false;
  const absPath = path.resolve(dir);
  if (visited.has(absPath)) return false;
  visited.add(absPath);

  let files;
  try {
    files = fs.readdirSync(absPath);
  } catch (err) {
    return false;
  }

  const subdirs = [];
  for (const file of files) {
    // Ignore heavy directories
    if (['.git', 'node_modules', 'dist', 'build', '.repo-wizard', 'bin', 'obj', '.agents', 'temp_e2e_sandbox', 'temp_mock_repo'].includes(file)) {
      continue;
    }
    if (predicate(file)) {
      return true;
    }
    try {
      const fullPath = path.join(absPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        subdirs.push(fullPath);
      }
    } catch (e) { /* ignore */ }
  }

  for (const subdir of subdirs) {
    if (checkFilesExist(subdir, predicate, depth + 1, maxDepth, visited)) {
      return true;
    }
  }

  return false;
}

function checkAgentRelevance(agentName, targetDir, contract) {
  // Always relevant core agents
  if (['supply-chain-scanner-agent', 'vcs-workflow-agent', 'technical-scribe-agent'].includes(agentName)) {
    return { relevance: 'High', rationale: 'Core governance/VCS agent' };
  }

  const hasExtension = (dir, ext) => {
    return checkFilesExist(dir, (file) => file.endsWith(ext));
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
      return { relevance: 'Low', rationale: 'No Jupyter Notebook (.ipynb) files found in workspace' };
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
      hasReact = hasExtension(targetDir, '.jsx') || hasExtension(targetDir, '.tsx');
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
