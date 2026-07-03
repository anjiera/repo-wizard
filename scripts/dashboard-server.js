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
const { convertMdToHtml } = require('../solo-dev-toolkit/scripts/md-to-html');
const ROOT = require('./root-resolver');
const { QUALITY_PILLARS } = require('./quality-pillars');
const { TEAM_COLORS, DISCLAIMER_TEXT, MOCK_CAPABILITY_MAP, MOCK_TOOL_MAP } = require('./report-constants');
const { DEFAULT_CONCLUSION } = require('./report-templates-helper');
const { compileRealReports, getSafeRepoName, redactReportFiles } = require('./reports-compiler-engine');
const MAPPINGS_FILE = path.join(ROOT, 'agents', 'agent-quality-pillar-mappings.json');

// Parse --report-path from startup arguments
const cliReportPathIdx = process.argv.indexOf('--report-path');
let cliReportPath = null;
if (cliReportPathIdx !== -1 && process.argv[cliReportPathIdx + 1] && !process.argv[cliReportPathIdx + 1].startsWith('-')) {
  cliReportPath = process.argv[cliReportPathIdx + 1];
}
const reportRoot = cliReportPath ? path.resolve(cliReportPath) : ROOT;
const REPORTS_ROOT_DIR = path.join(reportRoot, '.repo-wizard', 'reports');

const SessionStatus = Object.freeze({
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
});
let currentPort = 3000;

// Parse --tos-path from startup arguments
const cliTosPathIdx = process.argv.indexOf('--tos-path');
let cliTosPath = null;
if (cliTosPathIdx !== -1 && process.argv[cliTosPathIdx + 1] && !process.argv[cliTosPathIdx + 1].startsWith('-')) {
  cliTosPath = process.argv[cliTosPathIdx + 1];
}
const tosRoot = cliTosPath ? path.resolve(cliTosPath) : path.join(reportRoot, '.repo-wizard');
const TOS_FILE = path.join(tosRoot, '.tos_agreed');

// Parse --report-style from startup arguments
const cliReportStyleIdx = process.argv.indexOf('--report-style');
let cliReportStyle = 'whitepaper';
if (cliReportStyleIdx !== -1 && process.argv[cliReportStyleIdx + 1] && !process.argv[cliReportStyleIdx + 1].startsWith('-')) {
  cliReportStyle = process.argv[cliReportStyleIdx + 1];
}

if (!fs.existsSync(tosRoot)) {
  fs.mkdirSync(tosRoot, { recursive: true });
}

if (!fs.existsSync(REPORTS_ROOT_DIR)) {
  fs.mkdirSync(REPORTS_ROOT_DIR, { recursive: true });
}

const LAST_SESSION_POINTER = path.join(reportRoot, '.repo-wizard', 'last_session_path.json');
let currentSessionFile = path.join(reportRoot, '.repo-wizard', 'session.json');

if (fs.existsSync(LAST_SESSION_POINTER)) {
  try {
    const ptr = JSON.parse(fs.readFileSync(LAST_SESSION_POINTER, 'utf8'));
    if (ptr.lastSessionPath && fs.existsSync(ptr.lastSessionPath)) {
      currentSessionFile = ptr.lastSessionPath;
    }
  } catch (e) {
    // Ignore
  }
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
  server.listen(startPort, '127.0.0.1', () => {
    server.once('close', () => callback(null, startPort));
    server.close();
  });
  server.on('error', () => {
    findOpenPort(startPort + 1, callback);
  });
}

// Initialize in-memory sessionState cache from disk on startup
let sessionState = {};
if (fs.existsSync(currentSessionFile)) {
  try {
    sessionState = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
  } catch (e) {
    sessionState = {};
  }
}

// Concurrency queue to serialize session updates
let sessionPromiseChain = Promise.resolve();

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

function formatETag(stats) {
  return `W/"${stats.size}-${stats.mtimeMs}"`;
}

/**
 * Generates ETag for cache validation (asynchronous version)
 */
async function getFileETagAsync(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return formatETag(stats);
  } catch (err) {
    return '';
  }
}

/**
 * Generates ETag for cache validation
 */
function getFileETag(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return formatETag(stats);
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

async function scanDirectoryExtensions(dir, extCounts, fileLimit = { count: 0 }, maxFiles = 1000, visited = new Set(), depth = 0) {
  if (fileLimit.count >= maxFiles || depth > 10) return;

  let realDir;
  try {
    realDir = await fs.promises.realpath(dir);
  } catch (err) {
    realDir = path.resolve(dir);
  }

  if (visited.has(realDir)) return;
  visited.add(realDir);

  let files;
  try {
    files = await fs.promises.readdir(realDir);
  } catch (err) {
    return;
  }

  const ignoreDirs = ['.git', 'node_modules', 'dist', 'build', '.repo-wizard', 'bin', 'obj', '.agents'];

  for (const file of files) {
    if (fileLimit.count >= maxFiles) break;

    const fullPath = path.join(realDir, file);
    let stat;
    try {
      stat = await fs.promises.lstat(fullPath);
    } catch (err) {
      continue;
    }

    if (stat.isSymbolicLink()) {
      continue;
    }

    if (stat.isDirectory()) {
      if (ignoreDirs.includes(file)) continue;
      await scanDirectoryExtensions(fullPath, extCounts, fileLimit, maxFiles, visited, depth + 1);
    } else if (stat.isFile()) {
      fileLimit.count++;
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        extCounts[ext] = (extCounts[ext] || 0) + 1;
      }
    }
  }
}

// mock-start
function generateMockReports(session) {
  const repoName = getSafeRepoName(session.targetPath);
  const answers = session.answers || {};
  const frameworks = answers.frameworks || [];
  const platforms = answers.platforms || [];
  const compliance = answers.compliance || [];


  const dummyBluf = '*This is a single sentence summary that serves as the BLUF.*';
  const dummyOverview = 'Overview: This is a CEO-level overview in three sentences or less.';
  const dummyText = 'word '.repeat(1200);

  // 1. Executive Summary
  const execSummary = `# Repo Wizard Executive Summary - ${repoName}

## Section 1: Codebase Health & Strengths
${dummyBluf}

${dummyOverview}

${dummyText}

## Section 2: Tooling & Compliance Opportunities
${dummyBluf}

${dummyOverview}

${dummyText}

## Section 3: Rollout Roadmap
${dummyBluf}

${dummyOverview}

${dummyText}

## Section 4: Conclusions
${DEFAULT_CONCLUSION}

${DISCLAIMER_TEXT}
`;

  // 2. Full Technical Report
  const fullReport = `# Repo Wizard Full Technical Report - ${repoName}

## Overview
This full technical report consolidates findings from all active specialist agents.

## Domain Audit Profiles

### 1. General Repository Governance
- Status: Verified
- Observations: Clean repository structure, package manifests detected, standard README present.

### 2. Stack-specific Tooling (${frameworks.join(', ') || 'General'})
- Status: Scaffold Pending
- Observations: Recommended tooling templates mapped for the selected frameworks: ${frameworks.join(', ')}.

### 3. Verification Gates
- Status: Configured
- Target Coverage: ${answers.coverageThreshold || 80}%
- Warnings: ${answers.coverageThreshold === 100 ? 'Warning: 100% target coverage is a threshold and does not guarantee absolute software safety.' : 'Standard threshold target.'}

### 4. Regulatory Compliance Profiles (${compliance.join(', ') || 'None'})
- Status: Analyzed
- Selected standards: ${compliance.join(', ') || 'None'}
- Observations: Scaffolding files ready for standard-specific logging, PII filters, and export routes.

## Suggested Scaffolding Commands
\`\`\`bash
# Install linter templates
node scripts/install-hooks.js
\`\`\`

## 6. Conclusions
${DEFAULT_CONCLUSION}

${DISCLAIMER_TEXT}
`;

  // 3. Observations Summary
  const observationsSummary = `# Repo Wizard Observations Summary - ${repoName}

## Toolchain Assumptions
Based on static file analysis, we assume the repository uses:
- Primary stack / framework elements.
- Clean root structure.

## Compliance Guesses
- Regulatory standards under consideration: ${compliance.join(', ') || 'None'}.

## Suggested Adjustments
- Establish standard lint rules.
- Set up pre-commit validation.

${DISCLAIMER_TEXT}
`;

  const reportsDir = path.join(REPORTS_ROOT, repoName);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const execPath = path.join(reportsDir, `${repoName}-executive-summary.md`);
  const fullPath = path.join(reportsDir, `${repoName}-full-report.md`);
  const obsPath = path.join(reportsDir, `${repoName}-observations.md`);

  try {
    fs.writeFileSync(execPath, execSummary.replace(/#specialist-agent-/g, `${repoName}-full-report.md#specialist-agent-`).replace(/#4/g, `${repoName}-full-report.md#4`), 'utf8');
    fs.writeFileSync(fullPath, fullReport, 'utf8');
    fs.writeFileSync(obsPath, observationsSummary, 'utf8');

    // Also compile them to HTML using the in-process converter
    const htmlExec = convertMdToHtml(
      execSummary.replace(/#specialist-agent-/g, `${repoName}-full-report.html#specialist-agent-`).replace(/#4/g, `${repoName}-full-report.html#4`),
      `Executive Summary - ${repoName}`
    );
    fs.writeFileSync(execPath.replace(/\.md$/, '.html'), htmlExec, 'utf8');

    const htmlFull = convertMdToHtml(fullReport, `Full Technical Report - ${repoName}`);
    fs.writeFileSync(fullPath.replace(/\.md$/, '.html'), htmlFull, 'utf8');

    const htmlObs = convertMdToHtml(observationsSummary, `Observations Summary - ${repoName}`);
    fs.writeFileSync(obsPath.replace(/\.md$/, '.html'), htmlObs, 'utf8');
  } catch (err) {
    console.error('Failed to write mock reports or compile HTML:', err.message);
  }
}
// mock-end

const server = http.createServer((req, res) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  // Set standard security headers to prevent XSS, Clickjacking, and Content Sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;");

  // Validate Host Header to prevent DNS Rebinding
  const host = req.headers.host || '';
  const isLocalhost = /^localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1(:\d+)?$/i.test(host) || /^\[::1\](:\d+)?$/i.test(host);
  if (!isLocalhost) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Invalid Host header.');
    return;
  }

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

    const isLocalOrigin = !origin || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
    const isLocalReferer = !referer || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/.test(referer);
    
    if (!isLocalOrigin || !isLocalReferer) {
      writeLog('warning', 'CSRF validation failed for POST request', correlationId, { origin, referer });
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: CSRF validation failed.' }));
      return;
    }
  }

  // Secure CORS Headers: only allow requests from localhost/127.0.0.1/[::1]
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
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
    (async () => {
      let activeTosFile = TOS_FILE;
      if (fs.existsSync(currentSessionFile)) {
        try {
          const sess = JSON.parse(await fs.promises.readFile(currentSessionFile, 'utf8'));
          if (sess.tosPath) {
            activeTosFile = path.join(path.resolve(sess.tosPath), '.tos_agreed');
          }
        } catch (e) {}
      }
      const exists = await fileExists(activeTosFile);
      if (!exists) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ consented: false }));
        return;
      }
      try {
        const data = JSON.parse(await fs.promises.readFile(activeTosFile, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ consented: true, data }));
      } catch (err) {
        writeLog('error', 'Failed to read TOS consent file', correlationId, { error: err.message });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ consented: false }));
      }
    })();
    return;
  }

  // 0c. GET /api/tos - Get TOS HTML compiled from markdown
  if (req.method === 'GET' && url.pathname === '/api/tos') {
    (async () => {
      try {
        const tosMdPath = path.join(ROOT, 'references', 'terms-of-service.md');
        const mdContent = await fs.promises.readFile(tosMdPath, 'utf8');
        const html = convertMdToHtml(mdContent, 'Terms of Service & Developer Consent');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ html }));
      } catch (err) {
        writeLog('error', 'Failed to read or convert TOS markdown file', correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to retrieve Terms of Service' }));
      }
    })();
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
      (async () => {
        try {
          const payload = JSON.parse(body);
          if (payload.agreed === true) {
            const consentData = {
              agreed: true,
              agreed_by: typeof payload.agreed_by === 'string' ? payload.agreed_by : 'dev-user',
              timestamp: new Date().toISOString()
            };
            let activeTosFile = TOS_FILE;
            if (fs.existsSync(currentSessionFile)) {
              try {
                const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
                if (sess.tosPath) {
                  activeTosFile = path.join(path.resolve(sess.tosPath), '.tos_agreed');
                }
              } catch (e) {}
            }
            await fs.promises.mkdir(path.dirname(activeTosFile), { recursive: true });
            await fs.promises.writeFile(activeTosFile, JSON.stringify(consentData, null, 2), 'utf8');
            writeLog('info', 'TOS Consent saved successfully', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'TOS accepted.' }));
          } else {
            let activeTosFile = TOS_FILE;
            if (fs.existsSync(currentSessionFile)) {
              try {
                const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
                if (sess.tosPath) {
                  activeTosFile = path.join(path.resolve(sess.tosPath), '.tos_agreed');
                }
              } catch (e) {}
            }
            const exists = await fileExists(activeTosFile);
            if (exists) {
              await fs.promises.unlink(activeTosFile);
            }
            writeLog('info', 'TOS Consent declined / revoked', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'declined', message: 'TOS declined.' }));
          }
        } catch (err) {
          if (err instanceof SyntaxError) {
            writeLog('error', 'Malformed payload in consent update', correlationId, { error: err.message });
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
          } else {
            writeLog('error', 'Filesystem error during consent update', correlationId, { error: err.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Internal server error: ${err.message}` }));
          }
        }
      })();
    });
    return;
  }

  // 1. GET /api/session - Read alignment questionnaire state
  if (req.method === 'GET' && url.pathname === '/api/session') {
    (async () => {
      const exists = await fileExists(currentSessionFile);
      if (!exists) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'not_found', message: 'No active session exists.' }));
        return;
      }

      const etag = await getFileETagAsync(currentSessionFile);
      const clientEtag = req.headers['if-none-match'];

      if (clientEtag && clientEtag === etag) {
        writeLog('info', 'Session ETag matched. Returning 304 Not Modified', correlationId);
        res.writeHead(304);
        res.end();
        return;
      }

      try {
        const data = await fs.promises.readFile(currentSessionFile, 'utf8');
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
    })();
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

      sessionPromiseChain = sessionPromiseChain.then(async () => {
        let payload;
        try {
          payload = JSON.parse(body);
        } catch (jsonErr) {
          writeLog('error', 'Malformed payload in session update', correlationId, { error: jsonErr.message });
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
          return;
        }

        try {
          // Reload from disk to prevent concurrency race conditions
          const exists = await fileExists(currentSessionFile);
          if (exists) {
            try {
              sessionState = JSON.parse(await fs.promises.readFile(currentSessionFile, 'utf8'));
            } catch (e) { /* ignore */ }
          }

          let repoName = 'project';
          let activeReportRoot = sessionState.reportPath ? path.resolve(sessionState.reportPath) : reportRoot;
          if (payload.reportPath !== undefined && typeof payload.reportPath === 'string') {
            activeReportRoot = payload.reportPath ? path.resolve(payload.reportPath) : reportRoot;
          }
          const activeReportsRootDir = path.join(activeReportRoot, '.repo-wizard', 'reports');

          if (payload.targetPath !== undefined && typeof payload.targetPath === 'string') {
            const oldPath = sessionState.targetPath;
            if (payload.targetPath !== oldPath) {
              repoName = getSafeRepoName(payload.targetPath);
              const targetSessionFile = path.join(activeReportsRootDir, repoName, 'session.json');
              const targetExists = await fileExists(targetSessionFile);
              if (targetExists) {
                try {
                  sessionState = JSON.parse(await fs.promises.readFile(targetSessionFile, 'utf8'));
                } catch (e) {
                  sessionState = {};
                }
              } else {
                sessionState = {};
              }
              sessionState.targetPath = payload.targetPath;
            }
            sessionState.targetPath = payload.targetPath;
            repoName = getSafeRepoName(payload.targetPath);
          } else if (sessionState.targetPath) {
            repoName = getSafeRepoName(sessionState.targetPath);
          }

          if (payload.status !== undefined && typeof payload.status === 'string') sessionState.status = payload.status;
          if (payload.currentStep !== undefined && typeof payload.currentStep === 'number') sessionState.currentStep = payload.currentStep;
          if (payload.mode !== undefined && typeof payload.mode === 'string') sessionState.mode = payload.mode;
          if (payload.redact !== undefined) sessionState.redact = !!payload.redact;
          if (payload.reportPath !== undefined && typeof payload.reportPath === 'string') sessionState.reportPath = payload.reportPath;
          if (payload.tosPath !== undefined && typeof payload.tosPath === 'string') sessionState.tosPath = payload.tosPath;
          if (!sessionState.reportStyle) {
            sessionState.reportStyle = cliReportStyle || 'whitepaper';
          }

          // Nested validation for answers
          if (payload.answers !== undefined && typeof payload.answers === 'object' && payload.answers !== null) {
            const cleanAnswers = sessionState.answers || {};
            const pAnswers = payload.answers;
            
            if (pAnswers.goals !== undefined && typeof pAnswers.goals === 'string') cleanAnswers.goals = pAnswers.goals;
            if (pAnswers.team !== undefined && typeof pAnswers.team === 'string') cleanAnswers.team = pAnswers.team;
            if (pAnswers.budget !== undefined && typeof pAnswers.budget === 'string') cleanAnswers.budget = pAnswers.budget;
            if (pAnswers.projectGoal !== undefined && typeof pAnswers.projectGoal === 'string') cleanAnswers.projectGoal = pAnswers.projectGoal;
            if (pAnswers.expertiseLevel !== undefined && typeof pAnswers.expertiseLevel === 'string') cleanAnswers.expertiseLevel = pAnswers.expertiseLevel;
            
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
            let validSections = ['context', 'stack', 'gates', 'compliance'];
            try {
              const configPath = path.resolve(__dirname, '..', 'dashboard', 'src', 'config', 'stepper-config.json');
              if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config && Array.isArray(config.steps)) {
                  validSections = config.steps.map(s => s.id);
                }
              }
            } catch (err) {
              // fallback
            }
            
            for (const key of validSections) {
              if (pSections[key] !== undefined && typeof pSections[key] === 'object' && pSections[key] !== null) {
                if (pSections[key].status !== undefined && typeof pSections[key].status === 'string') {
                  cleanSections[key] = { status: pSections[key].status };
                }
              }
            }
            sessionState.sections = cleanSections;
          }

          // Select the correct output session file
          const activeReportRootFinal = sessionState.reportPath ? path.resolve(sessionState.reportPath) : reportRoot;
          const activeReportsRootDirFinal = path.join(activeReportRootFinal, '.repo-wizard', 'reports');
          const newSessionFile = path.join(activeReportsRootDirFinal, repoName, 'session.json');
          await fs.promises.mkdir(path.dirname(newSessionFile), { recursive: true });
          currentSessionFile = newSessionFile;

          // Save pointer atomically
          const tempPointer = LAST_SESSION_POINTER + '.tmp';
          await fs.promises.writeFile(tempPointer, JSON.stringify({ lastSessionPath: currentSessionFile }, null, 2), 'utf8');
          await fs.promises.rename(tempPointer, LAST_SESSION_POINTER);

          // Write session file atomically
          const tempSession = currentSessionFile + '.tmp';
          await fs.promises.writeFile(tempSession, JSON.stringify(sessionState, null, 2), 'utf8');
          await fs.promises.rename(tempSession, currentSessionFile);

          writeLog('info', 'Successfully updated session state', correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'Session updated.' }));
        } catch (fsErr) {
          writeLog('error', 'Failed to update session file on disk', correlationId, { error: fsErr.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error updating session state.' }));
        }
      }).catch(err => {
        writeLog('error', 'Critical queue exception during session update', correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server queue error.' }));
      });
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
        path.join(ROOT, 'scripts', 'run-orchestration.js'),
        '--target-path',
        session.targetPath,
        '--mock-cli',
        'false'
      ];
      if (session.reportPath) {
        spawnArgs.push('--report-path', session.reportPath);
      }
      
      const targetStyle = session.reportStyle || cliReportStyle || 'whitepaper';
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
              sessionState.status = currentSession.status;
            }
            
            if (code === 0) {
              const isMockMode = false;
              if (isMockMode) {
                generateMockReports(currentSession);
              } else {
                compileRealReports(currentSession);
              }
              if (currentSession.redact) {
                writeLog('info', 'Redaction is enabled. Scrubbing report files...', correlationId);
                const repoName = getSafeRepoName(currentSession.targetPath);
                const activeReportRootScan = currentSession.reportPath ? path.resolve(currentSession.reportPath) : reportRoot;
                const reportsDir = path.join(activeReportRootScan, '.repo-wizard', 'reports', repoName);
                redactReportFiles(reportsDir, repoName, currentSession.targetPath);
              }
            }
          } catch (e) {
            writeLog('error', 'Failed to update session status or compile mock reports on scan close', correlationId, { error: e.message });
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
        killProcessTree(activeScanProcess);
      } catch (err) {
        writeLog('error', 'Failed to terminate scan process tree', correlationId, { error: err.message });
      }
      scanLogs.push(`[${new Date().toLocaleTimeString()}] [CANCEL] Scan cancelled by user request.`);
      isScanning = false;
      activeScanProcess = null;
      
      // Update session status to paused on disk
      if (fs.existsSync(currentSessionFile)) {
        try {
           const currentSession = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
           currentSession.status = SessionStatus.PAUSED;
           fs.writeFileSync(currentSessionFile, JSON.stringify(currentSession, null, 2), 'utf8');
           sessionState.status = SessionStatus.PAUSED;
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

  // 2e. POST /api/analyze-target - Analyze target directory for language mismatches
  if (req.method === 'POST' && url.pathname === '/api/analyze-target') {
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
        const payload = JSON.parse(body);
        const targetPath = payload.targetPath || (sessionState && sessionState.targetPath);
        
        if (!targetPath || !fs.existsSync(targetPath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid or missing target directory path.' }));
          return;
        }

        const extCounts = {};
        const fileLimit = { count: 0 };
        scanDirectoryExtensions(targetPath, extCounts, fileLimit, 1000)
          .then(() => {
            // Fetch selected frameworks from current sessionState
            const selectedFrameworks = (sessionState && sessionState.answers && sessionState.answers.frameworks) || [];

            const warnings = [];

            // Check for selected but missing
            const langMap = {
              'react': { name: 'React / Node.js', extensions: ['.js', '.jsx', '.ts', '.tsx'] },
              'rust': { name: 'Rust (Cargo)', extensions: ['.rs'] },
              '.net': { name: '.NET Core (C#)', extensions: ['.cs'] },
              'swift': { name: 'Swift', extensions: ['.swift'] },
              'unity': { name: 'Unity (C#)', extensions: ['.cs', '.meta'] },
              'godot': { name: 'Godot (GDScript)', extensions: ['.gd', '.tscn'] },
              'cobol': { name: 'COBOL', extensions: ['.cob', '.cbl'] },
              'php': { name: 'PHP', extensions: ['.php'] }
            };

            for (const [key, spec] of Object.entries(langMap)) {
              if (selectedFrameworks.includes(key)) {
                const hasAny = spec.extensions.some(ext => (extCounts[ext] || 0) > 0);
                if (!hasAny) {
                  warnings.push(`You selected "${spec.name}" but no matching files (${spec.extensions.join(', ')}) were detected.`);
                }
              }
            }

            // Check for unselected but present
            const unselectedChecks = {
              '.php': { key: 'php', name: 'PHP' },
              '.rs': { key: 'rust', name: 'Rust' },
              '.gd': { key: 'godot', name: 'Godot (GDScript)' },
              '.cob': { key: 'cobol', name: 'COBOL' },
              '.swift': { key: 'swift', name: 'Swift' }
            };

            for (const [ext, info] of Object.entries(unselectedChecks)) {
              if (!selectedFrameworks.includes(info.key)) {
                const count = extCounts[ext] || 0;
                if (count > 5) {
                  warnings.push(`We detected ${count} files with extension "${ext}" (${info.name}) which was not selected in your technical stack.`);
                }
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', warnings }));
          })
          .catch(err => {
            writeLog('error', 'Failed in scanDirectoryExtensions async traversal', correlationId, { error: err.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Analysis failed: ${err.message}` }));
          });

      } catch (err) {
        writeLog('error', 'Exception in analyze-target handler', correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Analysis failed: ${err.message}` }));
      }
    });
  }

  // 2f. POST /api/browse-directory - Browse local directory tree
  if (req.method === 'POST' && url.pathname === '/api/browse-directory') {
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
    req.on('end', async () => {
      if (tooLarge) return;
      try {
        const payload = JSON.parse(body);
        let target = payload.currentPath;

        async function getWindowsDrives() {
          const drives = [];
          if (process.platform === 'win32') {
            const promises = [];
            for (let charCode = 67; charCode <= 90; charCode++) {
              const drive = String.fromCharCode(charCode) + ':\\';
              const checkPromise = fs.promises.access(drive, fs.constants.F_OK)
                .then(() => drive)
                .catch(() => null);
              const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 200));
              promises.push(Promise.race([checkPromise, timeoutPromise]));
            }
            const results = await Promise.all(promises);
            for (const res of results) {
              if (res) drives.push(res);
            }
          }
          return drives;
        }
        
        if (target === 'drives') {
          const drives = await getWindowsDrives();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            currentPath: 'drives',
            parentPath: null,
            directories: drives
          }));
          return;
        }

        let resolved = target ? path.resolve(target) : ROOT;
        
        // Path Traversal containment check: restrict system-critical directories
        const winSysDirs = [];
        if (process.env.SystemRoot) winSysDirs.push(path.resolve(process.env.SystemRoot));
        if (process.env.ProgramFiles) winSysDirs.push(path.resolve(process.env.ProgramFiles));
        if (process.env['ProgramFiles(x86)']) winSysDirs.push(path.resolve(process.env['ProgramFiles(x86)']));
        if (process.env.ProgramData) winSysDirs.push(path.resolve(process.env.ProgramData));
        const unixSysDirs = ['/System', '/Library', '/var', '/etc', '/bin', '/sbin', '/private', '/dev', '/proc', '/sys'];
        
        const resolvedLower = resolved.toLowerCase();
        const isRestricted = [...winSysDirs, ...unixSysDirs].some(sysDir => {
          try {
            const sysDirLower = path.resolve(sysDir).toLowerCase();
            return resolvedLower === sysDirLower || resolvedLower.startsWith(sysDirLower + path.sep);
          } catch (e) {
            return false;
          }
        });

        if (isRestricted) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Access to system directory is restricted: ${resolved}` }));
          return;
        }
        
        if (!fs.existsSync(resolved)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Path does not exist: ${target}` }));
          return;
        }

        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
          resolved = path.dirname(resolved);
        }

        let parent = path.dirname(resolved);
        if (parent === resolved) {
          parent = process.platform === 'win32' ? 'drives' : null;
        }

        const directories = [];
        try {
          const files = fs.readdirSync(resolved);
          for (const file of files) {
            if (['.git', 'System Volume Information', '$RECYCLE.BIN'].includes(file)) {
              continue;
            }
            try {
              const fullPath = path.join(resolved, file);
              const fileStat = fs.statSync(fullPath);
              if (fileStat.isDirectory()) {
                directories.push(file);
              }
            } catch (e) { /* ignore */ }
          }
        } catch (err) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: `Permission denied or folder inaccessible: ${resolved}`,
            currentPath: resolved,
            parentPath: parent,
            directories: []
          }));
          return;
        }

        directories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          currentPath: resolved,
          parentPath: parent,
          directories: directories
        }));

      } catch (err) {
        writeLog('error', 'Exception in browse-directory handler', correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Internal server error: ${err.message}` }));
      }
    });
    return;
  }

function scanReports(dir, baseDir, fileList = [], depth = 0, maxFiles = 1000) {
  if (depth > 5 || fileList.length >= maxFiles) return fileList;
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (fileList.length >= maxFiles) break;
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.lstatSync(fullPath);
    } catch (e) {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      if (file !== 'agents' && file !== 'history') {
        scanReports(fullPath, baseDir, fileList, depth + 1, maxFiles);
      }
    } else {
      if (file === 'backlog.csv' || file.endsWith('.md') || file.endsWith('.html')) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        fileList.push(relativePath);
      }
    }
  }
  return fileList;
}

  // 3. GET /api/reports - Fetch compiled reports list
  if (req.method === 'GET' && url.pathname === '/api/reports') {
    try {
      let activeReportsRoot = REPORTS_ROOT_DIR;
      if (fs.existsSync(currentSessionFile)) {
        try {
          const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
          if (sess.reportPath) {
            activeReportsRoot = path.join(path.resolve(sess.reportPath), '.repo-wizard', 'reports');
          }
        } catch (e) {}
      }
      const reports = scanReports(activeReportsRoot, activeReportsRoot);
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

        let activeReportsRoot = REPORTS_ROOT_DIR;
        if (fs.existsSync(currentSessionFile)) {
          try {
            const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
            if (sess.reportPath) {
              activeReportsRoot = path.join(path.resolve(sess.reportPath), '.repo-wizard', 'reports');
            }
          } catch (e) {}
        }
        const inputPath = path.resolve(activeReportsRoot, markdownFile);

        // Enforce boundary check to prevent Directory Traversal
        const relative = path.relative(activeReportsRoot, inputPath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
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
          const reportStyle = (sessionState && sessionState.reportStyle) ? sessionState.reportStyle : (cliReportStyle || 'whitepaper');
          const htmlContent = convertMdToHtml(mdContent, title, reportStyle);
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
      if (!fileName || fileName.includes('\0') || fileName.includes('%00') || (!fileName.endsWith('.md') && !fileName.endsWith('.html') && !fileName.endsWith('.csv'))) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing file name.' }));
        return;
      }

      const baseName = path.basename(fileName);
      const isAllowedFile = baseName === 'backlog.csv' || 
                            baseName.endsWith('-executive-summary.md') || 
                            baseName.endsWith('-executive-summary.html') || 
                            baseName.endsWith('-full-report.md') || 
                            baseName.endsWith('-full-report.html') || 
                            baseName.endsWith('-observations.md') || 
                            baseName.endsWith('-observations.html');
      if (!isAllowedFile) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid file name pattern.' }));
        return;
      }

      let activeReportsRoot = REPORTS_ROOT_DIR;
      if (fs.existsSync(currentSessionFile)) {
        try {
          const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
          if (sess.reportPath) {
            activeReportsRoot = path.join(path.resolve(sess.reportPath), '.repo-wizard', 'reports');
          }
        } catch (e) {}
      }
      const filePath = path.resolve(activeReportsRoot, fileName);

      // Enforce boundary check to prevent Directory Traversal
      const relative = path.relative(activeReportsRoot, filePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
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

// Start server trying sequentially higher ports to avoid TOCTOU race conditions
function startServer(port) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`\n\x1b[1m\x1b[32m==================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   ^   \x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   R   \x1b[0m  \x1b[1m\x1b[36mRepo Wizard Interactive Dashboard is Live!\x1b[0m`);
    console.log(`\x1b[1m\x1b[34m  Access URL:\x1b[0m \x1b[4mhttp://localhost:${port}\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m==================================================\x1b[0m\n`);
    
    writeLog('info', `Dashboard server started successfully on port ${port}`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    writeLog('info', `Port ${currentPort} in use, trying next port...`);
    currentPort++;
    if (currentPort > 65535) {
      writeLog('error', 'No open ports found in range 3000-65535');
      process.exit(1);
    }
    startServer(currentPort);
  } else {
    writeLog('error', `Server error: ${err.message}`);
    process.exit(1);
  }
});

if (require.main === module) {
  startServer(currentPort);
}

module.exports = {
  compileRealReports,
  getSafeRepoName
};

function killProcessTree(proc) {
  if (!proc) return;
  const pid = proc.pid;
  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } catch (e) {
      writeLog('error', `Exception running taskkill for pid ${pid}`, '', { error: e.message });
    }
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (err) {
      try {
        proc.kill('SIGKILL');
      } catch (e) {
        // Ignore
      }
    }
  }
}

function cleanupActiveScan() {
  if (activeScanProcess) {
    try {
      killProcessTree(activeScanProcess);
      writeLog('info', 'Successfully terminated active scan process tree on server exit.');
    } catch (err) {
      console.error('Failed to terminate active scan process on exit:', err.message);
    }
    activeScanProcess = null;
  }
}

process.on('exit', cleanupActiveScan);
process.on('SIGINT', () => {
  cleanupActiveScan();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupActiveScan();
  process.exit(0);
});
process.on('SIGHUP', () => {
  cleanupActiveScan();
  process.exit(0);
});


