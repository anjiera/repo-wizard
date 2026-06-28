#!/usr/bin/env node
/**
 * solo-dev-toolkit/scripts/sdt-install-hooks.js
 *
 * Automatically installs native Git commit-msg hooks in the repository.
 * This enforces Conventional Commit styling on commit messages.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const HOOKS_DIR = path.join(ROOT, '.git', 'hooks');
const COMMIT_MSG_HOOK = path.join(HOOKS_DIR, 'commit-msg');

const commitMsgContent = `#!/bin/sh
# Run Conventional Commit validation on the commit message
node solo-dev-toolkit/scripts/validate-commit-msg.js "$1"

if [ $? -ne 0 ]; then
  echo "✗ Commit aborted."
  exit 1
fi

exit 0
`;

function main() {
  if (!fs.existsSync(HOOKS_DIR)) {
    console.error(`ERROR: .git/hooks directory not found at ${HOOKS_DIR}`);
    console.error('Make sure you are in a Git repository before installing hooks.');
    process.exit(1);
  }

  try {
    fs.writeFileSync(COMMIT_MSG_HOOK, commitMsgContent.replace(/\r\n/g, '\n'), { mode: 0o755 });
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(COMMIT_MSG_HOOK, '755');
      } catch (err) {}
    }
    console.log('✓ Native git commit-msg hook installed successfully at .git/hooks/commit-msg');
  } catch (err) {
    console.error(`ERROR: Failed to write git hooks: ${err.message}`);
    process.exit(1);
  }
}

main();
