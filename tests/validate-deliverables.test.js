'use strict';

const fs = require('fs');
const path = require('path');
const { SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-deliverables.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-deliverables.js');

  // Test 1: Run self-tests
  const selfTestRun = runScript(scriptPath, ['--test', '--mock-cli']);
  assert(selfTestRun.code === 0, 'validate-deliverables.js self-test (--test) exits with 0');
  assert(selfTestRun.stdout.includes('Self-test PASSED.'), 'validate-deliverables.js prints self-test success message');

  // Test 2: Run against empty/non-existent directory (should return 0 with notice)
  const emptyDirRun = runScript(scriptPath, ['--dir', '"./non-existent-deliverables"']);
  assert(emptyDirRun.code === 0, 'validate-deliverables.js handles non-existent directory with 0 exit code');
  assert(emptyDirRun.stdout.includes('Directory does not exist'), 'validate-deliverables.js prints directory not found notice');

  // Test 3: Integration test for Dynamic Sizing limits
  const tempTestDir = path.join(__dirname, 'temp_deliverables_integration_test');
  if (!fs.existsSync(tempTestDir)) {
    fs.mkdirSync(tempTestDir, { recursive: true });
  }

  try {
    // Write a short summary: ~60 words per section
    // Under XS (min 50 words), this is valid. Under L (min 500 words), this is invalid.
    const shortSummaryContent = `
# Executive Summary

## Section 1: Codebase Health & Strengths
*Short BLUF.*

**Overview:** Short Overview sentence.

### Technical Overview
This is a short paragraph containing authentic observations. We need to make sure this paragraph has enough words to cross the minimum threshold of fifty words for the extra small tier. By writing a few more sentences about the code quality, we successfully satisfy the validator and pass the integration test.

## Section 2: Tooling & Compliance Opportunities
*Short BLUF.*

**Overview:** Short Overview sentence.

### Technical Overview
This is a second technical overview paragraph for Section 2. We want to test that the validator correctly checks for compliance tools. By extending this description to cover linting, security scanning, and dependency management configurations, we easily exceed the fifty-word minimum constraint for small codebases. We add even more words here to ensure that we comfortably clear the limit under all testing scenarios.

## Section 3: Rollout Roadmap
*Short BLUF.*

**Overview:** Short Overview sentence.

### Technical Overview
This is a third technical overview paragraph for Section 3. We detail the roadmap phases here, including short-term quick wins and longer-term high-value projects. This ensures the section has a realistic amount of content and easily crosses the fifty-word minimum limit required by the XS size category.

## Section 4: Conclusions
Some final conclusion paragraphs go here.

Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.
`;
    fs.writeFileSync(path.join(tempTestDir, 'myrepo-executive-summary.md'), shortSummaryContent);

    // 3a. Case XS: Should pass
    fs.writeFileSync(path.join(tempTestDir, 'session.json'), JSON.stringify({ repoSize: 'XS' }));
    const runXS = runScript(scriptPath, ['--dir', `"${tempTestDir}"`]);
    assert(runXS.code === 0, 'XS sizing (min 50 words) passes validation with short summary');

    // 3b. Case L: Should fail due to word count
    fs.writeFileSync(path.join(tempTestDir, 'session.json'), JSON.stringify({ repoSize: 'L' }));
    const runL = runScript(scriptPath, ['--dir', `"${tempTestDir}"`]);
    assert(runL.code === 1, 'L sizing (min 500 words) fails validation with short summary');
    assert(runL.stdout.includes('Technical Overview word count is'), 'L sizing outputs word count error message');

  } finally {
    fs.readdirSync(tempTestDir).forEach(f => fs.unlinkSync(path.join(tempTestDir, f)));
    fs.rmdirSync(tempTestDir);
  }
}

module.exports = { run };
