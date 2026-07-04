'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { writeLog } = require('../utils');
const sessionStore = require('../session-store');
const { getSafeRepoName } = require('../../reports-compiler-engine');
const { MOCK_CAPABILITY_MAP, MOCK_TOOL_MAP } = require('../../report-constants');

const ROOT = sessionStore.ROOT;

let activeScanProcess = null;
let scanLogs = [];
let isScanning = false;

const SessionStatus = Object.freeze({
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
});

function getActiveScanProcess() {
  return activeScanProcess;
}

function getScanLogs() {
  return scanLogs;
}

function getIsScanning() {
  return isScanning;
}

function createMockContract(specialist, mode = 'scaffold') {
  const contract = {
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: mode
    },
    compliance_targets: [
      {
        standard: 'SOC2',
        focus_areas: ['audit logs']
      }
    ],
    tooling_specification: [
      {
        capability: MOCK_CAPABILITY_MAP[specialist] || 'General QA',
        selected_tool: MOCK_TOOL_MAP[specialist] || 'eslint',
        install_command: `npm install -D ${MOCK_TOOL_MAP[specialist] || 'eslint'}`,
        config_file: {
          path: `.config-${MOCK_TOOL_MAP[specialist] || 'eslint'}`
        }
      }
    ]
  };

  if (mode === 'backlog') {
    contract.task_metadata.backlog_parameters = {
      granularity: 'granular',
      framework: 'Scrum',
      custom_labels: ['mock-test']
    };
  }

  return contract;
}

function generateManifestFromSession(session) {
  const contracts = [];
  const mode = session.mode === 'backlog' ? 'backlog' : 'scaffold';
  const answers = session.answers || {};

  const selectedAgents = new Set();
  
  // Always include basic general agents
  selectedAgents.add('supply-chain-auditor');
  selectedAgents.add('vcs-workflow-engineer');
  selectedAgents.add('technical-scribe');

  // Compliance
  if (answers.compliance && answers.compliance.length > 0) {
    selectedAgents.add('compliance-auditor');
    selectedAgents.add('privacy-hardener');
  }

  // Testing
  if (answers.testing === true) {
    selectedAgents.add('qa-engineer');
  }

  // Stack/Frameworks
  const frameworks = answers.frameworks || [];
  if (frameworks.includes('react') || frameworks.includes('node')) {
    selectedAgents.add('react-performance-auditor');
    selectedAgents.add('state-hardener');
    selectedAgents.add('appsec-hardener');
  }
  if (frameworks.includes('rust')) {
    selectedAgents.add('toolchain-architect');
    selectedAgents.add('state-integrity-auditor');
  }
  if (frameworks.includes('c#') || frameworks.includes('.net') || frameworks.includes('unity')) {
    selectedAgents.add('toolchain-architect');
  }
  if (frameworks.includes('swift') || frameworks.includes('android')) {
    selectedAgents.add('toolchain-architect');
  }
  if (frameworks.includes('php')) {
    selectedAgents.add('appsec-hardener');
  }

  // Platforms
  const platforms = answers.platforms || [];
  if (platforms.includes('web')) {
    selectedAgents.add('appsec-hardener');
    selectedAgents.add('accessibility-auditor');
  }
  if (platforms.includes('iphone') || platforms.includes('android')) {
    selectedAgents.add('privacy-hardener');
  }
  if (platforms.includes('nintendo switch 2')) {
    selectedAgents.add('toolchain-architect');
  }
  if (platforms.includes('firmware')) {
    selectedAgents.add('embedded-systems-auditor');
    selectedAgents.add('toolchain-architect');
  }
  if (platforms.includes('windows') || platforms.includes('macos') || platforms.includes('linux')) {
    selectedAgents.add('deployment-engineer');
  }

  // Build contract objects
  for (const agent of selectedAgents) {
    contracts.push({
      agent_name: agent,
      status: 'pending',
      contract: createMockContract(agent, mode)
    });
  }

  return {
    status: 'pending',
    contracts
  };
}

function handlePostScan(req, res, correlationId, reportRoot, cliReportStyleVal) {
  if (isScanning || activeScanProcess !== null) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'A scan is already in progress.' }));
    return;
  }

  try {
    const currentSessionFile = sessionStore.getCurrentSessionFile();
    if (!fs.existsSync(currentSessionFile)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active session configuration found to scan.' }));
      return;
    }

    const session = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
    const manifest = generateManifestFromSession(session);
    const repoName = getSafeRepoName(session.targetPath);
    const activeReportRootScan = session.reportPath ? path.resolve(session.reportPath) : reportRoot;
    const manifestPath = path.join(activeReportRootScan, '.repo-wizard', 'reports', repoName, 'manifest.json');
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Reset logs and state
    scanLogs = [];
    isScanning = true;
    scanLogs.push(`[${new Date().toLocaleTimeString()}] Starting codebase scan...`);
    scanLogs.push(`[${new Date().toLocaleTimeString()}] Sizing codebase: detected target directory at "${session.targetPath}"`);

    // Spawn run-orchestration.js in background forcing --mock-cli false
    const spawnArgs = [
      path.join(ROOT, 'scripts', 'run-fallback-sequential-orchestration.js'),
      '--target-path',
      session.targetPath,
      '--mock-cli',
      'false'
    ];
    if (session.reportPath) {
      spawnArgs.push('--report-path', session.reportPath);
    }
    
    const targetStyle = session.reportStyle || cliReportStyleVal || 'whitepaper';
    spawnArgs.push('--report-style', targetStyle);

    activeScanProcess = spawn('node', spawnArgs, {
      cwd: ROOT,
      env: {
        ...process.env,
        MOCK_REPO_NAME: repoName,
        REDACT: session.redact ? 'true' : 'false'
      },
      detached: process.platform !== 'win32'
    });

    activeScanProcess.stdout.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`[Scan stdout] ${line.trim()}`);
          scanLogs.push(`[${new Date().toLocaleTimeString()}] ${line.trim()}`);
        }
      }
    });

    activeScanProcess.stderr.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.error(`[Scan stderr] ${line.trim()}`);
          scanLogs.push(`[${new Date().toLocaleTimeString()}] [ERROR] ${line.trim()}`);
        }
      }
    });

    activeScanProcess.on('close', (code) => {
      scanLogs.push(`[${new Date().toLocaleTimeString()}] Scan process completed with exit code ${code}`);
      isScanning = false;
      activeScanProcess = null;
      
      // Update session state status on disk
      if (fs.existsSync(currentSessionFile)) {
        try {
          const currentSession = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
          if (currentSession.status !== SessionStatus.PAUSED) {
            currentSession.status = code === 0 ? SessionStatus.COMPLETED : SessionStatus.FAILED;
            fs.writeFileSync(currentSessionFile, JSON.stringify(currentSession, null, 2), 'utf8');
            sessionStore.setSessionState(currentSession);
          }
        } catch (err) {
          writeLog('error', 'Failed to update session status on scan close', correlationId, { error: err.message });
        }
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Scan started.' }));

  } catch (err) {
    isScanning = false;
    activeScanProcess = null;
    writeLog('error', 'Exception triggering codebase scan', correlationId, { error: err.message });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Failed to trigger scan: ${err.message}` }));
  }
}

function handleGetScanLogs(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    logs: scanLogs,
    isScanning: isScanning
  }));
}

function handlePostStopScan(req, res, correlationId) {
  if (activeScanProcess === null) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No active scan process is running.' }));
    return;
  }

  try {
    writeLog('info', 'Received request to force stop scan', correlationId);
    
    // Set status to paused in active session file
    const currentSessionFile = sessionStore.getCurrentSessionFile();
    if (fs.existsSync(currentSessionFile)) {
      try {
        const currentSession = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
        currentSession.status = SessionStatus.PAUSED;
        fs.writeFileSync(currentSessionFile, JSON.stringify(currentSession, null, 2), 'utf8');
        sessionStore.setSessionState(currentSession);
      } catch (e) {}
    }

    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      execSync(`taskkill /pid ${activeScanProcess.pid} /t /f`, { stdio: 'ignore' });
    } else {
      process.kill(-activeScanProcess.pid, 'SIGKILL');
    }
    
    scanLogs.push(`[${new Date().toLocaleTimeString()}] Force stop requested. Terminating scan process...`);
    isScanning = false;
    activeScanProcess = null;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Scan force-stopped.' }));
  } catch (err) {
    writeLog('error', 'Failed to stop scan process', correlationId, { error: err.message });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Failed to stop scan: ${err.message}` }));
  }
}

module.exports = {
  getActiveScanProcess,
  getScanLogs,
  getIsScanning,
  handlePostScan,
  handleGetScanLogs,
  handlePostStopScan
};
