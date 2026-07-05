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

    // Test 6: walkWorkspaceDir validation
    const { walkWorkspaceDir } = require('../scripts/scan-helpers');
    const walkTestDir = path.join(tempTestDir, 'walk_test');
    fs.mkdirSync(walkTestDir, { recursive: true });
    
    // Create nested structure:
    // walk_test/
    //   file1.txt
    //   dir1/
    //     file2.txt
    //     dir2/
    //       file3.txt
    fs.writeFileSync(path.join(walkTestDir, 'file1.txt'), 'file1');
    fs.mkdirSync(path.join(walkTestDir, 'dir1'), { recursive: true });
    fs.writeFileSync(path.join(walkTestDir, 'dir1', 'file2.txt'), 'file2');
    fs.mkdirSync(path.join(walkTestDir, 'dir1', 'dir2'), { recursive: true });
    fs.writeFileSync(path.join(walkTestDir, 'dir1', 'dir2', 'file3.txt'), 'file3');

    // 6a: Test default walk
    const defaultWalk = walkWorkspaceDir(walkTestDir);
    assert(defaultWalk.length === 3, `Expected 3 files, got ${defaultWalk.length}`);
    assert(defaultWalk.some(f => f.name === 'file1.txt'), 'Walk includes file1.txt');
    assert(defaultWalk.some(f => f.name === 'file2.txt'), 'Walk includes file2.txt');
    assert(defaultWalk.some(f => f.name === 'file3.txt'), 'Walk includes file3.txt');

    // 6b: Test maxDepth limit
    const depth1Walk = walkWorkspaceDir(walkTestDir, { maxDepth: 1 });
    // walk_test is depth 0, walk_test/dir1/file2.txt is depth 1, walk_test/dir1/dir2/file3.txt is depth 2
    assert(depth1Walk.length === 2, `Expected 2 files at depth 1 limit, got ${depth1Walk.length}`);
    assert(!depth1Walk.some(f => f.name === 'file3.txt'), 'Walk at depth 1 limit does not include file3.txt');

    // 6c: Test maxFiles limit
    const limitWalk = walkWorkspaceDir(walkTestDir, { maxFiles: 2 });
    assert(limitWalk.length === 2, `Expected 2 files at maxFiles: 2 limit, got ${limitWalk.length}`);

    // 6d: Test ignoreDirectories
    const ignoreWalk = walkWorkspaceDir(walkTestDir, { ignoreDirectories: ['dir1'] });
    assert(ignoreWalk.length === 1, `Expected 1 file when dir1 is ignored, got ${ignoreWalk.length}`);
    assert(ignoreWalk[0].name === 'file1.txt', 'Only file1.txt should be returned');

    // 6e: Test includeDirectories option
    const includeDirWalk = walkWorkspaceDir(walkTestDir, { includeDirectories: true });
    assert(includeDirWalk.length === 5, `Expected 5 entries (3 files, 2 directories) when includeDirectories is true, got ${includeDirWalk.length}`);
    assert(includeDirWalk.some(e => e.name === 'dir1' && e.isDir === true), 'Walk includes directory entries');

    // 6f: Test returnAbsolutePathsOnly option
    const absWalk = walkWorkspaceDir(walkTestDir, { returnAbsolutePathsOnly: true });
    assert(absWalk.length === 3, 'Expected 3 absolute paths');
    assert(typeof absWalk[0] === 'string', 'Returned values should be strings');
    assert(path.isAbsolute(absWalk[0]), 'Paths should be absolute');

    // 6g: Test callbacks
    let fileCount = 0;
    let dirCount = 0;
    walkWorkspaceDir(walkTestDir, {
      onFile: () => { fileCount++; },
      onDirectory: () => { dirCount++; return true; }
    });
    assert(fileCount === 3, `Expected 3 file callback calls, got ${fileCount}`);
    assert(dirCount === 2, `Expected 2 directory callback calls, got ${dirCount}`);

  } finally {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
    clearFileCache();
  }
}

module.exports = { run };
