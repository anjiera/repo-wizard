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
const TOS_FILE = path.join(ROOT, '.repo-wizard', '.tos_agreed');

const REPORTS_ROOT = path.join(ROOT, '.repo-wizard', 'reports');
if (!fs.existsSync(REPORTS_ROOT)) {
  fs.mkdirSync(REPORTS_ROOT, { recursive: true });
}

function getSafeRepoName(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return 'project';
  const resolved = path.resolve(targetPath);
  let name = path.basename(resolved);
  name = name.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!name || name === '.' || name === '..' || name.toLowerCase() === 'reports') {
    return 'project';
  }
  return name;
}

const LAST_SESSION_POINTER = path.join(ROOT, '.repo-wizard', 'last_session_path.json');
let currentSessionFile = path.join(ROOT, '.repo-wizard', 'session.json');

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
if (fs.existsSync(currentSessionFile)) {
  try {
    sessionState = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
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

async function scanDirectoryExtensions(dir, extCounts, fileLimit = { count: 0 }, maxFiles = 1000) {
  if (fileLimit.count >= maxFiles) return;

  let files;
  try {
    files = await fs.promises.readdir(dir);
  } catch (err) {
    return;
  }

  const ignoreDirs = ['.git', 'node_modules', 'dist', 'build', '.repo-wizard', 'bin', 'obj', '.agents'];

  for (const file of files) {
    if (fileLimit.count >= maxFiles) break;

    const fullPath = path.join(dir, file);
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
      await scanDirectoryExtensions(fullPath, extCounts, fileLimit, maxFiles);
    } else if (stat.isFile()) {
      fileLimit.count++;
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        extCounts[ext] = (extCounts[ext] || 0) + 1;
      }
    }
  }
}

function generateMockReports(session) {
  const repoName = getSafeRepoName(session.targetPath);
  const answers = session.answers || {};
  const frameworks = answers.frameworks || [];
  const platforms = answers.platforms || [];
  const compliance = answers.compliance || [];

  // 1. Executive Summary
  const execSummary = `# Repo Wizard Executive Summary - ${repoName}

## Section 1: Codebase Health & Strengths
The repository "${repoName}" displays a healthy structure with standard package files, organized folders, and version control configurations. Static checks indicate a stable foundation, enabling systematic adoption of modern linter and code quality gates.

## Section 2: Tooling & Compliance Opportunities
We identified opportunities to strengthen quality control by integrating static analysis configurations for the selected frameworks: ${frameworks.join(', ') || 'General'}. Furthermore, compliance integrations for ${compliance.join(', ') || 'None'} will assist in enforcing data boundary policies and privacy governance.

## Section 3: Rollout Roadmap
We recommend a three-step roadmap: first, establish linter rules and pre-commit validation. Second, configure verification gates in CI to enforce the target ${answers.coverageThreshold || 80}% test coverage. Third, initialize standard audit checklists for the selected platforms: ${platforms.join(', ') || 'General'}.

Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.
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

Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.
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

Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.
`;

  const reportsDir = path.join(REPORTS_ROOT, repoName);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const execPath = path.join(reportsDir, `repo-wizard-executive-summary-${repoName}.md`);
  const fullPath = path.join(reportsDir, `repo-wizard-full-report-${repoName}.md`);
  const obsPath = path.join(reportsDir, `repo-wizard-observations-${repoName}.md`);

  try {
    fs.writeFileSync(execPath, execSummary, 'utf8');
    fs.writeFileSync(fullPath, fullReport, 'utf8');
    fs.writeFileSync(obsPath, observationsSummary, 'utf8');

    // Also compile them to HTML using the in-process converter
    const htmlExec = convertMdToHtml(execSummary, `Executive Summary - ${repoName}`);
    fs.writeFileSync(execPath.replace(/\.md$/, '.html'), htmlExec, 'utf8');

    const htmlFull = convertMdToHtml(fullReport, `Full Technical Report - ${repoName}`);
    fs.writeFileSync(fullPath.replace(/\.md$/, '.html'), htmlFull, 'utf8');

    const htmlObs = convertMdToHtml(observationsSummary, `Observations Summary - ${repoName}`);
    fs.writeFileSync(obsPath.replace(/\.md$/, '.html'), htmlObs, 'utf8');
  } catch (err) {
    console.error('Failed to write mock reports or compile HTML:', err.message);
  }
}

function compileRealReports(session) {
  const repoName = getSafeRepoName(session.targetPath);
  const reportsDir = path.join(REPORTS_ROOT, repoName);
  const obsDir = path.join(reportsDir, 'agents');
  
  const answers = session.answers || {};
  const frameworks = answers.frameworks || [];
  const platforms = answers.platforms || [];
  const compliance = answers.compliance || [];

  const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

  // Read all observations
  let consolidatedObservations = '';
  let executedAgents = [];
  if (fs.existsSync(obsDir)) {
    try {
      const files = fs.readdirSync(obsDir);
      for (const file of files) {
        if (file.startsWith(`${repoName}-observations-`) && file.endsWith('.md')) {
          const agentName = file.replace(`${repoName}-observations-`, '').replace(/\.md$/, '');
          executedAgents.push(agentName);
          const content = fs.readFileSync(path.join(obsDir, file), 'utf8');
          consolidatedObservations += `\n### Specialist Agent: ${agentName}\n\n${content}\n---\n`;
        }
      }
    } catch (e) {
      writeLog('error', 'Failed to read observations directory for compilation', '', { error: e.message });
    }
  }

  if (executedAgents.length === 0) {
    executedAgents.push('General Quality Auditor');
  }

  // 1. Executive Summary
  const execSummary = `# Repo Wizard Executive Summary - ${repoName}

## Section 1: Codebase Health & Strengths
We completed a real codebase scan using specialist agents: ${executedAgents.join(', ')}. Based on structural and framework analysis, the repository "${repoName}" contains well-structured components and assets. This solid foundation simplifies integrating automated validation routines and pre-submission validation.

## Section 2: Tooling & Compliance Opportunities
We identified clear opportunities to strengthen quality control, security, and repository governance. Integrating the recommended specialist tools will help mitigate code quality and architectural risks. In particular, we suggest configuring validation workflows for the selected stack: ${frameworks.join(', ') || 'General'}.

## Section 3: Rollout Roadmap
First, initialize standard linter rules and commit validation gates. Second, configure test verification workflows to target a ${answers.coverageThreshold || 80}% coverage limit. Third, deploy specialized compliance checkers to enforce policy boundaries on platforms: ${platforms.join(', ') || 'General'}.

${DISCLAIMER_TEXT}
`;

  // 2. Full Technical Report
  const fullReport = `# Repo Wizard Full Technical Report - ${repoName}

## Overview
This report consolidates findings and configurations from all executed specialist agents.

## Domain Audit Profiles
${consolidatedObservations || 'No specialist observations were recorded.'}

## Verification Target
- Target Coverage Threshold: ${answers.coverageThreshold || 80}%
- Compliance Standards: ${compliance.join(', ') || 'None'}

${DISCLAIMER_TEXT}
`;

  // 3. Observations Summary
  const observationsSummary = `# Repo Wizard Observations Summary - ${repoName}

## Toolchain Assumptions
The codebase was scanned and verified under assumptions for:
- Frameworks / Stack: ${frameworks.join(', ') || 'General'}
- Platforms / Targets: ${platforms.join(', ') || 'General'}

## Compliance Guesses
- Selected Compliance Standards: ${compliance.join(', ') || 'None'}

## Suggested Adjustments
- Establish standard lint rules.
- Set up pre-commit validation.

${DISCLAIMER_TEXT}
`;

  const execPath = path.join(reportsDir, `repo-wizard-executive-summary-${repoName}.md`);
  const fullPath = path.join(reportsDir, `repo-wizard-full-report-${repoName}.md`);
  const obsPath = path.join(reportsDir, `repo-wizard-observations-${repoName}.md`);

  try {
    fs.writeFileSync(execPath, execSummary, 'utf8');
    fs.writeFileSync(fullPath, fullReport, 'utf8');
    fs.writeFileSync(obsPath, observationsSummary, 'utf8');

    // Compile to HTML
    const htmlExec = convertMdToHtml(execSummary, `Executive Summary - ${repoName}`);
    fs.writeFileSync(execPath.replace(/\.md$/, '.html'), htmlExec, 'utf8');

    const htmlFull = convertMdToHtml(fullReport, `Full Technical Report - ${repoName}`);
    fs.writeFileSync(fullPath.replace(/\.md$/, '.html'), htmlFull, 'utf8');

    const htmlObs = convertMdToHtml(observationsSummary, `Observations Summary - ${repoName}`);
    fs.writeFileSync(obsPath.replace(/\.md$/, '.html'), htmlObs, 'utf8');
    
    // Generate backlog CSV if mode is backlog
    if (session.mode === 'backlog') {
      const csvPath = path.join(reportsDir, 'backlog.csv');
      let csvContent = 'Summary,Description,Issue Type,Epic Name / Parent,Labels,Recommended By (Sub-Agent),Frameworks/Goals\n';
      csvContent += `"Configure pre-commit hook","Install pre-commit hook and linter scripts. ${DISCLAIMER_TEXT}","Story","Scaffolding","governance","vcs-workflow-agent","General"\n`;
      fs.writeFileSync(csvPath, csvContent, 'utf8');
    }
  } catch (err) {
    console.error('Failed to compile real reports:', err.message);
  }
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
    if (!fs.existsSync(currentSessionFile)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'not_found', message: 'No active session exists.' }));
      return;
    }

    const etag = getFileETag(currentSessionFile);
    const clientEtag = req.headers['if-none-match'];

    if (clientEtag && clientEtag === etag) {
      writeLog('info', 'Session ETag matched. Returning 304 Not Modified', correlationId);
      res.writeHead(304);
      res.end();
      return;
    }

    try {
      const data = fs.readFileSync(currentSessionFile, 'utf8');
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
        
        let repoName = 'project';
        if (payload.targetPath !== undefined && typeof payload.targetPath === 'string') {
          const oldPath = sessionState.targetPath;
          if (payload.targetPath !== oldPath) {
            repoName = getSafeRepoName(payload.targetPath);
            const targetSessionFile = path.join(REPORTS_ROOT, repoName, 'session.json');
            if (fs.existsSync(targetSessionFile)) {
              try {
                sessionState = JSON.parse(fs.readFileSync(targetSessionFile, 'utf8'));
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

        // Select the correct output session file
        const newSessionFile = path.join(REPORTS_ROOT, repoName, 'session.json');
        fs.mkdirSync(path.dirname(newSessionFile), { recursive: true });
        currentSessionFile = newSessionFile;

        // Save pointer
        fs.writeFileSync(LAST_SESSION_POINTER, JSON.stringify({ lastSessionPath: currentSessionFile }, null, 2), 'utf8');

        // Write atomic updates to disk
        fs.writeFileSync(currentSessionFile, JSON.stringify(sessionState, null, 2), 'utf8');
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
      if (!fs.existsSync(currentSessionFile)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No active session configuration found to scan.' }));
        return;
      }

      const session = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
      const manifest = generateManifestFromSession(session);
      const repoName = getSafeRepoName(session.targetPath);
      const manifestPath = path.join(REPORTS_ROOT, repoName, 'manifest.json');
      
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
        env: {
          ...process.env,
          MOCK_CLI: process.env.MOCK_CLI === 'true' ? 'true' : 'false',
          MOCK_REPO_NAME: repoName,
          TARGET_PATH: session.targetPath
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
            currentSession.status = code === 0 ? 'completed' : 'failed';
            fs.writeFileSync(currentSessionFile, JSON.stringify(currentSession, null, 2), 'utf8');
            sessionState.status = currentSession.status;
            
            if (code === 0) {
              const isMockMode = process.env.MOCK_CLI === 'true';
              if (isMockMode) {
                generateMockReports(currentSession);
              } else {
                compileRealReports(currentSession);
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
          currentSession.status = 'paused';
          fs.writeFileSync(currentSessionFile, JSON.stringify(currentSession, null, 2), 'utf8');
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

function scanReports(dir, baseDir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
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
        scanReports(fullPath, baseDir, fileList);
      }
    } else {
      if (file === 'backlog.csv' || (file.startsWith('repo-wizard-') && (file.endsWith('.md') || file.endsWith('.html')))) {
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
      const reports = scanReports(REPORTS_ROOT, REPORTS_ROOT);
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

        const inputPath = path.resolve(REPORTS_ROOT, markdownFile);

        // Enforce boundary check to prevent Directory Traversal
        if (!inputPath.startsWith(REPORTS_ROOT + path.sep)) {
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
      if (!fileName || (!fileName.endsWith('.md') && !fileName.endsWith('.html') && !fileName.endsWith('.csv'))) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing file name.' }));
        return;
      }

      const baseName = path.basename(fileName);
      if (baseName !== 'backlog.csv' && !baseName.startsWith('repo-wizard-')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid file name pattern.' }));
        return;
      }

      const filePath = path.resolve(REPORTS_ROOT, fileName);

      // Enforce boundary check to prevent Directory Traversal
      if (!filePath.startsWith(REPORTS_ROOT + path.sep)) {
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

function killProcessTree(proc) {
  if (!proc) return;
  const pid = proc.pid;
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    try {
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          writeLog('error', `Failed to taskkill process tree for pid ${pid}`, '', { error: err.message });
        }
      });
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
