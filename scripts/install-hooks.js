#!/usr/bin/env node
/**
 * scripts/install-hooks.js
 *
 * Automatically installs native Git pre-commit hooks in the repository.
 * This runs the fast validation scripts and unit/E2E test suite locally
 * before commits are allowed.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOOKS_DIR = path.join(ROOT, '.git', 'hooks');
const PRE_COMMIT_HOOK = path.join(HOOKS_DIR, 'pre-commit');

const preCommitContent = `#!/bin/sh
# Run fast-running structural validations and local test suites
echo "Running pre-commit validations..."
node scripts/validate-skills.js && \
node scripts/validate-commands.js && \
node scripts/validate-agents.js && \
node scripts/validate-docs.js && \
node scripts/test-helpers.js && \
node solo-dev-toolkit/scripts/sdt-test-helpers.js && \
node scripts/run-e2e-tests.js

if [ $? -ne 0 ]; then
  echo "✗ Pre-commit hook validation failed. Commit aborted."
  exit 1
fi

echo "✓ Pre-commit checks passed."
exit 0
`;

function main() {
  if (!fs.existsSync(HOOKS_DIR)) {
    console.error(`ERROR: .git/hooks directory not found at ${HOOKS_DIR}`);
    console.error('Make sure you are in a Git repository before installing hooks.');
    process.exit(1);
  }

  try {
    fs.writeFileSync(PRE_COMMIT_HOOK, preCommitContent.replace(/\r\n/g, '\n'), { mode: 0o755 });
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(PRE_COMMIT_HOOK, '755');
      } catch (err) {}
    }
    console.log('✓ Native git pre-commit hook installed successfully at .git/hooks/pre-commit');
  } catch (err) {
    console.error(`ERROR: Failed to write git hooks: ${err.message}`);
    process.exit(1);
  }
}

main();
