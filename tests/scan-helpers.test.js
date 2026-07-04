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

  } finally {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
    clearFileCache();
  }
}

module.exports = { run };
