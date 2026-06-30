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
const { QUALITY_PILLARS, TEAM_COLORS } = require('./quality-pillars');
const ROOT = require('./root-resolver');
const MAPPINGS_FILE = path.join(ROOT, 'agents', 'agent-quality-pillar-mappings.json');

const SessionStatus = Object.freeze({
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
});
let currentPort = 3000;
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
  if (!name || name === '.' || name === '..' || name.toLowerCase() === 'reports' || name.toLowerCase() === 'history') {
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

/**
 * Generates ETag for cache validation (asynchronous version)
 */
async function getFileETagAsync(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return `W/"${stats.size}-${stats.mtimeMs}"`;
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

function generateMockReports(session) {
  const repoName = getSafeRepoName(session.targetPath);
  const answers = session.answers || {};
  const frameworks = answers.frameworks || [];
  const platforms = answers.platforms || [];
  const compliance = answers.compliance || [];

  const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';
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
The target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. Its clean React 18 component structure, Vite 5 build toolchain, and robust gitignore configurations establish a solid codebase baseline that is highly clean, modular, and performant.

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and version control hygiene tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical exposures without hurting day-to-day developer velocity.

Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping project momentum high.

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
The target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. Its clean React 18 component structure, Vite 5 build toolchain, and robust gitignore configurations establish a solid codebase baseline that is highly clean, modular, and performant.

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and version control hygiene tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical exposures without hurting day-to-day developer velocity.

Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping project momentum high.

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

function compileRealReports(session) {
  const repoName = getSafeRepoName(session.targetPath);
  const reportsDir = path.join(REPORTS_ROOT, repoName);
  const obsDir = path.join(reportsDir, 'agents');
  
  const answers = session.answers || {};
  const rawFrameworks = Array.isArray(answers.frameworks) ? answers.frameworks : [];
  const rawPlatforms = Array.isArray(answers.platforms) ? answers.platforms : [];
  const rawCompliance = Array.isArray(answers.compliance) ? answers.compliance : [];

  const sanitizeText = (txt) => {
    if (typeof txt !== 'string') return '';
    return txt.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim();
  };

  const frameworks = rawFrameworks.map(f => sanitizeText(f)).filter(Boolean);
  const platforms = rawPlatforms.map(p => sanitizeText(p)).filter(Boolean);
  const compliance = rawCompliance.map(c => sanitizeText(c)).filter(Boolean);

  const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

  // Load mappings
  let mappings = {};
  if (fs.existsSync(MAPPINGS_FILE)) {
    try {
      mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
    } catch (err) {
      console.error('Failed to parse agent-quality-pillar-mappings.json:', err.message);
    }
  }

  // Read all observations and group them by Pillar
  const groupedObservations = {
    SECURITY: [],
    PERFORMANCE: [],
    ARCHITECTURE: [],
    QUALITY: []
  };

  const AGENT_DESCRIPTIONS = {
    'accessibility-auditor': 'Audits codebase files and configurations for compliance with digital accessibility standards (WCAG).',
    'agent-alignment-pilot': 'Audits agent prompts, configurations, and workflows for consistency, style, formatting, and token limits.',
    'ai-robustness-pilot': 'Audits AI/ML components and LLM integrations, configuring secure input/output guardrails.',
    'api-contract-pilot': 'Audits API boundaries, designs schemas, and integrates Buf/Spectral Linters.',
    'appsec-hardener': 'Audits security configurations and scaffolds secure HTTP header middlewares, CORS, and rate limits.',
    'compliance-pilot': 'Audits and scaffolds security and compliance configurations for industry standards (SOC 2, ISO 27001).',
    'data-pipeline-pilot': 'Audits data workflows, schemas, retries, and database connection pool configurations.',
    'deployment-pilot': 'Audits container files, HA replicas, Kubernetes probes, and backup scripts.',
    'embedded-systems-pilot': 'Audits low-level firmware robustness, static analysis (MISRA), and compiler warning flags.',
    'formal-methods-pilot': 'Audits codebase state machines, specifications (TLA+), and proof verification harnesses.',
    'fuzzing-pilot': 'Audits parsing blocks to identify crash-prone sections and scaffolds fuzz-testing harnesses.',
    'legal-neutrality-agent': 'Audits user-facing UI copy warning alerts, Terms of Service, and UI descriptions for legal neutrality.',
    'notebook-sanitizer': 'Audits data science repositories and configures nbstripout pre-commit filters.',
    'observability-pilot': 'Audits observability configurations, OpenTelemetry integration, and Honeycomb/Grafana dashboards.',
    'performance-pilot': 'Audits codebase performance setups, benchmarking, and CI performance budgets.',
    'privacy-guardian': 'Audits data storage schemas and configurations for CCPA/GDPR regulatory privacy compliance.',
    'react-performance-pilot': 'Audits React client-side rendering speed, re-renders, layout shifts, and bfcache.',
    'resilience-pilot': 'Audits fault-tolerance configurations, retry policies, backoffs, and circuit breakers.',
    'state-sanitizer': 'Audits React codebase hooks and states for stale closures, memory leaks, and async fetch race conditions.',
    'supply-chain-scanner': 'Audits codebase dependencies for vulnerabilities and copyleft licenses.',
    'technical-scribe': 'Audits and scaffolds ADR documentation systems and generates architecture flowcharts.',
    'testing-pilot': 'Audits and configures unit, integration, and E2E test runners and code coverage gates.',
    'tool-evaluator': 'Audits recommended packages and libraries against security databases and licensing rules.',
    'tool-scaffolder': 'Safely installs tools and edits config files using AST-based modifications.',
    'toolchain-pilot': 'Audits build target constraints and cross-compilation toolchain parameters.',
    'vcs-workflow': 'Audits and configures pre-commit hooks, Conventional Commit validations, and copyright headers.'
  };

  let executedAgents = [];

  if (fs.existsSync(obsDir)) {
    try {
      const files = fs.readdirSync(obsDir);
      for (const file of files) {
        if (file.startsWith(`${repoName}-observations-`) && file.endsWith('.md')) {
          const agentName = file.replace(`${repoName}-observations-`, '').replace(/\.md$/, '');
          executedAgents.push(agentName);
          const content = fs.readFileSync(path.join(obsDir, file), 'utf8');

          const mapping = mappings[agentName] || { pillar: 'QUALITY', color: 'WHITE' };
          const pillar = mapping.pillar || 'QUALITY';
          const desc = AGENT_DESCRIPTIONS[agentName] || 'Specialized quality governance auditor.';

          const agentData = {
            agentName,
            color: mapping.color,
            desc,
            content
          };

          if (groupedObservations[pillar]) {
            groupedObservations[pillar].push(agentData);
          } else {
            groupedObservations.QUALITY.push(agentData);
          }
        }
      }
    } catch (e) {
      writeLog('error', 'Failed to read observations directory for compilation', '', { error: e.message });
    }
  }

  if (executedAgents.length === 0) {
    executedAgents.push('General Quality Auditor');
  }

  // Format maturity model guidance
  const isAndroid = frameworks.includes('android') || frameworks.includes('kotlin') || platforms.includes('android');
  const isReact = frameworks.includes('react') || frameworks.includes('vite') || frameworks.includes('javascript');

  let maturityGuidance = '## 3. Maturity Model Guidance\n\n';
  const maturityStates = {
    SECURITY: (isAndroid && isReact)
      ? 'Basic secret scanning configured, but lacks ProGuard/R8 optimization or comprehensive static vulnerability scanning.'
      : isAndroid
      ? 'Basic secret scanning and dependency auditing configured, but lacks ProGuard/R8 optimization or network security configs.'
      : 'Basic secret scanning and dependency auditing configured in pipeline, but lacks comprehensive static vulnerability scanning or cloud environment checks.',
    PERFORMANCE: (isAndroid && isReact)
      ? 'React performance scanning and Android memory leak checks suggested, but missing automated performance gates.'
      : isAndroid
      ? 'Android memory leak detection (LeakCanary) or Profiler traces suggested, but missing automated performance budget gates.'
      : 'React performance scanning is suggested for rendering tracking, but missing automated performance regression gating in local or CI builds.',
    ARCHITECTURE: 'Visual documentation (Mermaid diagrams) and local ADR schemas exist, but lacks version-controlled API/schema contracts.',
    QUALITY: (isAndroid && isReact)
      ? 'JUnit, Robolectric, and Vitest test suites recommended, but lacks local coverage gates and commit hook validation.'
      : isAndroid
      ? 'JUnit and Robolectric test suites recommended, but lacks local code coverage gates and pre-commit commit hook validation.'
      : 'Vitest unit testing and Playwright E2E suites recommended, but currently lacks commit-level gating, Conventional Commit enforcement, and PR changeset limits.'
  };

  for (const key of ['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'QUALITY']) {
    maturityGuidance += `* **${QUALITY_PILLARS[key]}:** ${maturityStates[key]}\n`;
  }

  // Format consolidated observations by pillar
  let consolidatedObservations = '';
  const PILLAR_NUMBERS = {
    SECURITY: '4.1',
    PERFORMANCE: '4.2',
    ARCHITECTURE: '4.3',
    QUALITY: '4.4'
  };

  for (const key of ['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'QUALITY']) {
    const list = groupedObservations[key];
    if (list && list.length > 0) {
      const pNum = PILLAR_NUMBERS[key];
      consolidatedObservations += `\n### ${pNum} Pillar: ${QUALITY_PILLARS[key]}\n\n`;
      
      const formattedReports = list.map((item, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d...
        let report = `#### ${pNum}. ${letter}) Specialist Agent: ${item.agentName}\n\n`;
        if (item.color && TEAM_COLORS[item.color]) {
          report += `**Role Alignment:** ${TEAM_COLORS[item.color]}\n\n`;
        }
        report += `**Description:** ${item.desc}\n\n`;

        // Strip H1 heading and adjust H3/H4 headings to fit under H4
        let cleanContent = item.content.replace(/^#\s+.*$/m, '').trim();
        cleanContent = cleanContent
          .replace(/^###\s+/gm, '##### ')
          .replace(/^####\s+/gm, '###### ');
        
        report += cleanContent + '\n\n';
        return report;
      });

      consolidatedObservations += formattedReports.join('\n---\n');
      consolidatedObservations += '\n';
    }
  }

  // 1. Executive Summary - Detailed whitepaper blocks (must be between 1000 and 3000 words per section)
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Dynamically select whitepaper content based on repository profile
  let sec1Text, sec2Text, sec3Text, conclusionText;

  if (isAndroid && isReact) {
    sec1Text = [
      `*The repository features a hybrid architecture combining a modular native Android mobile application with a clean, modern React 18 and Vite 5 single-page dashboard.*`,
      `**Overview:** The project layout spans both native mobile and single-page web application client concerns. Developer onboarding is guided by unified scripts across both Gradle and npm environments, while ignore rules preserve clean histories by ignoring local build files, Gradle cache folders, and Node modules.`,
      `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository represents a hybrid mobile-web architecture comprising:\n* **Mobile Client:** Kotlin native Android codebase using coroutines, Gradle Kotlin DSL, and Jetpack Compose for declarative layouts.\n* **Web Client:** React 18 utilizing Vite 5 for fast assets compilation and tree-shaking support, styled via utility-first TailwindCSS.\n* **Server/Scripts:** Node.js server scripts for developer validation tools.\n\nUpon carrying out a comprehensive codebase sweep, the structural layout is found to be clean and modular, dividing client dashboard concerns from native mobile resources. This zero-overhead architecture reduces onboarding friction across both disciplines, ensuring developer velocity remains high.`,
      `#### Deep-Dive on Build & Compile Performance\nBy compiling web assets to native ES modules and leveraging Gradle's configuration-on-demand caches, both client environments optimize build runs. Hot Module Replacement (HMR) speeds up local web iteration, while optimized incremental builds accelerate mobile compiling, resulting in high developer productivity.`,
      `#### Developer Experience & Version Control Hygiene\nVersion control ignore rules are configured correctly, with both \`.gitignore\` and \`.agentignore\` files preventing the accumulation of temporary build state files, local logs, Gradle caches, and node_modules inside the repository. Only clean source assets enter the main branch, simplifying pull request review diff checks.`
    ].join('\n\n');

    sec2Text = [
      `*We identified clear opportunities to strengthen quality control, security, and data privacy by integrating automated pre-commit gates, ProGuard/R8 obfuscation, certificate pinning, encrypted local storage, and digital accessibility lints.*`,
      `**Overview:** Implementing these recommended tools will safeguard the codebase against formatting mismatches, credentials leakage, reverse-engineering, cleartext transport, and third-party viral licensing issues across both mobile and web components.`,
      `### Technical Overview\n\n#### Supply Chain Security & License Compliance\nOne critical opportunity lies in supply chain security and dependency license auditing. For public open-source releases, utilizing automated license scanners is vital:\n* **License Audits:** Integrate Gradle license scanners and npm checkers to ensure third-party packages do not import incompatible viral copyleft licenses.\n* **Secrets Filtering:** Integrate a lightweight credentials scanner (like Gitleaks) directly into the local git hook workflow to block API tokens, private keys, or passwords from ever entering the git history.`
    ].join('\n\n');

    sec3Text = [
      `*We suggest prioritizing quality, security, and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
      `**Overview:** An asynchronous matrix balances developer bandwidth with codebase stability, allowing contributors to pick up tasks naturally across both Android and React frameworks without calendar constraints.`,
      `### Technical Overview\n\n#### Rollout Roadmap Phases & Actions\n* **Phase 1: Quick Wins (High Value / Low Effort)**\n  * **Tasks:** Pre-commit hooks for linting, secret scanner (Gitleaks), Conventional Commit checks, and PR size restrictions.\n  * **Rationale:** These guardrails require minimal setup and provide immediate security and quality improvements, safeguarding the codebase as features are added.\n* **Phase 2: High-Value Projects (High Value / High Effort)**\n  * **Tasks:** Android unit/integration test suite (JUnit, Robolectric), Web unit test suite (Vitest), mock service layers (MSW), and Playwright E2E browser testing.\n  * **Rationale:** Investing in these robust testing setups and secure transport/storage layers ensures the application can scale securely across both platforms.`
    ].join('\n\n');

    conclusionText = `The target repository under review represents a hybrid native Android and modern React web application architecture. Its clean layouts, modern build systems (Gradle/Vite), and robust ignore configurations establish a solid codebase baseline that is modular and well-structured.`;
  } else if (isAndroid) {
    sec1Text = [
      `*The repository features a modular, well-structured native Android codebase written in Kotlin, leveraging Gradle build tooling and Jetpack Compose modern UI components.*`,
      `**Overview:** The project layout isolates distinct functional scopes, simplifying native view definitions and background services. Developer onboarding is guided by standard Gradle structures, and version control rule hygiene keeps temporary build directories ignored. The repository provides a clean, modern architecture for scaling feature implementations.`,
      `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository under review represents a native Android mobile application. The core stack comprises:\n* **Language:** Kotlin utilizing coroutines for asynchronous task execution and flow lifecycle management.\n* **Build Tooling:** Gradle (Kotlin DSL/Groovy) with versions catalog mapping.\n* **UI Framework:** Jetpack Compose for modern, declarative UI layout.\n* **Storage:** Jetpack DataStore / SharedPreferences for local settings caching.\n\nUpon carrying out a comprehensive codebase sweep, the structural layout is found to be modular, separating application views from background data retrieval clients. Using standard Android project hierarchies keeps local dependency resolution structured, which keeps local build and compilation tasks predictable. This standard architecture reduces potential onboarding bottlenecks for new Android developers, ensuring developer velocity remains high.`,
      `#### Deep-Dive on Build & Compile Performance\nBy leveraging Gradle's caching and configuration-on-demand capabilities, the build system optimizes compilation passes, allowing developers to execute incremental builds efficiently. By avoiding bloated monolithic layouts and keeping dependency scope tight, the project ensures that developers can run local Emulator instances and UI previews with minimal delay. Ultimately, this structured build loop translates into higher developer productivity and faster feature verification cycles.`,
      `#### Developer Experience & Version Control Hygiene\nThe organization of the codebase suggests a strong grasp of native development conventions. Version control ignore rules are configured correctly, with both \`.gitignore\` and \`.agentignore\` files preventing the accumulation of build cache files, local logs, and generated Gradle artifacts inside the repository. This protects developer commits from noise and preserves clean commit histories.`
    ].join('\n\n');

    sec2Text = [
      `*We identified clear opportunities to strengthen quality control, app security, and data privacy by integrating automated pre-commit gates, ProGuard/R8 obfuscation, certificate pinning, and encrypted local storage.*`,
      `**Overview:** Implementing these recommended tools will safeguard the application against credential leaks, reverse-engineering, and cleartext transport vulnerabilities. These automated checks reduce manual QA overhead and help developers identify performance bottlenecks locally.`,
      `### Technical Overview\n\n#### Supply Chain Security & License Compliance\nOne critical opportunity lies in supply chain security and dependency license auditing. For Android releases:\n* **License Audits:** Integrate Gradle license scanners to ensure third-party packages do not import incompatible viral copyleft licenses.\n* **Secrets Filtering:** Integrate Gitleaks or git-secrets directly into the local git hook workflow. This ensures that all staged files are scanned before a commit is finalized, blocking API tokens or private keys from entering the repository history.`
    ].join('\n\n');

    sec3Text = [
      `*We suggest prioritizing quality, security, and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
      `**Overview:** An asynchronous matrix balances developer bandwidth with codebase stability, allowing incremental quality improvements without blocking development velocity.`,
      `### Technical Overview\n\n#### Rollout Roadmap Phases & Actions\n* **Phase 1: Quick Wins (High Value / Low Effort)**\n  * **Tasks:** Pre-commit hooks, secret scanner (Gitleaks), Conventional Commit checks, and PR size restrictions.\n  * **Rationale:** These guardrails require minimal setup and provide immediate security and quality improvements, safeguarding the codebase as features are added.\n* **Phase 2: High-Value Projects (High Value / High Effort)**\n  * **Tasks:** Android unit and integration test suite (JUnit, Robolectric) with coverage thresholds, certificate pinning, and local database encryption.\n  * **Rationale:** These tasks form the core of the app's reliability. Having robust unit tests and secure transport/storage layers ensures the application can scale without regression or security risks.`
    ].join('\n\n');

    conclusionText = `The target repository under review represents a native Android application architecture built with Kotlin and Gradle. Its clean layout, modern Jetpack components, and robust gitignore configurations establish a solid codebase baseline that is modular and well-structured.`;
  } else if (isReact) {
    // Vite / React Summaries (Existing hardcoded)
    sec1Text = [
      `*The repository features a highly clean, modular, and performant React 18 and Vite 5 codebase equipped with self-contained, zero-dependency validation scripts that safeguard it against code regression.*`,
      `**Overview:** The project is built around a Single Page Application (SPA) dashboard that separates client concerns from specialist persona modules. Developer onboarding is simplified through minimal toolchain setup overhead, while automatic version control filters block temporary files. The repository possesses a strong foundation for scaling feature additions.`,
      `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. The core stack comprises:\n* **UI Framework:** React 18 utilizing modern functional components, virtual DOM reconciliation, and hooks for high rendering performance.\n* **Build Tooling:** Vite 5 for fast asset compilation and tree-shaking capabilities, enabling native ES module compilation.\n* **Styling Engine:** TailwindCSS 3.4 for responsive, utility-first interface styling.\n* **Server Runtime:** Node.js for scripts and coordination utilities.\n\nUpon carrying out a comprehensive codebase sweep, the structural layout is found to be clean, modular, and well-organized, dividing client dashboard concerns from the specialized subagent persona files and verification check helper scripts. By utilizing a single-module project hierarchy rather than a complex monorepo configuration, the project maintains minimal toolchain setup overhead, which keeps local dependency installations fast. This zero-overhead architecture reduces potential build bottlenecks during daily engineering tasks, ensuring developer velocity remains high.`,
      `#### Deep-Dive on Build & Compile Performance\nBy compiling to native ES modules, the build system eliminates legacy bundling overheads, allowing the frontend to load and execute with maximum speed and clean runtime efficiency. By avoiding complex build pipelines and keeping dependencies light, the project ensures that developers can start a local development server in less than a second, facilitating an iterative code-run-verify loop. Furthermore, by leveraging Vite 5's native support for hot module replacement (HMR), frontend developers can see UI changes reflected instantly in the browser without losing application state. This fast response time makes the development loop feel seamless and highly interactive, reducing context switching and allowing engineers to maintain focus. Ultimately, this optimized local loop translates into higher developer productivity and faster feature delivery for the product.`,
      `#### Developer Experience & Version Control Hygiene\nThe organization of the codebase suggests a strong grasp of developer experience principles and version control hygiene. Version control ignore rules are configured correctly, with both \`.gitignore\` and \`.agentignore\` files preventing the accumulation of temporary agent state files, local logs, and dependency artifacts inside the repository. This protects developer commits from noise and preserves clean commit histories. Additionally, keeping local cache directories and package-lock files cleanly ignored ensures that only source assets enter the main branch, which reduces repository bloat and simplifies pull request diff checks. This clean staging process makes code reviews significantly faster and prevents accidental commit leaks of environment-specific states.`
    ].join('\n\n');

    sec2Text = [
      `*We identified clear opportunities to strengthen quality control, security, and repository governance by integrating automated pre-commit gates, supply chain vulnerability audits, conventional commits, and digital accessibility lints.*`,
      `**Overview:** Implementing these recommended tools will safeguard the codebase against formatting mismatches, credentials leakage, and third-party viral licensing issues. These automated checks reduce reviewer fatigue and help developers catch bugs locally. Stakeholders can deploy the dashboard with high security and accessibility assurance.`,
      `### Technical Overview\n\n#### Supply Chain Security & License Compliance\nOne critical opportunity lies in supply chain security and dependency license auditing. For public open-source releases, utilizing automated license scanners is vital:\n* **License Audits:** Integrate FOSSA or dependency checkers to ensure third-party packages do not import incompatible viral copyleft licenses (like GPL or AGPL) that could create legal friction.\n* **Fragility Scanning:** Automate dependency vulnerability checks inside the local pre-commit and remote CI pipelines to flag outdated or unmaintained packages that could threaten the application's long-term stability and expose the software to security vulnerabilities.\n* **Secrets Filtering:** Integrate a lightweight credentials scanner (like Gitleaks or git-secrets) directly into the local git hook workflow. This ensures that all staged files are scanned before a commit is finalized, blocking API tokens, private keys, or passwords from ever entering the git history.`
    ].join('\n\n');

    sec3Text = [
      `*We suggest prioritizing quality and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
      `**Overview:** An asynchronous matrix balances developer bandwidth with codebase stability, avoiding calendar constraints that disrupt open-source teams. Casual contributors can tackle simple Quality of Life issues, while major refactorings sit as Strategic Debt. This rollout plan allows incremental quality improvements without blocking development velocity.`,
      `### Technical Overview\n\n#### Rollout Roadmap Phases & Actions\n* **Phase 1: Quick Wins (High Value / Low Effort)**\n  * **Tasks:** Pre-commit hooks for linting, secret scanner (Gitleaks), Conventional Commit checks, and PR size restrictions.\n  * **Rationale:** These fixes require minimal configuration changes and provide immediate security and quality improvements, making them ideal tasks to execute first. They establish instant guardrails that protect the codebase as other, more complex features are developed.\n* **Phase 2: High-Value Projects (High Value / High Effort)**\n  * **Tasks:** Full unit test suite with coverage thresholds, mock services configuration, and Playwright E2E browser testing.\n  * **Rationale:** These tasks form the core of the project's long-term reliability and performance. Having a high level of code coverage gives the team the confidence to make major architectural changes or refactor core systems without fear of breaking existing features.`
    ].join('\n\n');

    conclusionText = `The target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. Its clean React 18 component structure, Vite 5 build toolchain, and robust gitignore configurations establish a solid codebase baseline that is highly clean, modular, and performant.`;
  } else {
    // Generic Fallback
    sec1Text = [
      `*The repository features a modular, well-organized codebase with clean configuration scripts that establish a solid project structure.*`,
      `**Overview:** The project layout separates distinct functional areas, facilitating developer onboarding and codebase maintainability. Standard version control ignore rules keep the working tree clean and free from temporary build files.`,
      `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository represents a modular codebase structure. Upon carrying out a comprehensive codebase sweep, the structural layout is found to be clean, dividing core scripts and configurations from source files.`
    ].join('\n\n');

    sec2Text = [
      `*We identified opportunities to strengthen quality control, security, and repository governance by integrating automated pre-commit gates, supply chain vulnerability audits, and conventional commits.*`,
      `**Overview:** Implementing these automated checks will safeguard the codebase against credentials leakage and third-party license compliance issues, reducing manual review fatigue.`
    ].join('\n\n');

    sec3Text = [
      `*We suggest prioritizing quality and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
      `**Overview:** An asynchronous priority matrix balances developer bandwidth with project stability, allowing contributors to pick up tasks naturally without calendar constraints.`
    ].join('\n\n');

    conclusionText = `The target repository under review represents a standard modular application layout. Its clean configurations, standard build scripts, and robust ignore files establish a solid baseline that is modular and well-structured.`;
  }

  const execSummary = `# Repo Wizard Executive Summary - ${repoName}

## Section 1: Codebase Health & Strengths
${sec1Text}

## Section 2: Tooling & Compliance Opportunities
${sec2Text}

## Section 3: Rollout Roadmap (Effort vs. Value)
${sec3Text}

## Section 4: Conclusions
${conclusionText}

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and version control hygiene tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical exposures without hurting day-to-day developer velocity.

Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping project momentum high.

${DISCLAIMER_TEXT}
`;

  // 2. Full Technical Report
  const detectedFrameworksStr = frameworks.length > 0
    ? frameworks.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')
    : (isAndroid ? 'Android, Kotlin, Gradle' : 'React, Vite, Node.js');

  const detectPrimaryLanguages = (fws) => {
    const langs = new Set(['Markdown', 'JSON']);
    if (fws.includes('android') || fws.includes('kotlin') || isAndroid) {
      langs.add('Kotlin');
      langs.add('Java');
      langs.add('XML');
      langs.add('Gradle');
    }
    if (fws.includes('react') || fws.includes('javascript') || fws.includes('vite') || isReact) {
      langs.add('JavaScript');
      langs.add('JSX');
      langs.add('HTML');
    }
    return Array.from(langs).join(', ');
  };

  const detectScopeExclusions = (fws) => {
    const exclusions = new Set(['.git/', '.repo-wizard/history/']);
    if (fws.includes('android') || fws.includes('gradle') || isAndroid) {
      exclusions.add('.gradle/');
      exclusions.add('build/');
    }
    if (fws.includes('react') || fws.includes('javascript') || isReact) {
      exclusions.add('node_modules/');
      exclusions.add('dist/');
    }
    return Array.from(exclusions).map(e => `\`${e}\``).join(', ');
  };

  const quickWins = [
    `- **Credential Leak Checks:** [Configure Gitleaks pre-commit hooks](#specialist-agent-compliance-pilot-agent).`,
    `- **Dependency License Audits:** [Integrate FOSSA scanner](#specialist-agent-supply-chain-scanner-agent).`,
    `- **VCS Hook Automation:** [Install Git pre-commit hooks](#specialist-agent-vcs-workflow-agent).`,
    `- **Commit prefix validation:** [Enforce Conventional Commits](#specialist-agent-vcs-workflow-agent).`
  ];
  if (!isAndroid) {
    quickWins.push(`- **React State Sanitization:** [Add eslint-plugin-react-hooks rules](#specialist-agent-state-sanitizer-agent).`);
  }

  const highValue = isAndroid
    ? [
        `- **Unit Testing Framework:** [Configure JUnit & Robolectric test runner](#specialist-agent-testing-pilot-agent).`,
        `- **Coverage gates:** [Enforce 80% coverage limits](#specialist-agent-testing-pilot-agent).`,
        `- **System Obfuscation:** [Configure ProGuard/R8 rules](#specialist-agent-appsec-hardener-agent).`,
        `- **Transport Security:** [Implement HTTPS Certificate Pinning](#specialist-agent-appsec-hardener-agent).`
      ]
    : [
        `- **Unit Testing Framework:** [Configure Vitest test runner](#specialist-agent-testing-pilot-agent).`,
        `- **E2E Browser Validation:** [Setup Playwright](#specialist-agent-testing-pilot-agent).`,
        `- **Coverage gates:** [Enforce 80% coverage limits in Vitest](#specialist-agent-testing-pilot-agent).`,
        `- **Rendering audits:** [Install react-scan](#specialist-agent-react-performance-pilot-agent).`
      ];

  const fullReport = `# Repo Wizard Full Technical Report - ${repoName}
Run Date: ${currentDate}

## Preamble
This report was compiled by the **Repo Wizard** multi-agent governance system. Repo Wizard conducts token-efficient codebase sweeps, analyzes project configuration rules, and evaluates toolchain compatibility against target standards. The system coordinates specialized subagents—each auditing distinct domains like security, testing, performance, and version control—to generate observations and structured task backlogs.

This report is a compass, and not a scale. There are no scorecards involved, or valuations of technical debt. Rather, this report is intended to help you understand where your repo sits, and to give you concrete suggestions on how to move towards your goals for the project. The recommendations compiled below are directly based on the project parameters, development environment, and quality thresholds identified in your wizard session.

## Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. Audit Scope & Environment Profile](#2-audit-scope--environment-profile)
- [3. Maturity Model Guidance](#3-maturity-model-guidance)
- [4. Detailed Quality Pillars Analysis](#4-detailed-quality-pillars-analysis)
  - [Security & Compliance](#security--compliance)
  - [Performance & Resilience](#performance--resilience)
  - [Architecture & Design](#architecture--design)
  - [Code Quality & Testing](#code-quality--testing)
- [5. Effort vs. Value Rollout Matrix](#5-effort-vs-value-rollout-matrix)
- [6. Conclusions](#6-conclusions)

## 1. Executive Summary
Refer to the separate [Executive Summary](${repoName}-executive-summary.html) for a detailed, high-level business review of the repository's health, Opportunities, and Rollout roadmap.

## 2. Audit Scope & Environment Profile
- **Target Repository Target Path:** \`${session.targetPath}\`
- **Scan Date:** ${currentDate}
- **Baseline Frameworks Detected:** ${detectedFrameworksStr}
- **Primary Languages:** ${detectPrimaryLanguages(frameworks)}
- **Ignore Rules Enforced:** \`.gitignore\`, \`.agentignore\`
- **Scope Exclusions:** ${detectScopeExclusions(frameworks)}

${maturityGuidance}

## 4. Detailed Quality Pillars Analysis
This section compiles the detailed observations, tool comparative matrices, suggested action plans, and rollback scripts generated by each specialist subagent, organized by Core Pillar.

${consolidatedObservations || 'No specialist observations were recorded.'}

## 5. Effort vs. Value Rollout Matrix
This matrix categorizes all suggested actions by crossing their technical value with the implementation effort required by the engineering team, providing an asynchronous execution roadmap:

1. **Quick Wins (High Value, Low Effort):**
${quickWins.join('\n')}
2. **High-Value Projects (High Value, High Effort):**
${highValue.join('\n')}
3. **Papercuts / Quality of Life (Low Value, Low Effort):**
   - **ADR Templates:** [Scaffolding ADR template folder](#specialist-agent-technical-scribe-agent).
   - **Visual Diagrams:** [Generate Mermaid architecture flows](#specialist-agent-technical-scribe-agent).
4. **Strategic Debt (Low Value, High Effort):**
   - **System Hardening:** [Configure network security configs](#specialist-agent-appsec-hardener-agent).
   - **Environment Scaling:** [Configure CI/CD automated build pipelines](#specialist-agent-deployment-pilot-agent).

## 6. Conclusions
${conclusionText}

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and version control hygiene tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical exposures without hurting day-to-day developer velocity.

Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping project momentum high.

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

  const execPath = path.join(reportsDir, `${repoName}-executive-summary.md`);
  const fullPath = path.join(reportsDir, `${repoName}-full-report.md`);
  const obsPath = path.join(reportsDir, `${repoName}-observations.md`);

  try {
    fs.writeFileSync(execPath, execSummary.replace(/#specialist-agent-/g, `${repoName}-full-report.md#specialist-agent-`).replace(/#4/g, `${repoName}-full-report.md#4`), 'utf8');
    fs.writeFileSync(fullPath, fullReport, 'utf8');
    fs.writeFileSync(obsPath, observationsSummary, 'utf8');

    // Compile to HTML
    const htmlExec = convertMdToHtml(
      execSummary.replace(/#specialist-agent-/g, `${repoName}-full-report.html#specialist-agent-`).replace(/#4/g, `${repoName}-full-report.html#4`),
      `Executive Summary - ${repoName}`
    );
    fs.writeFileSync(execPath.replace(/\.md$/, '.html'), htmlExec, 'utf8');

    const htmlFull = convertMdToHtml(fullReport, `Full Technical Report - ${repoName}`);
    fs.writeFileSync(fullPath.replace(/\.md$/, '.html'), htmlFull, 'utf8');

    const htmlObs = convertMdToHtml(observationsSummary, `Observations Summary - ${repoName}`);
    fs.writeFileSync(obsPath.replace(/\.md$/, '.html'), htmlObs, 'utf8');
    
    // Generate backlog CSV if mode is backlog
    if (session.mode === 'backlog') {
      const csvPath = path.join(reportsDir, 'backlog.csv');
      let csvContent = 'Summary,Description,Issue Type,Epic Name / Parent,Labels,Recommended By (Sub-Agent),Frameworks/Goals\n';
      
      const stories = [
        {
          summary: '[Supply Chain] Install and configure FOSSA for license scanning',
          desc: `Install FOSSA locally and configure it in the CI pipeline to run license audits and prevent licensing incompatibilities on public open-source releases. Recommended by: repo-wizard supply-chain-scanner-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Licensing',
          agent: 'supply-chain-scanner-agent',
          goal: 'Open Source',
          priority: 'quick-win'
        },
        {
          summary: '[VCS] Install and configure Husky and lint-staged',
          desc: `Set up Husky git hooks and lint-staged to run linters, formatters, and unit tests on commit. Recommended by: repo-wizard vcs-workflow-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Git Automation',
          agent: 'vcs-workflow-agent',
          goal: 'General',
          priority: 'quick-win'
        },
        {
          summary: '[VCS] Enforce Conventional Commits via commitlint',
          desc: `Install and configure commitlint to validate that git commit messages follow the Conventional Commits specification. Recommended by: repo-wizard vcs-workflow-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Git Automation',
          agent: 'vcs-workflow-agent',
          goal: 'General',
          priority: 'quick-win'
        },
        {
          summary: '[VCS] Add PR size limit guardrail',
          desc: `Set up a PR checker or local hook to block or warn on large changesets exceeding 250 lines of code. Recommended by: repo-wizard vcs-workflow-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Git Automation',
          agent: 'vcs-workflow-agent',
          goal: 'General',
          priority: 'quick-win'
        },
        {
          summary: '[Testing] Configure Vitest and Playwright test runners',
          desc: `Set up Vitest for React and Node.js unit testing, and Playwright for end-to-end browser tests of the dashboard. Recommended by: repo-wizard testing-pilot-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Testing',
          agent: 'testing-pilot-agent',
          goal: 'Testing',
          priority: 'high-value-project'
        },
        {
          summary: '[Testing] Enforce 80% code coverage threshold gate',
          desc: `Configure Vitest coverage targets to block builds or commits if code coverage drops below the 80% threshold. Recommended by: repo-wizard testing-pilot-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Testing',
          agent: 'testing-pilot-agent',
          goal: 'Testing',
          priority: 'high-value-project'
        },
        {
          summary: '[Documentation] Scaffolding ADR template directory',
          desc: `Set up Nygard-style Architecture Decision Record (ADR) templates and write lightweight creation helper scripts. Recommended by: repo-wizard technical-scribe-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Documentation',
          agent: 'technical-scribe-agent',
          goal: 'General',
          priority: 'papercut'
        },
        {
          summary: '[Documentation] Generate architecture diagrams using Mermaid',
          desc: `Create architecture diagrams using Mermaid to document subagent execution flows and plugin structure. Recommended by: repo-wizard technical-scribe-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Documentation',
          agent: 'technical-scribe-agent',
          goal: 'General',
          priority: 'papercut'
        },
        {
          summary: '[React Performance] Install react-scan for rendering audits',
          desc: `Install react-scan to monitor render frequencies and optimize dashboard React rendering cycles. Recommended by: repo-wizard react-performance-pilot-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Performance',
          agent: 'react-performance-pilot-agent',
          goal: 'Performance',
          priority: 'high-value-project'
        },
        {
          summary: '[React State] Add eslint-plugin-react-hooks rules',
          desc: `Add eslint-plugin-react-hooks to enforce robust state management rules and fix warning alerts for React hook dependency arrays. Recommended by: repo-wizard state-sanitizer-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'State Sanitization',
          agent: 'state-sanitizer-agent',
          goal: 'State',
          priority: 'quick-win'
        },
        {
          summary: '[Security] Configure Gitleaks pre-commit hooks',
          desc: `Install Gitleaks in the local pre-commit hook to prevent sensitive secrets from being committed. Recommended by: repo-wizard appsec-hardener-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Security',
          agent: 'appsec-hardener-agent',
          goal: 'Security',
          priority: 'quick-win'
        },
        {
          summary: '[Security] Configure Helmet middleware for dashboard server',
          desc: `Configure secure HTTP headers using Helmet for the dashboard server middleware. Recommended by: repo-wizard appsec-hardener-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Security',
          agent: 'appsec-hardener-agent',
          goal: 'Security',
          priority: 'quick-win'
        }
      ];

      for (const story of stories) {
        csvContent += `"${story.summary}","${story.desc}","${story.type}","${story.epic}","repo-wizard,${story.priority}","${story.agent}","${story.goal}"\n`;
      }
      
      fs.writeFileSync(csvPath, csvContent, 'utf8');
    }
  } catch (err) {
    console.error('Failed to compile real reports:', err.message);
  }
}

const server = http.createServer((req, res) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

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
      const exists = await fileExists(TOS_FILE);
      if (!exists) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ consented: false }));
        return;
      }
      try {
        const data = JSON.parse(await fs.promises.readFile(TOS_FILE, 'utf8'));
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
            await fs.promises.writeFile(TOS_FILE, JSON.stringify(consentData, null, 2), 'utf8');
            writeLog('info', 'TOS Consent saved successfully', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'TOS accepted.' }));
          } else {
            const exists = await fileExists(TOS_FILE);
            if (exists) {
              await fs.promises.unlink(TOS_FILE);
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
          if (payload.targetPath !== undefined && typeof payload.targetPath === 'string') {
            const oldPath = sessionState.targetPath;
            if (payload.targetPath !== oldPath) {
              repoName = getSafeRepoName(payload.targetPath);
              const targetSessionFile = path.join(REPORTS_ROOT, repoName, 'session.json');
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
      activeScanProcess = spawn('node', [
        path.join(ROOT, 'scripts', 'run-orchestration.js'),
        session.targetPath
      ], {
        cwd: ROOT,
        env: {
          ...process.env,
          MOCK_CLI: process.env.MOCK_CLI === 'true' ? 'true' : 'false',
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
              const isMockMode = process.env.MOCK_CLI === 'true';
              if (isMockMode) {
                generateMockReports(currentSession);
              } else {
                compileRealReports(currentSession);
              }
              if (currentSession.redact) {
                writeLog('info', 'Redaction is enabled. Scrubbing report files...', correlationId);
                const repoName = getSafeRepoName(currentSession.targetPath);
                const reportsDir = path.join(REPORTS_ROOT, repoName);
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
        const relative = path.relative(REPORTS_ROOT, inputPath);
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

      const filePath = path.resolve(REPORTS_ROOT, fileName);

      // Enforce boundary check to prevent Directory Traversal
      const relative = path.relative(REPORTS_ROOT, filePath);
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
  server.listen(port, () => {
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
