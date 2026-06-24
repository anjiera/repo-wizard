#!/usr/bin/env node
/**
 * scripts/dashboard-server.js
 *
 * Lightweight, zero-dependency Node.js backend for the Repo Wizard interactive dashboard.
 * - Dynamic port scanning (starts at 3000, increments until free)
 * - JSON logging schema with correlation ID propagation
 * - API endpoints to manage sessions, trigger scans, and compile HTML
 * - Static file serving for Vite built SPA assets
 */

'use strict';

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { convertMdToHtml } = require('./md-to-html');

const ROOT = path.resolve(__dirname, '..');
const PORT_START = 3000;
const SESSION_FILE = path.join(ROOT, '.repo-wizard', 'session.json');
const TOS_FILE = path.join(ROOT, '.repo-wizard', '.tos_agreed');

// Ensure reports directory exists
const REPORTS_DIR = path.join(ROOT, '.repo-wizard');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

let activeScanProcess = null;
let scanLogs = [];
let isScanning = false;
const { spawn } = require('child_process');

function writeLog(level, message, correlationId = '', extra = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlation_id: correlationId,
    message,
    ...extra
  };
  console.log(JSON.stringify(logEntry));
}

/**
 * Searches for an open port using the native net package
 */
function findOpenPort(startPort, callback) {
  if (startPort > 65535) {
    callback(new Error('No open ports found in range 3000-65535'));
    return;
  }
  const server = net.createServer();
  server.listen(startPort, () => {
    server.once('close', () => callback(null, startPort));
    server.close();
  });
  server.on('error', () => {
    findOpenPort(startPort + 1, callback);
  });
}

// Initialize in-memory sessionState cache from disk on startup
let sessionState = {};
if (fs.existsSync(SESSION_FILE)) {
  try {
    sessionState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  } catch (e) {
    sessionState = {};
  }
}


/**
 * Generates ETag for cache validation
 */
function getFileETag(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return `W/"${stats.size}-${stats.mtimeMs}"`;
  } catch (err) {
    return '';
  }
}

/**
 * Serves static files from dashboard/dist directory
 */
function serveStaticFile(res, reqPath, correlationId) {
  if (reqPath.includes('\0') || reqPath.includes('%00')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }
  const distDir = path.resolve(ROOT, 'dashboard', 'dist');
  const safePrefix = distDir + path.sep;
  const relativePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  let filePath = path.resolve(distDir, relativePath);
  
  // Clean path to prevent directory traversal securely
  if (filePath !== distDir && !filePath.startsWith(safePrefix)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Fallback to index.html for SPA router only for non-asset requests
  const isAsset = reqPath.startsWith('/assets/') || reqPath.startsWith('/vite.svg') || path.extname(reqPath) !== '';
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (isAsset) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    filePath = path.join(ROOT, 'dashboard', 'dist', 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json'
  };
  const contentType = MIME_TYPES[ext] || (ext === '' ? 'text/html' : 'application/octet-stream');

  fs.readFile(filePath, (err, content) => {
    if (err) {
      writeLog('error', `Failed to read static file: ${filePath}`, correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

function createMockContract(specialist, mode = 'scaffold') {
  const capabilityMap = {
    'accessibility-auditor-agent': 'Accessibility Auditing',
    'compliance-pilot-agent': 'Compliance Hardening',
    'privacy-guardian-agent': 'PII Logging Audits',
    'supply-chain-scanner-agent': 'Dependency Licensing',
    'testing-pilot-agent': 'Unit Testing',
    'vcs-workflow-agent': 'Git Hook Automation',
    'technical-scribe-agent': 'ADR & Architecture Diagrams',
    'appsec-hardener-agent': 'Application Hardening',
    'resilience-pilot-agent': 'Retry & Circuit Breaker Setup',
    'deployment-pilot-agent': 'Container Orchestration & Backup',
    'api-contract-pilot-agent': 'API Linting & Schema Checking',
    'data-pipeline-pilot-agent': 'Data Integrity Checks',
    'notebook-sanitizer-agent': 'Jupyter Notebook Cleaners',
    'embedded-systems-pilot-agent': 'Embedded Warning Linters',
    'fuzzing-pilot-agent': 'Fuzz Testing Harnesses',
    'toolchain-pilot-agent': 'Cross-Compilation Toolchains',
    'formal-methods-pilot-agent': 'Formal Model Verification',
    'ai-robustness-pilot-agent': 'AI Input/Output Guardrails',
    'react-performance-pilot-agent': 'React Performance Auditing',
    'state-sanitizer-agent': 'State Sanitization Auditing'
  };

  const toolMap = {
    'accessibility-auditor-agent': 'axe-core',
    'compliance-pilot-agent': 'checkov',
    'privacy-guardian-agent': 'gdpr-sanitizer',
    'supply-chain-scanner-agent': 'fossa',
    'testing-pilot-agent': 'vitest',
    'vcs-workflow-agent': 'husky',
    'technical-scribe-agent': 'mermaid-cli',
    'appsec-hardener-agent': 'helmet',
    'resilience-pilot-agent': 'opossum',
    'deployment-pilot-agent': 'docker-compose',
    'api-contract-pilot-agent': 'spectral',
    'data-pipeline-pilot-agent': 'pandera',
    'notebook-sanitizer-agent': 'nbstripout',
    'embedded-systems-pilot-agent': 'cppcheck',
    'fuzzing-pilot-agent': 'cargo-fuzz',
    'toolchain-pilot-agent': 'riscv-gcc',
    'formal-methods-pilot-agent': 'kani',
    'ai-robustness-pilot-agent': 'llm-guard',
    'react-performance-pilot-agent': 'react-scan',
    'state-sanitizer-agent': 'eslint-plugin-react-hooks'
  };

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
        capability: capabilityMap[specialist] || 'General QA',
        selected_tool: toolMap[specialist] || 'eslint',
        install_command: `npm install -D ${toolMap[specialist] || 'eslint'}`,
        config_file: {
          path: `.config-${toolMap[specialist] || 'eslint'}`
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
  selectedAgents.add('supply-chain-scanner-agent');
  selectedAgents.add('vcs-workflow-agent');
  selectedAgents.add('technical-scribe-agent');

  // Compliance
  if (answers.compliance && answers.compliance.length > 0) {
    selectedAgents.add('compliance-pilot-agent');
    selectedAgents.add('privacy-guardian-agent');
  }

  // Testing
  if (answers.testing === true) {
    selectedAgents.add('testing-pilot-agent');
  }

  // Stack/Frameworks
  const frameworks = answers.frameworks || [];
  if (frameworks.includes('react') || frameworks.includes('node')) {
    selectedAgents.add('react-performance-pilot-agent');
    selectedAgents.add('state-sanitizer-agent');
    selectedAgents.add('appsec-hardener-agent');
  }
  if (frameworks.includes('rust')) {
    selectedAgents.add('toolchain-pilot-agent');
    selectedAgents.add('formal-methods-pilot-agent');
  }
  if (frameworks.includes('c#') || frameworks.includes('.net') || frameworks.includes('unity')) {
    selectedAgents.add('toolchain-pilot-agent');
  }
  if (frameworks.includes('swift') || frameworks.includes('android')) {
    selectedAgents.add('toolchain-pilot-agent');
  }
  if (frameworks.includes('php')) {
    selectedAgents.add('appsec-hardener-agent');
  }

  // Platforms
  const platforms = answers.platforms || [];
  if (platforms.includes('web')) {
    selectedAgents.add('appsec-hardener-agent');
    selectedAgents.add('accessibility-auditor-agent');
  }
  if (platforms.includes('iphone') || platforms.includes('android')) {
    selectedAgents.add('privacy-guardian-agent');
  }
  if (platforms.includes('nintendo switch 2')) {
    selectedAgents.add('toolchain-pilot-agent');
  }
  if (platforms.includes('firmware')) {
    selectedAgents.add('embedded-systems-pilot-agent');
    selectedAgents.add('toolchain-pilot-agent');
  }
  if (platforms.includes('windows') || platforms.includes('macos') || platforms.includes('linux')) {
    selectedAgents.add('deployment-pilot-agent');
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

const server = http.createServer((req, res) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  // Prevent crash via null byte injection
  if (req.url.includes('\0') || req.url.includes('%00')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  // CSRF Protection for mutating POST requests
  if (req.method === 'POST') {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Require at least one local verification header to be present
    if (!origin && !referer) {
      writeLog('warning', 'CSRF validation failed: both Origin and Referer headers are missing', correlationId);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: CSRF validation failed.' }));
      return;
    }

    const isLocalOrigin = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isLocalReferer = !referer || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/.test(referer);
    
    if (!isLocalOrigin || !isLocalReferer) {
      writeLog('warning', 'CSRF validation failed for POST request', correlationId, { origin, referer });
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: CSRF validation failed.' }));
      return;
    }
  }

  // Secure CORS Headers: only allow requests from localhost/127.0.0.1
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  writeLog('info', `Received request: ${req.method} ${url.pathname}`, correlationId);

  // 0a. GET /api/consent - Check TOS consent status
  if (req.method === 'GET' && url.pathname === '/api/consent') {
    if (!fs.existsSync(TOS_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ consented: false }));
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(TOS_FILE, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ consented: true, data }));
    } catch (err) {
      writeLog('error', 'Failed to read TOS consent file', correlationId, { error: err.message });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ consented: false }));
    }
    return;
  }

  // 0b. POST /api/consent - Save or revoke TOS consent
  if (req.method === 'POST' && url.pathname === '/api/consent') {
    let body = '';
    let tooLarge = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2048) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const payload = JSON.parse(body);
        if (payload.agreed === true) {
          const consentData = {
            agreed: true,
            agreed_by: typeof payload.agreed_by === 'string' ? payload.agreed_by : 'dev-user',
            timestamp: new Date().toISOString()
          };
          fs.writeFileSync(TOS_FILE, JSON.stringify(consentData, null, 2), 'utf8');
          writeLog('info', 'TOS Consent saved successfully', correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'TOS accepted.' }));
        } else {
          if (fs.existsSync(TOS_FILE)) {
            fs.unlinkSync(TOS_FILE);
          }
          writeLog('info', 'TOS Consent declined / revoked', correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'declined', message: 'TOS declined.' }));
        }
      } catch (err) {
        writeLog('error', 'Malformed payload in consent update', correlationId, { error: err.message });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // 1. GET /api/session - Read alignment questionnaire state
  if (req.method === 'GET' && url.pathname === '/api/session') {
    if (!fs.existsSync(SESSION_FILE)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'not_found', message: 'No active session exists.' }));
      return;
    }

    const etag = getFileETag(SESSION_FILE);
    const clientEtag = req.headers['if-none-match'];

    if (clientEtag && clientEtag === etag) {
      writeLog('info', 'Session ETag matched. Returning 304 Not Modified', correlationId);
      res.writeHead(304);
      res.end();
      return;
    }

    try {
      const data = fs.readFileSync(SESSION_FILE, 'utf8');
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'ETag': etag
      });
      res.end(data);
    } catch (err) {
      writeLog('error', 'Failed to read session file', correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read session file.' }));
    }
    return;
  }

  // 2. POST /api/session - Create or update alignment state
  if (req.method === 'POST' && url.pathname === '/api/session') {
    let body = '';
    let tooLarge = false;
    const MAX_SIZE = 100 * 1024; // 100KB limit
    req.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_SIZE) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const payload = JSON.parse(body);
        
        // Merge into global sessionState to prevent write race conditions
        if (payload.targetPath !== undefined && typeof payload.targetPath === 'string') sessionState.targetPath = payload.targetPath;
        if (payload.status !== undefined && typeof payload.status === 'string') sessionState.status = payload.status;
        if (payload.currentStep !== undefined && typeof payload.currentStep === 'number') sessionState.currentStep = payload.currentStep;
        if (payload.mode !== undefined && typeof payload.mode === 'string') sessionState.mode = payload.mode;

        // Nested validation for answers
        if (payload.answers !== undefined && typeof payload.answers === 'object' && payload.answers !== null) {
          const cleanAnswers = sessionState.answers || {};
          const pAnswers = payload.answers;
          
          if (pAnswers.goals !== undefined && typeof pAnswers.goals === 'string') cleanAnswers.goals = pAnswers.goals;
          if (pAnswers.team !== undefined && typeof pAnswers.team === 'string') cleanAnswers.team = pAnswers.team;
          if (pAnswers.budget !== undefined && typeof pAnswers.budget === 'string') cleanAnswers.budget = pAnswers.budget;
          
          if (pAnswers.platforms !== undefined && Array.isArray(pAnswers.platforms)) {
            cleanAnswers.platforms = pAnswers.platforms.filter(x => typeof x === 'string');
          }
          if (pAnswers.frameworks !== undefined && Array.isArray(pAnswers.frameworks)) {
            cleanAnswers.frameworks = pAnswers.frameworks.filter(x => typeof x === 'string');
          }
          if (pAnswers.testing !== undefined && typeof pAnswers.testing === 'boolean') cleanAnswers.testing = pAnswers.testing;
          if (pAnswers.coverageThreshold !== undefined && typeof pAnswers.coverageThreshold === 'number') {
            cleanAnswers.coverageThreshold = pAnswers.coverageThreshold;
          }
          if (pAnswers.compliance !== undefined && Array.isArray(pAnswers.compliance)) {
            cleanAnswers.compliance = pAnswers.compliance.filter(x => typeof x === 'string');
          }
          sessionState.answers = cleanAnswers;
        }

        // Nested validation for sections
        if (payload.sections !== undefined && typeof payload.sections === 'object' && payload.sections !== null) {
          const cleanSections = sessionState.sections || {};
          const pSections = payload.sections;
          const validSections = ['context', 'stack', 'gates', 'compliance'];
          
          for (const key of validSections) {
            if (pSections[key] !== undefined && typeof pSections[key] === 'object' && pSections[key] !== null) {
              if (pSections[key].status !== undefined && typeof pSections[key].status === 'string') {
                cleanSections[key] = { status: pSections[key].status };
              }
            }
          }
          sessionState.sections = cleanSections;
        }

        // Write atomic updates to disk
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionState, null, 2), 'utf8');
        writeLog('info', 'Successfully updated session state', correlationId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Session updated.' }));
      } catch (err) {
        writeLog('error', 'Malformed payload in session update', correlationId, { error: err.message });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // 2b. POST /api/scan - Trigger codebase scan
  if (req.method === 'POST' && url.pathname === '/api/scan') {
    if (isScanning || activeScanProcess !== null) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'A scan is already in progress.' }));
      return;
    }

    try {
      if (!fs.existsSync(SESSION_FILE)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No active session configuration found to scan.' }));
        return;
      }

      const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      const manifest = generateManifestFromSession(session);
      const manifestPath = path.join(ROOT, '.repo-wizard', 'manifest.json');
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      // Reset logs and state
      scanLogs = [];
      isScanning = true;
      scanLogs.push(`[${new Date().toLocaleTimeString()}] Starting codebase scan...`);
      scanLogs.push(`[${new Date().toLocaleTimeString()}] Sizing codebase: detected target directory at "${session.targetPath}"`);

      // Spawn run-orchestration.js in background
      activeScanProcess = spawn('node', [path.join(ROOT, 'scripts', 'run-orchestration.js')], {
        cwd: ROOT,
        env: { ...process.env, MOCK_CLI: 'true', MOCK_REPO_NAME: path.basename(session.targetPath || 'repo') }
      });

      activeScanProcess.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            scanLogs.push(`[${new Date().toLocaleTimeString()}] ${line.trim()}`);
          }
        }
      });

      activeScanProcess.stderr.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            scanLogs.push(`[${new Date().toLocaleTimeString()}] [ERROR] ${line.trim()}`);
          }
        }
      });

      activeScanProcess.on('close', (code) => {
        scanLogs.push(`[${new Date().toLocaleTimeString()}] Scan process completed with exit code ${code}`);
        isScanning = false;
        activeScanProcess = null;
        
        // Update session state status on disk
        if (fs.existsSync(SESSION_FILE)) {
          try {
            const currentSession = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
            currentSession.status = code === 0 ? 'completed' : 'failed';
            fs.writeFileSync(SESSION_FILE, JSON.stringify(currentSession, null, 2), 'utf8');
            sessionState.status = currentSession.status;
          } catch (e) {
            writeLog('error', 'Failed to update session status on scan close', correlationId, { error: e.message });
          }
        }
      });

      writeLog('info', 'codebase scan process spawned successfully', correlationId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Scan started.' }));

    } catch (err) {
      writeLog('error', 'Failed to trigger scan', correlationId, { error: err.message });
      isScanning = false;
      activeScanProcess = null;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Internal server error: ${err.message}` }));
    }
    return;
  }

  // 2c. GET /api/scan-logs - Retrieve real-time scan logs
  if (req.method === 'GET' && url.pathname === '/api/scan-logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ logs: scanLogs, isScanning }));
    return;
  }

  // 2d. POST /api/cancel-scan - Cancel active scan process
  if (req.method === 'POST' && url.pathname === '/api/cancel-scan') {
    if (activeScanProcess) {
      try {
        activeScanProcess.kill('SIGKILL');
      } catch (err) {
        writeLog('error', 'Failed to terminate scan process', correlationId, { error: err.message });
      }
      scanLogs.push(`[${new Date().toLocaleTimeString()}] [CANCEL] Scan cancelled by user request.`);
      isScanning = false;
      activeScanProcess = null;
      
      // Update session status to paused on disk
      if (fs.existsSync(SESSION_FILE)) {
        try {
          const currentSession = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
          currentSession.status = 'paused';
          fs.writeFileSync(SESSION_FILE, JSON.stringify(currentSession, null, 2), 'utf8');
          sessionState.status = 'paused';
        } catch (e) {
          writeLog('error', 'Failed to update session status on scan cancel', correlationId, { error: e.message });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Scan cancelled.' }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active scan process to cancel.' }));
    }
    return;
  }

  // 3. GET /api/reports - Fetch compiled reports list
  if (req.method === 'GET' && url.pathname === '/api/reports') {
    try {
      const files = fs.readdirSync(REPORTS_DIR);
      const reports = files.filter(f => f.startsWith('repo-wizard-') && (f.endsWith('.md') || f.endsWith('.html')));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reports }));
    } catch (err) {
      writeLog('error', 'Failed to read reports directory', correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to retrieve reports.' }));
    }
    return;
  }

  // 4. POST /api/compile-html - Run md-to-html compiler securely in-process
  if (req.method === 'POST' && url.pathname === '/api/compile-html') {
    let body = '';
    let tooLarge = false;
    const MAX_SIZE = 10 * 1024; // 10KB limit
    req.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_SIZE) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const { markdownFile } = JSON.parse(body);
        if (typeof markdownFile !== 'string' || !markdownFile.endsWith('.md')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid markdownFile path. Must end with .md.' }));
          return;
        }

        const inputPath = path.resolve(ROOT, '.repo-wizard', markdownFile);
        const reportsDir = path.resolve(ROOT, '.repo-wizard');

        // Enforce boundary check to prevent Directory Traversal
        if (!inputPath.startsWith(reportsDir + path.sep)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied.' }));
          return;
        }

        const outputPath = inputPath.replace(/\.md$/, '.html');

        if (!fs.existsSync(inputPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File not found: ${markdownFile}` }));
          return;
        }

        writeLog('info', `Compiling markdown to HTML: ${markdownFile}`, correlationId);

        try {
          const mdContent = fs.readFileSync(inputPath, 'utf8');
          const title = path.basename(inputPath, '.md');
          const htmlContent = convertMdToHtml(mdContent, title);
          fs.writeFileSync(outputPath, htmlContent, 'utf8');

          writeLog('info', `Successfully compiled HTML: ${path.basename(outputPath)}`, correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', htmlFile: path.basename(outputPath) }));
        } catch (err) {
          writeLog('error', 'Failed to run md-to-html compilation in-process', correlationId, { error: err.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'HTML compilation failed.' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // 4b. GET /api/report-content - Fetch specific report content securely
  if (req.method === 'GET' && url.pathname === '/api/report-content') {
    try {
      const fileName = url.searchParams.get('file');
      if (!fileName || !fileName.startsWith('repo-wizard-') || (!fileName.endsWith('.md') && !fileName.endsWith('.html'))) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing file name.' }));
        return;
      }

      const filePath = path.resolve(REPORTS_DIR, fileName);

      // Enforce boundary check to prevent Directory Traversal
      if (!filePath.startsWith(REPORTS_DIR + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access denied.' }));
        return;
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Report not found.' }));
        return;
      }

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          writeLog('error', `Failed to read report content: ${fileName}`, correlationId, { error: err.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to read report file.' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ content: data }));
        }
      });
    } catch (err) {
      writeLog('error', 'Exception in report-content handler', correlationId, { error: err.message });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request' }));
    }
    return;
  }

  // 5. Serve Static SPA files (default)
  if (req.method === 'GET') {
    serveStaticFile(res, url.pathname, correlationId);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Run port scan
findOpenPort(PORT_START, (err, openPort) => {
  if (err) {
    writeLog('error', `Failed to find open port: ${err.message}`);
    process.exit(1);
  }
  server.listen(openPort, () => {
    console.log(`\n\x1b[1m\x1b[32m==================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   ^   \x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   R   \x1b[0m  \x1b[1m\x1b[36mRepo Wizard Interactive Dashboard is Live!\x1b[0m`);
    console.log(`\x1b[1m\x1b[34m  Access URL:\x1b[0m \x1b[4mhttp://localhost:${openPort}\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m==================================================\x1b[0m\n`);
    
    writeLog('info', `Dashboard server started successfully on port ${openPort}`);
  });
});
