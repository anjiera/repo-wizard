#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ensureReportDirectories } = require('./scan-helpers');
const { RESET, BOLD, GREEN, RED, BLUE } = require('../solo-dev-toolkit/scripts/cli-helpers');

const args = process.argv.slice(2);
let reportPath = null;

const reportIdx = args.indexOf('--report-path');
if (reportIdx !== -1 && args[reportIdx + 1] && !args[reportIdx + 1].startsWith('-')) {
  reportPath = args[reportIdx + 1];
}

const resolvedReport = reportPath ? path.resolve(reportPath) : process.cwd();
const rootWizardDir = path.join(resolvedReport, '.repo-wizard');
const manifestPath = path.join(rootWizardDir, 'manifest.json');
const sessionPath = path.join(rootWizardDir, 'session.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`${RED}✗ Error: manifest.json not found at ${manifestPath}. Run scan first.${RESET}`);
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const repoName = manifest.repo_name || path.basename(resolvedReport).replace(/[^a-zA-Z0-9_\-\.]/g, '') || 'project';

  // Ensure target reports, contracts, and observations directories exist
  const { reportsDir: REPORTS_DIR, contractsDir: CONTRACTS_DIR } = ensureReportDirectories(resolvedReport, repoName);

  // Sync state configurations
  fs.copyFileSync(manifestPath, path.join(REPORTS_DIR, 'manifest.json'));
  if (fs.existsSync(sessionPath)) {
    fs.copyFileSync(sessionPath, path.join(REPORTS_DIR, 'session.json'));
  }

  // 1. Unpack contracts
  let unpackedContractsCount = 0;
  for (const c of manifest.contracts || []) {
    if (c.status !== 'skipped') {
      const contractPath = path.join(CONTRACTS_DIR, `${c.agent_name}-contract.json`);
      fs.writeFileSync(contractPath, JSON.stringify(c.contract, null, 2), 'utf8');
      unpackedContractsCount++;
    }
  }

  // 2. Unpack subagent prompts & registry data
  const pluginDir = path.resolve(__dirname, '..');
  const registryPath = path.join(pluginDir, 'agents', 'agent-registry.json');
  
  if (!fs.existsSync(registryPath)) {
    console.error(`${RED}✗ Error: agent-registry.json not found in plugin install directory: ${pluginDir}${RESET}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const activeAgentsData = [];

  for (const entry of manifest.contracts || []) {
    if (entry.status === 'skipped') continue;
    const name = entry.agent_name;
    const info = registry[name];
    if (!info) continue;

    const agentPromptPath = path.join(pluginDir, 'agents', `${name}.md`);
    const systemPrompt = fs.existsSync(agentPromptPath) ? fs.readFileSync(agentPromptPath, 'utf8') : '';

    activeAgentsData.push({
      name,
      title: info.title,
      description: info.description,
      systemPrompt,
      contract: entry.contract,
      enable_write_tools: !!(info.permissions && info.permissions.enable_write_tools)
    });
  }

  fs.writeFileSync(
    path.join(rootWizardDir, 'resolved_agents_data.json'),
    JSON.stringify(activeAgentsData, null, 2),
    'utf8'
  );

  console.log(`${GREEN}✓ Success:${RESET} Workspace prepared. Unpacked ${BOLD}${unpackedContractsCount}${RESET} contracts and serialized agent prompt configurations.`);
  process.exit(0);
} catch (e) {
  console.error(`${RED}✗ Preparation failed: ${e.message}${RESET}`);
  process.exit(1);
}
