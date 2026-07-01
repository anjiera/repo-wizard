#!/usr/bin/env node
/**
 * sdt-test-helpers.js
 *
 * Runs unit and integration tests for the solo-dev-toolkit scripts:
 *   - md-to-html.js
 *   - validate-commit-msg.js
 *   - validate-docs.js
 *   - papercuts.js
 *
 * Assert exit codes, file operations, output errors, and data structures.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SDT_SCRIPTS_DIR = __dirname;

let testsRun = 0;
let testsPassed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ Pass: ${message}`);
  } else {
    console.error(`  ✗ Fail: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runScript(scriptPath, args = []) {
  try {
    const stdout = execSync(`node "${scriptPath}" ${args.join(' ')}`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env }
    }).toString();
    return { code: 0, stdout };
  } catch (err) {
    return {
      code: err.status || 1,
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : ''
    };
  }
}

function testMdToHtml() {
  console.log('Testing md-to-html.js...');
  const { convertMdToHtml } = require('./md-to-html');

  // 1. Basic HTML compilation
  const basicHtml = convertMdToHtml('# Test Header\n- List Item', 'Test Title');
  assert(basicHtml.includes('<title>Test Title</title>'), 'renders title tag');
  assert(basicHtml.includes('<h1 id="test-header">Test Header</h1>'), 'compiles H1 tags');
  assert(basicHtml.includes('<li>List Item</li>'), 'compiles list items');

  // 2. Dark mode styling injection
  assert(basicHtml.includes('prefers-color-scheme: dark'), 'injects dark-mode styling block');

  // 3. URL sanitization parameters
  // tel:
  const telHtml = convertMdToHtml('[Call Me](tel:1234567)');
  assert(telHtml.includes('href="tel:1234567"'), 'allows tel: scheme');

  // file:///
  const fileHtml = convertMdToHtml('[File Link](file:///C:/test.txt)');
  assert(fileHtml.includes('href="file:///C:/test.txt"'), 'allows file:/// scheme');

  // Single-character drive letters
  const driveHtml = convertMdToHtml('[Drive Link](C:/test.txt)');
  assert(driveHtml.includes('href="C:/test.txt"'), 'allows single-character drive letters');

  // Block javascript:
  const jsHtml = convertMdToHtml('[XSS Link](javascript:alert(1))');
  assert(jsHtml.includes('href="#"'), 'blocks javascript: scheme');

  // Block nested/obfuscated javascript:
  const nestedJsHtml = convertMdToHtml('[Nested XSS Link](java&Tab;script:alert(1))');
  assert(nestedJsHtml.includes('href="#"'), 'blocks obfuscated/nested javascript scheme');

  // Block slash-based onerror handler
  const slashXssHtml = convertMdToHtml('<img/src="x"/onerror="alert(1)">');
  assert(!slashXssHtml.includes('onerror'), 'blocks slash-based inline event handlers');

  // 4. Nested parentheses and ReDoS safety
  const nestedParenHtml = convertMdToHtml('[nested](url(param))');
  assert(nestedParenHtml.includes('href="url(param)"'), 'handles nested parentheses in link URL');

  const t0 = Date.now();
  const badInput = '[link](' + 'a'.repeat(2000);
  convertMdToHtml(badInput);
  const elapsed = Date.now() - t0;
  assert(elapsed < 10, 'safe from ReDoS backtracking (unclosed link parsing is fast)');
}

function testValidateCommitMsg() {
  console.log('Testing validate-commit-msg.js...');
  const scriptPath = path.join(SDT_SCRIPTS_DIR, 'validate-commit-msg.js');
  const tempMsgFile = path.join(ROOT, 'temp-commit-msg-test.txt');

  const runWithMsg = (msg) => {
    fs.writeFileSync(tempMsgFile, msg, 'utf8');
    try {
      return runScript(scriptPath, [tempMsgFile]);
    } finally {
      if (fs.existsSync(tempMsgFile)) fs.unlinkSync(tempMsgFile);
    }
  };

  // Valid conventional commits
  assert(runWithMsg('feat(api): add new login page').code === 0, 'accepts valid feat commit');
  assert(runWithMsg('fix: resolve memory leak').code === 0, 'accepts valid fix commit without scope');
  assert(runWithMsg('chore(deps)!: upgrade packages').code === 0, 'accepts breaking change indicator');

  // Invalid commit messages
  assert(runWithMsg('wip: code cleanup').code === 1, 'rejects invalid type');
  assert(runWithMsg('feat:').code === 1, 'rejects empty description');
  assert(runWithMsg('docs(api) no colon').code === 1, 'rejects missing colon');
}

function testValidateDocs() {
  console.log('Testing validate-docs.js (toolkit version)...');
  const scriptPath = path.join(SDT_SCRIPTS_DIR, 'validate-docs.js');

  // Run in clean repository state
  const cleanRun = runScript(scriptPath);
  assert(cleanRun.code === 0, 'validate-docs.js exits with 0 on healthy repository');

  // 1. Emoji Check
  const tempEmojiFile = path.join(ROOT, 'temp-emoji-test.md');
  fs.writeFileSync(tempEmojiFile, '# Unapproved Emoji ' + String.fromCodePoint(0x1F680) + '\n', 'utf8');
  try {
    const emojiRun = runScript(scriptPath);
    assert(emojiRun.code === 1, 'validate-docs.js fails when file contains unapproved emoji');
    assert(emojiRun.stdout.includes('contains unapproved emojis'), 'reports unapproved emoji error message');
  } finally {
    if (fs.existsSync(tempEmojiFile)) fs.unlinkSync(tempEmojiFile);
  }

  // Approved emojis should pass
  const tempApprovedEmojiFile = path.join(ROOT, 'temp-approved-emoji-test.md');
  fs.writeFileSync(tempApprovedEmojiFile, '# Status Circles 🟢 and ✓\n', 'utf8');
  try {
    const approvedEmojiRun = runScript(scriptPath);
    assert(approvedEmojiRun.code === 0, 'validate-docs.js passes when file contains only approved emojis/symbols');
  } finally {
    if (fs.existsSync(tempApprovedEmojiFile)) fs.unlinkSync(tempApprovedEmojiFile);
  }

  // 2. Relative Markdown Links Check
  const tempLinkFile = path.join(ROOT, 'temp-link-test.md');
  fs.writeFileSync(tempLinkFile, '[Absolute Link](file:///C:/test.txt)\n', 'utf8');
  try {
    const linkRun = runScript(scriptPath);
    assert(linkRun.code === 1, 'validate-docs.js fails when file contains absolute file:// path');
    assert(linkRun.stdout.includes('Links must use relative repository paths'), 'reports link relative check error');
  } finally {
    if (fs.existsSync(tempLinkFile)) fs.unlinkSync(tempLinkFile);
  }

  // Windows absolute path
  fs.writeFileSync(tempLinkFile, '[Windows Path Link](D:\\test\\doc.md)\n', 'utf8');
  try {
    const linkRun = runScript(scriptPath);
    assert(linkRun.code === 1, 'validate-docs.js fails when file contains Windows absolute path link');
  } finally {
    if (fs.existsSync(tempLinkFile)) fs.unlinkSync(tempLinkFile);
  }

  // 3. AGENTS.md rule length limits
  const agentsMdFile = path.join(ROOT, 'AGENTS.md');
  let originalAgentsContent = null;
  const existedAgents = fs.existsSync(agentsMdFile);
  if (existedAgents) {
    originalAgentsContent = fs.readFileSync(agentsMdFile, 'utf8');
  }

  const longContent = Array(351).fill('# Rule line').join('\n');
  fs.writeFileSync(agentsMdFile, longContent, 'utf8');
  try {
    const lengthRun = runScript(scriptPath);
    assert(lengthRun.code === 1, 'validate-docs.js fails when AGENTS.md exceeds line limit (300 lines)');
    assert(lengthRun.stdout.includes('AGENTS.md has 351 lines, which exceeds the threshold'), 'reports rule length limit violation');
  } finally {
    if (existedAgents && originalAgentsContent !== null) {
      fs.writeFileSync(agentsMdFile, originalAgentsContent, 'utf8');
    } else if (fs.existsSync(agentsMdFile)) {
      fs.unlinkSync(agentsMdFile);
    }
  }
}

function testPapercuts() {
  console.log('Testing papercuts.js CLI...');
  const scriptPath = path.join(SDT_SCRIPTS_DIR, 'papercuts.js');
  const csvFile = path.join(ROOT, 'papercuts.csv');

  // Backup existing papercuts.csv
  let originalCsvContent = null;
  const existed = fs.existsSync(csvFile);
  if (existed) {
    originalCsvContent = fs.readFileSync(csvFile, 'utf8');
  }

  try {
    // Start with clean state (truncate/create empty CSV)
    if (fs.existsSync(csvFile)) fs.unlinkSync(csvFile);

    // 1. Add papercut
    const addRun1 = runScript(scriptPath, ['--add', '--file', 'non-existent-test-file.txt', '--scope', 'test', '--desc', '"Test papercut description"']);
    assert(addRun1.code === 0, 'papercuts.js --add runs successfully');
    assert(fs.existsSync(csvFile), 'creates papercuts.csv registry');

    let csvContent = fs.readFileSync(csvFile, 'utf8');
    assert(csvContent.includes('non-existent-test-file.txt'), 'logs the target file path');
    assert(csvContent.includes('Test papercut description'), 'logs the description');
    assert(csvContent.includes(',1\n') || csvContent.endsWith(',1\r\n') || csvContent.includes(',1\r'), 'sets initial frequency to 1');

    // 2. Add duplicate and increment frequency
    const addRun2 = runScript(scriptPath, ['--add', '--file', 'non-existent-test-file.txt', '--scope', 'test', '--desc', '"Test papercut description"']);
    assert(addRun2.code === 0, 'papercuts.js --add duplicates runs successfully');
    
    csvContent = fs.readFileSync(csvFile, 'utf8');
    assert(csvContent.includes(',2\n') || csvContent.endsWith(',2\r\n') || csvContent.includes(',2\r'), 'increments frequency to 2');

    // 3. Triage mode (auto-prune deleted/missing files)
    // Since non-existent-test-file.txt does not exist, running triage --force should prune it.
    const triageRun = runScript(scriptPath, ['--triage', '--force']);
    assert(triageRun.code === 0, 'papercuts.js --triage runs successfully');
    assert(triageRun.stdout.includes('[AUTO-PRUNED]'), 'automatically prunes row of missing file');

    const csvContentAfterTriage = fs.readFileSync(csvFile, 'utf8');
    assert(!csvContentAfterTriage.includes('non-existent-test-file.txt'), 'pruned file is removed from registry');

  } finally {
    // Restore original papercuts.csv
    if (existed && originalCsvContent !== null) {
      fs.writeFileSync(csvFile, originalCsvContent, 'utf8');
    } else if (fs.existsSync(csvFile)) {
      fs.unlinkSync(csvFile);
    }
  }
}

function runAll() {
  try {
    testMdToHtml();
    testValidateCommitMsg();
    testValidateDocs();
    testPapercuts();

    console.log(`\nAll solo-dev-toolkit tests complete: ${testsPassed} / ${testsRun} assertions passed.`);
    process.exit(0);
  } catch (err) {
    console.error(`\nToolkit test suite failed: ${err.message}`);
    process.exit(1);
  }
}

runAll();
