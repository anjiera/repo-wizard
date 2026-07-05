'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-project-docs.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-project-docs.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-project-docs.js exits with 0 on healthy repository');

  // Test 2: Create a temp untracked reference file
  const tempRefPath = path.join(ROOT, 'references', 'temp-untracked-ref.md');
  fs.writeFileSync(tempRefPath, '# Temp Untracked Reference\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when reference file is untracked');
    assert(unhealthyRun.stdout.includes("Reference file 'temp-untracked-ref.md' is not indexed in references/README.md"),
      'validate-project-docs.js prints correct missing reference error message');
  } finally {
    if (fs.existsSync(tempRefPath)) fs.unlinkSync(tempRefPath);
  }

  // Test 3: Create a temp unlisted agent
  const tempAgentPath = path.join(ROOT, 'agents', 'temp-unlisted-agent.md');
  fs.writeFileSync(tempAgentPath, '# Temp Unlisted Agent\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when agent is unlisted in matrix');
    assert(unhealthyRun.stdout.includes("Agent persona 'temp-unlisted-agent' is not listed in docs/AGENT_MATRIX.md"),
      'validate-project-docs.js prints correct unlisted agent error message');
  } finally {
    if (fs.existsSync(tempAgentPath)) fs.unlinkSync(tempAgentPath);
  }

  // Test 4: Create a temp unlisted docs guide
  const tempGuidePath = path.join(ROOT, 'docs', 'temp-unlisted-guide.md');
  fs.writeFileSync(tempGuidePath, '# Temp Unlisted Guide\n');

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when documentation file is unmapped in README');
    assert(unhealthyRun.stdout.includes("Documentation file 'docs/temp-unlisted-guide.md' is not mapped in root README.md"),
      'validate-project-docs.js prints correct unmapped guide error message');
  } finally {
    if (fs.existsSync(tempGuidePath)) fs.unlinkSync(tempGuidePath);
  }

  // Test 5: Intra-file duplication check
  const tempSubDir = path.join(ROOT, 'docs', 'temp-test-sub');
  if (!fs.existsSync(tempSubDir)) fs.mkdirSync(tempSubDir);

  const tempIntraPath = path.join(tempSubDir, 'temp-intra.md');
  fs.writeFileSync(tempIntraPath, `
This is a long paragraph block designed to trigger the validator duplication detection rules because it is repeated.

This is a long paragraph block designed to trigger the validator duplication detection rules because it is repeated.
`);

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when a file has intra-file duplication');
    assert(unhealthyRun.stdout.includes('Intra-file duplication:'), 'validate-project-docs.js prints intra-file duplication error');
    assert(unhealthyRun.stdout.includes('temp-intra.md'), 'validate-project-docs.js reports the duplicate file name');
  } finally {
    if (fs.existsSync(tempIntraPath)) fs.unlinkSync(tempIntraPath);
    if (fs.existsSync(tempSubDir)) fs.rmdirSync(tempSubDir);
  }

  // Test 6: Inter-file duplication check
  if (!fs.existsSync(tempSubDir)) fs.mkdirSync(tempSubDir);

  const tempInter1 = path.join(tempSubDir, 'temp-inter-1.md');
  const tempInter2 = path.join(tempSubDir, 'temp-inter-2.md');
  const tempInter3 = path.join(tempSubDir, 'temp-inter-3.md');
  const duplicateParagraph = `This is a completely shared block of prose that appears in multiple separate files to verify that inter-file replication checks work properly.`;

  fs.writeFileSync(tempInter1, duplicateParagraph);
  fs.writeFileSync(tempInter2, duplicateParagraph);
  fs.writeFileSync(tempInter3, duplicateParagraph);

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-project-docs.js exits with 1 when text is duplicated across three files');
    assert(unhealthyRun.stdout.includes('Inter-file duplication: Identical text is duplicated across 3 files'),
      'validate-project-docs.js prints correct inter-file duplication error message');
  } finally {
    if (fs.existsSync(tempInter1)) fs.unlinkSync(tempInter1);
    if (fs.existsSync(tempInter2)) fs.unlinkSync(tempInter2);
    if (fs.existsSync(tempInter3)) fs.unlinkSync(tempInter3);
    if (fs.existsSync(tempSubDir)) fs.rmdirSync(tempSubDir);
  }
}

module.exports = { run };
