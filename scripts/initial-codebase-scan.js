#!/usr/bin/env node
/**
 * scripts/initial-codebase-scan.js
 *
 * Unified setup and static codebase analyzer script.
 * - Resolves target path and checks existence
 * - Runs count-loc.js to retrieve metrics and exceedsAdoptionThreshold status
 * - Infers codebase properties: primary language, build system, frameworks
 * - Generates manifest.json and session.json files
 * - Exits with 0 on success, or 1 on failure
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getRepoSize, checkAgentRelevance, clearFileCache, ensureReportDirectories } = require('./scan-helpers');


const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

const agentRegistry = require('../agents/agent-registry.json');
const SPECIALISTS = Object.keys(agentRegistry).filter(
  key => agentRegistry[key].pillar !== 'ORCHESTRATOR' && agentRegistry[key].pillar !== 'HELPER'
);

function printUsageAndExit(err) {
  if (err) console.error(`${RED}✗ Error: ${err}${RESET}`);
  console.log(`Usage: node scripts/initial-codebase-scan.js --target-path <target_path> [--report-path <report_path>]`);
  process.exit(1);
}

// Simple parameter parsing
const args = process.argv.slice(2);
let targetPath = null;
let reportPath = null;

const targetIdx = args.indexOf('--target-path');
if (targetIdx !== -1 && args[targetIdx + 1] && !args[targetIdx + 1].startsWith('-')) {
  targetPath = args[targetIdx + 1];
}

const reportIdx = args.indexOf('--report-path');
if (reportIdx !== -1 && args[reportIdx + 1] && !args[reportIdx + 1].startsWith('-')) {
  reportPath = args[reportIdx + 1];
}

let pillarFilter = null;
const pillarIdx = args.indexOf('--pillar');
if (pillarIdx !== -1 && args[pillarIdx + 1] && !args[pillarIdx + 1].startsWith('-')) {
  pillarFilter = args[pillarIdx + 1].toUpperCase();
}

const ALLOWED_PILLARS = ['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'QUALITY', 'ALL'];
if (pillarFilter && !ALLOWED_PILLARS.includes(pillarFilter)) {
  console.error(`${RED}✗ Error: Invalid pillar option '${pillarFilter}'. Allowed options are: ${ALLOWED_PILLARS.join(', ')}.${RESET}`);
  process.exit(1);
}

const isHeadless = args.includes('--headless') || process.env.HEADLESS === 'true' || process.env.ANTIGRAVITY_AGENT !== '1';

if (!targetPath) {
  printUsageAndExit('Missing required parameter "--target-path".');
}

const resolvedTarget = path.resolve(targetPath);
if (!fs.existsSync(resolvedTarget)) {
  console.error(`${RED}✗ Error: Target directory "${resolvedTarget}" does not exist.${RESET}`);
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const resolvedReport = reportPath ? path.resolve(reportPath) : ROOT;

const parts = targetPath.split(/[\/\\]/);
let repoName = parts[parts.length - 1] || 'project';
if (repoName.endsWith('.git')) {
  repoName = repoName.slice(0, -4);
}
repoName = repoName.replace(/[^a-zA-Z0-9_\-\.]/g, '');
if (!repoName || repoName === '.' || repoName === '..' || repoName.toLowerCase() === 'reports' || repoName.toLowerCase() === 'history') {
  repoName = 'project';
}

console.log(`${BLUE}==>${RESET} ${BOLD}Starting initial codebase scan for: ${repoName}...${RESET}`);

// 1. Run count-loc.js to collect metrics
let exceedsAdoptionThreshold = false;
let totalLOC = 0;
let totalFiles = 0;
try {
  const countLocPath = path.join(ROOT, 'solo-dev-toolkit', 'scripts', 'count-loc.js');
  const result = execSync(`node "${countLocPath}" --target-path "${resolvedTarget}" --json`, { encoding: 'utf8' });
  const stats = JSON.parse(result);
  exceedsAdoptionThreshold = !!stats.exceedsAdoptionThreshold;
  totalLOC = stats.totalLOC || 0;
  totalFiles = stats.totalFiles || 0;
  console.log(`✓ Sizing analysis completed: ${totalFiles} files, ${totalLOC} LOC.`);
  if (exceedsAdoptionThreshold) {
    console.log(`${YELLOW}⚠ WARNING: Codebase size exceeds incremental adoption threshold.${RESET}`);
  }
} catch (err) {
  console.warn(`${YELLOW}⚠ Warning: Could not run count-loc.js successfully. Falling back to default limits.${RESET}`);
}

// 2. Perform static file checking to infer language, build system, and frameworks
let language = 'javascript';
let buildSystem = 'none';
const frameworks = [];

const fileCache = [];
function traverse(dir, depth = 0) {
  if (depth > 5 || fileCache.length > 5000) return;
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return;
  }
  for (const file of files) {
    if (['.git', 'node_modules', 'dist', 'build', '.repo-wizard', 'bin', 'obj'].includes(file)) {
      continue;
    }
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        fileCache.push({ name: file.toLowerCase(), path: fullPath });
      } else if (stat.isDirectory()) {
        traverse(fullPath, depth + 1);
      }
    } catch (e) {}
  }
}
traverse(resolvedTarget);

const fileNames = new Set(fileCache.map(f => f.name));
const extensions = new Set(fileCache.map(f => path.extname(f.name)));

if (fileNames.has('cargo.toml') || extensions.has('.rs')) {
  language = 'rust';
  buildSystem = 'cargo';
  frameworks.push('rust');
} else if (fileNames.has('go.mod') || extensions.has('.go')) {
  language = 'go';
  buildSystem = 'go-modules';
  frameworks.push('go');
} else if (fileNames.has('pom.xml')) {
  language = 'java';
  buildSystem = 'maven';
  frameworks.push('java');
} else if (fileNames.has('build.gradle') || fileNames.has('build.gradle.kts')) {
  language = extensions.has('.kt') ? 'kotlin' : 'java';
  buildSystem = 'gradle';
  frameworks.push(language);
} else if (extensions.has('.cs')) {
  language = 'c#';
  buildSystem = 'dotnet';
  if (fileNames.has('csproj') || fileNames.has('sln')) {
    buildSystem = 'msbuild';
  }
} else if (extensions.has('.bas') || extensions.has('.prg') || extensions.has('.basic')) {
  language = 'basic';
  buildSystem = 'none';
  frameworks.push('basic');
} else if (fileNames.has('package.json') || extensions.has('.js') || extensions.has('.jsx') || extensions.has('.ts') || extensions.has('.tsx')) {
  language = (extensions.has('.ts') || extensions.has('.tsx')) ? 'typescript' : 'javascript';
  buildSystem = 'npm';
  if (fileNames.has('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(resolvedTarget, 'package.json'), 'utf8'));
      if ((pkg.dependencies && pkg.dependencies.react) || (pkg.devDependencies && pkg.devDependencies.react)) {
        frameworks.push('react');
      }
    } catch (e) {}
  }
  if (!frameworks.includes('react') && (extensions.has('.jsx') || extensions.has('.tsx'))) {
    frameworks.push('react');
  }
}

console.log(`✓ Inferred profile: language=${language}, build_system=${buildSystem}, frameworks=[${frameworks.join(', ')}]`);

const repoSize = getRepoSize(totalLOC, totalFiles);
console.log(`✓ Classified repo size: ${repoSize}`);

// 3. Build manifest.json and session.json
const { reportsDir: REPORTS_DIR, agentsDir: obsDir, contractsDir } = ensureReportDirectories(resolvedReport, repoName);

let existingManifest = null;
let existingSession = null;
const existingManifestPath = path.join(REPORTS_DIR, 'manifest.json');
const existingSessionPath = path.join(REPORTS_DIR, 'session.json');
if (fs.existsSync(existingManifestPath)) {
  try {
    existingManifest = JSON.parse(fs.readFileSync(existingManifestPath, 'utf8'));
  } catch (e) {}
}
if (fs.existsSync(existingSessionPath)) {
  try {
    existingSession = JSON.parse(fs.readFileSync(existingSessionPath, 'utf8'));
  } catch (e) {}
}

// Check if running inside Google Antigravity native chat sandbox.
// The ANTIGRAVITY_AGENT environment variable is automatically set to '1' by the platform.
// This indicates the capability to spawn parallel specialist subagents natively via invoke_subagent.
const isNativeChat = process.env.ANTIGRAVITY_AGENT === '1';

clearFileCache();

const manifestContracts = [];

for (const spec of SPECIALISTS) {
  const { relevance, rationale } = checkAgentRelevance(spec, resolvedTarget);
  const specPillar = agentRegistry[spec].pillar;
  const isPillarMatch = !pillarFilter || pillarFilter === 'ALL' || specPillar === pillarFilter;

  let status = 'pending';
  if (relevance === 'Low' || !isPillarMatch) {
    status = 'skipped';
  } else if (isNativeChat) {
    status = 'pending_agent_fallback';
  }

  // Preserve existing completed status for non-target pillars during incremental runs
  if (pillarFilter && pillarFilter !== 'ALL' && specPillar !== pillarFilter && existingManifest) {
    const existingContract = existingManifest.contracts.find(c => c.agent_name === spec);
    if (existingContract && existingContract.status === 'completed') {
      status = 'completed';
    }
  }

  manifestContracts.push({
    agent_name: spec,
    status,
    contract: {
      task_metadata: {
        target_modules: [resolvedTarget],
        language,
        build_system: buildSystem,
        execution_mode: 'scaffold'
      },
      compliance_targets: [],
      tooling_specification: []
    }
  });
}

const activeCount = manifestContracts.filter(c => c.status !== 'skipped').length;
const hasPillarArg = args.includes('--pillar');
if (isHeadless && activeCount > 6 && !hasPillarArg) {
  console.log(`${YELLOW}⚠ High Sweep Warning: The system identified ${activeCount} relevant specialist agents.${RESET}`);
  console.log(`Running all of them at once will consume significant AI tokens.`);
  console.log(`\nTo run your audits in stages, please run individual pillars:`);
  console.log(`  node scripts/initial-codebase-scan.js --target-path <path> --pillar SECURITY`);
  console.log(`  node scripts/initial-codebase-scan.js --target-path <path> --pillar PERFORMANCE`);
  console.log(`  node scripts/initial-codebase-scan.js --target-path <path> --pillar ARCHITECTURE`);
  console.log(`  node scripts/initial-codebase-scan.js --target-path <path> --pillar QUALITY`);
  console.log(`\nTo bypass this warning and run all specialists, run explicitly with:`);
  console.log(`  node scripts/initial-codebase-scan.js --target-path <path> --pillar ALL`);
  process.exit(2);
}

const manifest = {
  status: isNativeChat ? 'fallback_to_agent' : 'pending',
  nativeChatEnvironment: isNativeChat,
  contracts: manifestContracts
};

const session = {
  status: 'in_progress',
  targetPath: resolvedTarget.replace(/\\/g, '/'),
  reportPath: resolvedReport.replace(/\\/g, '/'),
  repoSize,
  answersInferred: true,
  reportStyle: 'whitepaper',
  exceedsAdoptionThreshold,
  nativeChatEnvironment: isNativeChat,
  answers: {
    frameworks,
    platforms: [],
    compliance: [],
    scaffoldingMode: 'scaffold',
    friction: 'medium',
    ...(existingSession ? existingSession.answers : {})
  }
};

// Write files to target report folder and copy manifest to root pointer
fs.writeFileSync(path.join(REPORTS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(path.join(REPORTS_DIR, 'session.json'), JSON.stringify(session, null, 2), 'utf8');

// Copy manifest and session to root so run-fallback-sequential-orchestration.js can consume & promote it
const rootWizardDir = path.join(resolvedReport, '.repo-wizard');
fs.mkdirSync(rootWizardDir, { recursive: true });
fs.writeFileSync(path.join(rootWizardDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(path.join(rootWizardDir, 'session.json'), JSON.stringify(session, null, 2), 'utf8');

// Write last session pointer for reports-compile.js ease of use
fs.writeFileSync(path.join(rootWizardDir, 'last_session_path.json'), JSON.stringify({
  lastSessionPath: path.join(REPORTS_DIR, 'session.json')
}, null, 2), 'utf8');

console.log(`${GREEN}✓ Pre-scan setup complete. manifest.json and session.json written successfully.${RESET}\n`);
process.exit(0);

