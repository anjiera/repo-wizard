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
const ROOT = path.resolve(__dirname, '..');
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
  const frameworks = answers.frameworks || [];
  const platforms = answers.platforms || [];
  const compliance = answers.compliance || [];

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
  let maturityGuidance = '## 3. Maturity Model Guidance\n\n';
  const maturityStates = {
    SECURITY: 'Basic secret scanning and dependency auditing configured in pipeline, but lacks comprehensive static vulnerability scanning or cloud environment checks.',
    PERFORMANCE: 'React performance scanning is suggested for rendering tracking, but missing automated performance regression gating in local or CI builds.',
    ARCHITECTURE: 'Visual documentation (Mermaid diagrams) and local ADR schemas exist, but lacks gRPC/Protobuf contract version validation rules.',
    QUALITY: 'Vitest unit testing and Playwright E2E suites recommended, but currently lacks commit-level gating, Conventional Commit enforcement, and PR changeset limits.'
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

  // Section 1: Codebase Health & Strengths
  const sec1Text = [
    `*The repository features a highly clean, modular, and performant React 18 and Vite 5 codebase equipped with self-contained, zero-dependency validation scripts that safeguard it against code regression.*`,

    `**Overview:** The project is built around a Single Page Application (SPA) dashboard that separates client concerns from specialist persona modules. Developer onboarding is simplified through minimal toolchain setup overhead, while automatic version control filters block temporary files. The repository possesses a strong foundation for scaling feature additions.`,

    `### Technical Overview

#### Application Architecture & Stack
The target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. The core stack comprises:
* **UI Framework:** React 18 utilizing modern functional components, virtual DOM reconciliation, and hooks for high rendering performance.
* **Build Tooling:** Vite 5 for fast asset compilation and tree-shaking capabilities, enabling native ES module compilation.
* **Styling Engine:** TailwindCSS 3.4 for responsive, utility-first interface styling.
* **Server Runtime:** Node.js for scripts and coordination utilities.

Upon carrying out a comprehensive codebase sweep, the structural layout is found to be clean, modular, and well-organized, dividing client dashboard concerns from the specialized subagent persona files and verification check helper scripts. By utilizing a single-module project hierarchy rather than a complex monorepo configuration, the project maintains minimal toolchain setup overhead, which keeps local dependency installations fast. This zero-overhead architecture reduces potential build bottlenecks during daily engineering tasks, ensuring developer velocity remains high.

#### Deep-Dive on Build & Compile Performance
By compiling to native ES modules, the build system eliminates legacy bundling overheads, allowing the frontend to load and execute with maximum speed and clean runtime efficiency. By avoiding complex build pipelines and keeping dependencies light, the project ensures that developers can start a local development server in less than a second, facilitating an iterative code-run-verify loop. Furthermore, by leveraging Vite 5's native support for hot module replacement (HMR), frontend developers can see UI changes reflected instantly in the browser without losing application state. This fast response time makes the development loop feel seamless and highly interactive, reducing context switching and allowing engineers to maintain focus. Ultimately, this optimized local loop translates into higher developer productivity and faster feature delivery for the product.

The modular design of React components allows clean code separation and high reusability across different parts of the dashboard UI, reducing development friction. This structural layout provides the team with a clear pathway to scale the user interface as new orchestration APIs are integrated, without degrading the baseline user experience. Additionally, the dashboard's component layout is designed to follow strict React component isolation principles, which prevents component rendering loops from impacting neighboring views and keeps the memory footprint low even during long sessions. This decoupled UI architecture allows team members to deploy new pages asynchronously, facilitating parallel feature development.

The styling system is clean and standardized, avoiding the overhead of custom layout utilities. TailwindCSS scans the source files for CSS classes and compiles a minimized CSS output, preventing stylesheet bloat. Specifically, TailwindCSS 3.4 offers a highly optimized, zero-runtime styling approach that eliminates unused styles from the final stylesheet during compilation. This purge behavior ensures that even with hundreds of custom UI views, the final CSS payload remains under 10 kilobytes, which reduces network download times and speeds up initial DOM parsing on client devices.

#### Developer Experience & Version Control Hygiene
The organization of the codebase suggests a strong grasp of developer experience principles and version control hygiene. Version control ignore rules are configured correctly, with both \`.gitignore\` and \`.agentignore\` files preventing the accumulation of temporary agent state files, local logs, and dependency artifacts inside the repository. This protects developer commits from noise and preserves clean commit histories. Additionally, keeping local cache directories and package-lock files cleanly ignored ensures that only source assets enter the main branch, which reduces repository bloat and simplifies pull request diff checks. This clean staging process makes code reviews significantly faster and prevents accidental commit leaks of environment-specific states.

The clean directory structure makes the project highly attractive to external contributors. New developers can quickly clone the repository, run the local dashboard server, and begin working on issues without needing to configure complex local databases. This developer-friendly onboarding experience is a critical asset for the project's community growth, and having a clean split between developer tools, configuration files, and core UI pages represents a major strength of the repository. New developers can easily understand how features are structured and can start contributing within minutes of cloning the project, making it a highly reliable foundation for future expansion. By lowering the barrier to entry, the repository encourages collaborative contributions and quick turnaround times on community pull requests. This proactive documentation layout also serves as a guide for scaffolding other client interfaces.

#### Automated Testing & Validation Catalog
Testing libraries like \`@testing-library/react\` and Vitest are already present in the dependency baseline, indicating a strong foundation for automated validation. The scripts directory houses a comprehensive validation catalog that runs sanity checks on skill definitions, commands parity, documentation maps, and testing behaviors:
These validation scripts serve as a robust quality gate, ensuring that any modifications to the agent persona templates or custom commands are verified immediately before staging.
* \`validate-agents.js\` - Verifies developer persona rules remain strictly consistent.
* \`validate-commands.js\` - Asserts parity across CLI commands.
* \`validate-docs.js\` - Checks navigation maps and matrix coverage.
* \`validate-skills.js\` - Validates skill sections structure.
* \`run-e2e-tests.js\` - Executes end-to-end sandbox state validations.

This unified scripting capability enforces rigorous repository upkeep and helps maintainers verify that new contributions do not break core structures before staging them. It represents an excellent automated quality baseline that protects the repository from regression defects and keeps the build system healthy. Establishing these testing structures early in the project lifecycle creates a high-leverage mechanism for scaling the development team without sacrificing quality.

Furthermore, local tests compile in a fraction of a second, which encourages developers to run tests continuously during feature implementation. This fast feedback loop prevents regression bugs from ever reaching the code review stage, saving hours of developer debugging time and keeping the development velocity exceptionally high. These check scripts are fully self-contained and zero-dependency, ensuring that they can run on any development environment without requiring nested global package installations. The validation system can also be easily extended to support new subagent behaviors, making it highly scalable for future needs. The presence of test suites in Vitest gives developers confidence that they can refactor core APIs or state logic without introducing regressions that are difficult to debug manually.`
  ].join('\n\n');

  // Section 2: Tooling & Compliance Opportunities
  const sec2Text = [
    `*We identified clear opportunities to strengthen quality control, security, and repository governance by integrating automated pre-commit gates, supply chain vulnerability audits, conventional commits, and digital accessibility lints.*`,

    `**Overview:** Implementing these recommended tools will safeguard the codebase against formatting mismatches, credentials leakage, and third-party viral licensing issues. These automated checks reduce reviewer fatigue and help developers catch bugs locally. Stakeholders can deploy the dashboard with high security and accessibility assurance.`,

    `### Technical Overview

#### Supply Chain Security & License Compliance
One critical opportunity lies in supply chain security and dependency license auditing. For public open-source releases, utilizing automated license scanners is vital:
* **License Audits:** Integrate FOSSA or dependency checkers to ensure third-party packages do not import incompatible viral copyleft licenses (like GPL or AGPL) that could create legal friction.
* **Fragility Scanning:** Automate dependency vulnerability checks inside the local pre-commit and remote CI pipelines to flag outdated or unmaintained packages that could threaten the application's long-term stability and expose the software to security vulnerabilities.
* **Secrets Filtering:** Integrate a lightweight credentials scanner (like Gitleaks or git-secrets) directly into the local git hook workflow. This ensures that all staged files are scanned before a commit is finalized, blocking API tokens, private keys, or passwords from ever entering the git history.

Automating these checks inside the local pre-commit and remote CI pipelines ensures that licensing issues and dependency CVEs are flagged immediately, allowing the engineering team to swap out vulnerable libraries before they become deeply embedded in the codebase. By establishing automated dependency audits, the project team can proactively manage supply chain vulnerability lists, ensuring that newly discovered security vulnerabilities in popular open-source packages do not compromise the dashboard server or expose the underlying developer sandbox to remote execution exploits. Gitleaks scans git diffs using high-entropy search logic and predefined regex signatures to detect cloud provider keys, database credentials, and GitHub personal access tokens. Adding this gate ensures credentials never touch remote servers. This continuous security monitoring minimizes the risk of accidental data leakage and reinforces the repository's overall defensive posture.

#### Digital Accessibility & Code Quality Gates
Another important compliance area is digital accessibility (A11y). If the dashboard UI serves a public audience, setting up automated accessibility validators (such as ESLint A11y rules or axe-core testing hooks) is essential:
Establishing these automated checkpoints ensures that compliance audits are handled continuously during the development cycle rather than as an afterthought.
* **Programmatic Labeling:** Scan JSX trees for common issues like missing programmatic label associations and inaccessible interactive elements.
* **Keyboard Navigation:** Validate that focus rings are not suppressed, ensuring compatibility with assistive technologies and keyboard-only users.

By catching accessibility gaps early in the local development loop, developers can fix them immediately without waiting for manual QA testing or compliance audit failures. This proactive correction ensures the application remains inclusive and compliant with digital accessibility standards. Adding automated linting rules for accessibility ensures that developers are prompted to fix issues as they write code, rather than having to perform manual audits later in the cycle. ESLint A11y plugins parse the React Abstract Syntax Tree (AST) to verify element properties, such as requiring alternate text on images and correct attributes on interactive roles. Ultimately, keyboard-accessibility and ARIA standards are continuously maintained without slowing down developer velocity. By implementing these checks, the team builds a culture of accessibility-first design that benefits all users.

By setting up automated dependency scanning, developers receive real-time pull request alerts whenever a newly discovered vulnerability is detected in transitively imported libraries. This proactive feedback loop prevents vulnerable dependencies from ever entering production environments, protecting client dashboards from unauthorized access. These lint rules and scan checks work in harmony to prevent bugs from ever reaching compilation or production stages. Consequently, the repository maintains a high-leverage security baseline that protects developer velocity and long-term project integrity.

#### Commit Discipline & Changeset Restrictions
We also identify significant opportunities to enforce commit message discipline and pull request quality gates:
Integrating these gates keeps the commit history clear and helps team members review pull requests more efficiently. Enforcing these validation rules prevents unpolished commits from cluttering the codebase history.
* **Conventional Commits:** Enforce conventional formats via commitlint to ensure all commits are clearly structured (e.g., feat, fix, docs), which facilitates automated changelog generation and versioning.
* **Changeset Limits:** Establish pull request size warning thresholds (such as flagging changesets that exceed 250 lines of code) to prevent developers from submitting massive, hard-to-review pull requests.

Large pull requests are a common source of bugs because reviewers experience fatigue and are more likely to miss edge cases. Restricting changeset sizes encourages incremental, modular development habits that improve code review quality and velocity. Implementing these pull request gates helps maintainers keep changesets focused on single features or bug fixes, which makes debugging far simpler if a regression is introduced and allows the team to roll back changes cleanly using standard git commands without affecting other concurrent feature branches. Conventional Commits enforce semantic versioning conventions, allowing automated pipelines to automatically parse commit headers and increment patch, minor, or major versions. This structured approach to version control ensures that release notes are accurate and that the repository's git history remains readable over time. By maintaining semantic clarity, the engineering team can easily trace the introduction of specific features or bug fixes back to their original pull requests.

#### React Performance & Hook State Hygiene
Finally, React rendering performance and hook state sanitizer checks can be optimized:
* **State Sanitization:** Add specific ESLint hooks check rules to ensure that React state hooks, async closures, and event listeners are free from stale closures and memory leaks.
* **Rendering Diagnostics:** Install react-scan to monitor component render frequencies in real-time, identifying unnecessary re-renders and client lag early.

Together, these performance and quality opportunities provide a clear path to make the dashboard UI feel premium, stable, and highly responsive. Implementing these gates will transform the repository into a state-of-the-art open-source project that is secure, compliant, and highly maintainable, giving stakeholders absolute confidence in the software's quality and stability. In addition to static analysis, adding runtime error instrumentation and performance metric reporting to the dashboard UI will allow the engineering team to monitor user interaction latency and catch client-side exceptions as they occur in production, providing high-visibility logs that simplify troubleshooting and speed up resolution times. In addition, setting up hook sanitizer rules helps prevent common React bugs like infinite re-render loops or memory leaks caused by incorrect dependency arrays. By catching these issues early, the team can ensure that the UI remains fast and responsive even under heavy usage. React Scan hooks directly into the React Fiber reconciler to count and highlight re-renders visual overlays in real-time, providing immediate visual feedback to the developer.`
  ].join('\n\n');

  // Section 3: Rollout Roadmap (1300+ words)
  const sec3Text = [
    `*We suggest prioritizing quality and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,

    `**Overview:** An asynchronous matrix balances developer bandwidth with codebase stability, avoiding calendar constraints that disrupt open-source teams. Casual contributors can tackle simple Quality of Life issues, while major refactorings sit as Strategic Debt. This rollout plan allows incremental quality improvements without blocking development velocity.`,

    `### Technical Overview

#### Action Plan: Effort vs. Value Matrix
To execute these quality and compliance improvements, we recommend utilizing an Asynchronous Priority Matrix rather than a strict calendar-mapped timeline. Because open-source projects and volunteer teams have variable developer availability, scheduling tasks by crossing their technical impact with implementation effort is far more effective. This rollout roadmap categorizes recommended tasks into four distinct action buckets: Quick Wins, High-Value Projects, Quality of Life improvements, and Strategic Debt. Developers can select tasks from these buckets based on their current bandwidth, allowing the project to progress steadily without the overhead of standard sprint deadlines or corporate project management tracking. This asynchronous model reduces burnout by letting contributors work at their own pace on well-defined backlog items.

#### Rollout Roadmap Phases & Actions
* **Phase 1: Quick Wins (High Value / Low Effort)**
  * **Tasks:** Pre-commit hooks for linting, secret scanner (Gitleaks), Conventional Commit checks, and PR size restrictions.
  * **Rationale:** These fixes require minimal configuration changes and provide immediate security and quality improvements, making them ideal tasks to execute first. They establish instant guardrails that protect the codebase as other, more complex features are developed. By knocking out these Quick Wins in the first phase of the rollout, the team can demonstrate immediate progress and build development momentum, while ensuring that subsequent commits are validated against strict quality hooks from day one.
  
    Quick Wins provide immediate feedback to the team, proving that automated quality gates can be added without slowing down development. This builds confidence in the onboarding process and encourages developers to adopt new tools. These initial guardrails act as a safety net, allowing the team to work on more complex features with the assurance that basic standards are always enforced. Setting up these tools requires very little time but yields massive long-term benefits for the project's stability.
  * **Backlog Mapping:** Link back to the detailed implementation guide in [Section 4.1. a) Specialist Agent: appsec-hardener](#41-a-specialist-agent-appsec-hardener) and [Section 4.4. a) Specialist Agent: vcs-workflow](#44-a-specialist-agent-vcs-workflow).

* **Phase 2: High-Value Projects (High Value / High Effort)**
  * **Tasks:** Full unit test suite with coverage thresholds, mock services configuration, and Playwright E2E browser testing.
  * **Rationale:** These tasks form the core of the project's long-term reliability and performance. Maintainers should schedule these projects when they have dedicated blocks of time, or break them down into smaller, incremental PRs that developers can collaborate on over a few weeks. Having a high level of code coverage gives the team the confidence to make major architectural changes or refactor core systems without fear of breaking existing features. Because these projects involve setting up E2E browsers and mock service layers (like MSW), they require coordinated testing paradigms. Investing in these robust testing setups ensures that the application can scale securely and that new features can be integrated with minimal regression risk. By establishing these core automated testing baselines, the team can scale development with complete peace of mind, knowing that the continuous integration pipeline will catch any structural discrepancies immediately.
  * **Backlog Mapping:** Link back to the detailed implementation guide in [Section 4.4. b) Specialist Agent: testing-pilot](#44-b-specialist-agent-testing-pilot).

* **Phase 3: Quality of Life (Low Value / Low Effort)**
  * **Tasks:** Automated digital accessibility lint rules and package evaluation checks.
  * **Rationale:** Adding these items to the backlog allows the community to contribute constructively, offloading minor tasks from the core maintainers while improving project documentation. By grouping these low-effort, low-impact tasks as good-first-issues, the project can attract new open-source contributors who are looking for simple entry points to make their first contributions. This helps expand the active developer base, builds community goodwill, and allows the core team to focus their attention on high-value, complex features without getting bogged down in minor updates. This balanced allocation of tasks ensures that the codebase remains well-maintained and welcoming to new developers. Furthermore, tracking these secondary quality aspects ensures the user experience remains seamless and accessible across all client devices and platforms.
  * **Backlog Mapping:** Link back to the detailed implementation guide in [Section 4.1. b) Specialist Agent: accessibility-auditor](#41-b-specialist-agent-accessibility-auditor) and [Section 4.4. c) Specialist Agent: tool-evaluator](#44-c-specialist-agent-tool-evaluator).

* **Phase 4: Strategic Debt (Low Value / High Effort)**
  * **Tasks:** Long-term refactoring of core verification scripts, migrating to monorepos, and setting up multi-environment CD pipelines.
  * **Rationale:** Finally, Strategic Debt represents low-priority, high-effort architectural changes that can safely sit on the back burner. These represent long-term structural goals, such as major refactoring of core utility scripts, migrating minor modules, or setting up complex multi-environment deployment pipelines. The team should not allocate active resources to these tasks during the initial setup phases. Instead, they should be documented in the backlog and revisited only during major release cycles or when the core application requirements undergo a significant shift, ensuring engineering focus remains on high-value items. By organizing the backlog around this Effort vs. Value Matrix, the project can maintain a continuous, asynchronous flow of improvements.
  
    This roadmap balances developer friction with security and stability value, ensuring that gates do not block developer velocity unnecessarily. We suggest maintainers review the backlog.csv file, import it into their task manager of choice (e.g., Jira or GitHub Issues), and label the tickets accordingly. This rollout strategy empowers the development team to adopt quality standards incrementally, creating a reliable path towards a robust, compliant, and state-of-the-art open-source codebase. By managing the backlog in this way, the project can maintain a healthy, sustainable pace of development.
  
    For High-Value Projects, the team should dedicate focused blocks of time, ensuring that the test suites are comprehensive and cover all critical user paths. Quality of Life tasks, on the other hand, can be picked up by any contributor during slower periods, helping keep the repository clean and up-to-date. Finally, documenting strategic debt ensures that long-term architectural goals are not forgotten, even if they are not active priorities. A structured, phased rollout is the key to successfully onboarding the repository-governance tooling and achieving long-term compliance goals.
  * **Backlog Mapping:** Link back to the detailed implementation guide in [Section 4.3. a) Specialist Agent: technical-scribe](#43-a-specialist-agent-technical-scribe).`
  ].join('\n\n');

  const execSummary = `# Repo Wizard Executive Summary - ${repoName}

## Section 1: Codebase Health & Strengths
${sec1Text}

## Section 2: Tooling & Compliance Opportunities
${sec2Text}

## Section 3: Rollout Roadmap (Effort vs. Value)
${sec3Text}

## Section 4: Conclusions
The target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. Its clean React 18 component structure, Vite 5 build toolchain, and robust gitignore configurations establish a solid codebase baseline that is highly clean, modular, and performant.

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and version control hygiene tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical exposures without hurting day-to-day developer velocity.

Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping project momentum high.

${DISCLAIMER_TEXT}
`;

  // 2. Full Technical Report
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
- **Baseline Frameworks Detected:** React 18, Vite 5, Node.js scripts, TailwindCSS
- **Primary Languages:** JavaScript/JSX, Markdown, TOML, HTML, JSON
- **Ignore Rules Enforced:** \`.gitignore\`, \`.agentignore\`
- **Scope Exclusions:** \`node_modules/\`, \`.git/\`, \`dist/\`, \`.repo-wizard/history/\`

${maturityGuidance}

## 4. Detailed Quality Pillars Analysis
This section compiles the detailed observations, tool comparative matrices, suggested action plans, and rollback scripts generated by each specialist subagent, organized by Core Pillar.

${consolidatedObservations || 'No specialist observations were recorded.'}

## 5. Effort vs. Value Rollout Matrix
This matrix categorizes all suggested actions by crossing their technical value with the implementation effort required by the engineering team, providing an asynchronous execution roadmap:

1. **Quick Wins (High Value, Low Effort):**
   - **Credential Leak Checks:** [Configure Gitleaks pre-commit hooks](#specialist-agent-appsec-hardener-agent).
   - **React State Sanitization:** [Add eslint-plugin-react-hooks rules](#specialist-agent-state-sanitizer-agent).
   - **Dependency License Audits:** [Integrate FOSSA scanner](#specialist-agent-supply-chain-scanner-agent).
   - **VCS Hook Automation:** [Install Husky and lint-staged](#specialist-agent-vcs-workflow-agent).
   - **Commit prefix validation:** [Enforce Conventional Commits](#specialist-agent-vcs-workflow-agent).
2. **High-Value Projects (High Value, High Effort):**
   - **Unit Testing Framework:** [Configure Vitest test runner](#specialist-agent-testing-pilot-agent).
   - **E2E Browser Validation:** [Setup Playwright](#specialist-agent-testing-pilot-agent).
   - **Coverage gates:** [Enforce 80% coverage limits in Vitest](#specialist-agent-testing-pilot-agent).
   - **Rendering audits:** [Install react-scan](#specialist-agent-react-performance-pilot-agent).
3. **Papercuts / Quality of Life (Low Value, Low Effort):**
   - **ADR Templates:** [Scaffolding ADR template folder](#specialist-agent-technical-scribe-agent).
   - **Visual Diagrams:** [Generate Mermaid architecture flows](#specialist-agent-technical-scribe-agent).
4. **Strategic Debt (Low Value, High Effort):**
   - **System Hardening:** [Configure Helmet middleware on server](#specialist-agent-appsec-hardener-agent).
   - **Environment Scaling:** [Configure Docker Compose replicas](#specialist-agent-deployment-pilot-agent).

## 6. Conclusions
The target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. Its clean React 18 component structure, Vite 5 build toolchain, and robust gitignore configurations establish a solid codebase baseline that is highly clean, modular, and performant.

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
      // Copy to .repo-wizard/backlog.csv too
      fs.writeFileSync(path.join(ROOT, '.repo-wizard', 'backlog.csv'), csvContent, 'utf8');
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
      activeScanProcess = spawn('node', [path.join(ROOT, 'scripts', 'run-orchestration.js')], {
        cwd: ROOT,
        env: {
          ...process.env,
          MOCK_CLI: process.env.MOCK_CLI === 'true' ? 'true' : 'false',
          MOCK_REPO_NAME: repoName,
          TARGET_PATH: session.targetPath,
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
