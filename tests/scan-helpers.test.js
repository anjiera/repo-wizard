'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, assert } = require('./test-utils');
const { getRepoSize, checkAgentRelevance, clearFileCache } = require('../scripts/scan-helpers');

function run() {
  console.log('Testing scan-helpers.js...');

  // Test 1: getRepoSize thresholds
  assert(getRepoSize(500, 5) === 'XS', 'getRepoSize returns XS for small codebase');
  assert(getRepoSize(1500, 10) === 'S', 'getRepoSize returns S for small-medium codebase');
  assert(getRepoSize(12000, 20) === 'M', 'getRepoSize returns M for medium codebase');
  assert(getRepoSize(60000, 50) === 'L', 'getRepoSize returns L for large codebase');
  assert(getRepoSize(200000, 100) === 'XL', 'getRepoSize returns XL for extra-large codebase');

  // Test 2: checkAgentRelevance for notebook-auditor
  const tempTestDir = path.join(ROOT, 'temp_scan_helpers_test_dir');
  if (!fs.existsSync(tempTestDir)) {
    fs.mkdirSync(tempTestDir, { recursive: true });
  }

  try {
    clearFileCache();
    const rel1 = checkAgentRelevance('notebook-auditor', tempTestDir);
    assert(rel1.relevance === 'Low', 'notebook-auditor has Low relevance when no notebooks exist');

    fs.writeFileSync(path.join(tempTestDir, 'test.ipynb'), '{}');
    clearFileCache();
    const rel2 = checkAgentRelevance('notebook-auditor', tempTestDir);
    assert(rel2.relevance === 'High', 'notebook-auditor has High relevance when notebook is added');

    clearFileCache();
    const relVCS = checkAgentRelevance('vcs-workflow-engineer', tempTestDir);
    assert(relVCS.relevance === 'High', 'vcs-workflow-engineer always has High relevance');

    // Test 3: ensureReportDirectories
    const { ensureReportDirectories, promoteStateFiles, archiveSession } = require('../scripts/scan-helpers');
    const { reportsDir, agentsDir, contractsDir } = ensureReportDirectories(tempTestDir, 'test-repo');
    assert(fs.existsSync(reportsDir), 'ensureReportDirectories creates reportsDir');
    assert(fs.existsSync(agentsDir), 'ensureReportDirectories creates agentsDir');
    assert(fs.existsSync(contractsDir), 'ensureReportDirectories creates contractsDir');

    // Test 4: promoteStateFiles
    const wizardDir = path.join(tempTestDir, '.repo-wizard');
    fs.writeFileSync(path.join(wizardDir, 'session.json'), '{"repoSize":"S"}', 'utf8');
    promoteStateFiles(tempTestDir, 'test-repo');
    assert(fs.existsSync(path.join(reportsDir, 'session.json')), 'promoteStateFiles copies session.json to reports directory');

    // Test 5: archiveSession
    archiveSession(tempTestDir, { repoName: 'test-repo' });
    const historyBase = path.join(reportsDir, '..', 'history', 'test-repo');
    assert(fs.existsSync(historyBase), 'archiveSession creates history subdirectory');

  } finally {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
    clearFileCache();
  }
}

module.exports = { run };
