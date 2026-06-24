#!/usr/bin/env node
/**
 * scripts/validate-commit-msg.js
 *
 * Validates that the git commit message follows the Conventional Commits format.
 *
 * Pattern:
 *   type(scope)!: description
 *
 * Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 */

'use strict';

const fs = require('fs');
const path = require('path');

const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
  console.error('ERROR: No commit message file path provided.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const msgPath = path.isAbsolute(commitMsgFile) ? commitMsgFile : path.join(ROOT, commitMsgFile);

if (!fs.existsSync(msgPath)) {
  console.error(`ERROR: Commit message file not found at ${msgPath}`);
  process.exit(1);
}

const commitMsg = fs.readFileSync(msgPath, 'utf8').trim();

// Ignore comments (lines starting with #) and empty lines
const lines = commitMsg.split(/\r?\n/).filter(line => !line.startsWith('#'));
const cleanMsg = lines.join('\n').trim();

if (!cleanMsg) {
  // Empty commit message is rejected by Git itself, let it pass here
  process.exit(0);
}

// Ignore auto-generated merge/revert messages
if (cleanMsg.startsWith('Merge branch') || cleanMsg.startsWith('Merge pull request')) {
  process.exit(0);
}

// Regex for Conventional Commits
const CONVENTIONAL_COMMIT_REGEXP = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\([a-z0-9_.\-\/]+\))?!?: .{1,100}$/;

if (!CONVENTIONAL_COMMIT_REGEXP.test(cleanMsg.split('\n')[0])) {
  console.error('\n✗ Invalid commit message format.');
  console.error('  Your commit message must follow the Conventional Commits style:');
  console.error('  <type>(<scope>)!: <description>');
  console.error('\n  Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert');
  console.error('  Example: feat(api): add user registration endpoint\n');
  process.exit(1);
}

console.log('✓ Commit message format is valid.');
process.exit(0);
