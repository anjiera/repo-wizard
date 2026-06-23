#!/usr/bin/env node
/**
 * validate-agents.js
 *
 * Validates that every agent persona file in agents/ has corresponding
 * evaluation tests and rubrics defined in run-evals.js.
 *
 * Checks:
 *   - Every *-agent.md file has a matching test suite in run-evals.js
 *   - The matching test suite has at least one test case
 *   - Every test case has at least one rubric
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');
const EVALS_FILE = path.resolve(__dirname, 'run-evals.js');

function main() {
  if (!fs.existsSync(AGENTS_DIR)) {
    console.error(`ERROR: agents directory not found at ${AGENTS_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(EVALS_FILE)) {
    console.error(`ERROR: run-evals.js not found at ${EVALS_FILE}`);
    process.exit(1);
  }

  // Load registered test suites
  let TEST_SUITE;
  try {
    const evalsModule = require(EVALS_FILE);
    TEST_SUITE = evalsModule.TEST_SUITE;
  } catch (err) {
    console.error(`ERROR: Failed to load TEST_SUITE from run-evals.js: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(TEST_SUITE)) {
    console.error('ERROR: TEST_SUITE is not exported or is not an array in run-evals.js');
    process.exit(1);
  }

  const agentFiles = fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('-agent.md'))
    .sort();

  let totalErrors = 0;

  console.log('Checking agent evaluation coverage...');

  for (const file of agentFiles) {
    const fullPath = path.join(AGENTS_DIR, file);
    const resolvedPath = path.resolve(fullPath);
    
    // Find matching suite by resolving paths
    const matchingSuite = TEST_SUITE.find(suite => {
      const suitePath = path.resolve(suite.personaFile);
      return suitePath === resolvedPath;
    });

    if (!matchingSuite) {
      console.log(`  ✗  ${file} — No evaluation test suite defined in run-evals.js`);
      totalErrors++;
      continue;
    }

    const errors = [];
    if (!Array.isArray(matchingSuite.testCases) || matchingSuite.testCases.length === 0) {
      errors.push('No test cases defined in testCases array');
    } else {
      matchingSuite.testCases.forEach((tc, idx) => {
        if (!tc.name) {
          errors.push(`Test case at index ${idx} is missing a 'name'`);
        }
        if (!tc.input) {
          errors.push(`Test case "${tc.name || idx}" is missing 'input'`);
        }
        if (!Array.isArray(tc.rubrics) || tc.rubrics.length === 0) {
          errors.push(`Test case "${tc.name || idx}" has no rubrics defined`);
        }
      });
    }

    // Structural validations for execution agents
    const EXEMPT_AGENTS = [
      'repo-wizard-agent.md',
      'legal-neutrality-agent.md',
      'tool-evaluator-agent.md',
      'tool-scaffolder-agent.md'
    ];

    if (!EXEMPT_AGENTS.includes(file)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');

        if (!content.includes('## Step 1: Alignment & Target Stack')) {
          errors.push("Missing exact header: '## Step 1: Alignment & Target Stack'");
        }
        if (!content.includes('## Step 2: Codebase Scan & Auditing')) {
          errors.push("Missing exact header: '## Step 2: Codebase Scan & Auditing'");
        }
        if (!content.includes('## Step 3: Interactive Scaffolding Guidance')) {
          errors.push("Missing exact header: '## Step 3: Interactive Scaffolding Guidance'");
        }
        if (!content.includes('### 3.1 Developer Consent & Interactive Review')) {
          errors.push("Missing exact subheading: '### 3.1 Developer Consent & Interactive Review'");
        }

        const controlsScopeRegex = /### 3\.2 .*(?:Controls )?Scope/i;
        if (!controlsScopeRegex.test(content)) {
          errors.push("Missing subheading pattern matching '### 3.2 ... Scope'");
        }

        if (!content.includes('### 3.3 Safety & Rollback')) {
          errors.push("Missing exact subheading: '### 3.3 Safety & Rollback'");
        }
        if (!content.includes('scaffolding-robustness-protocol.md')) {
          errors.push("Missing link reference to '../references/scaffolding-robustness-protocol.md'");
        }
      } catch (err) {
        errors.push(`Failed to read agent file: ${err.message}`);
      }
    }

    if (errors.length === 0) {
      console.log(`  ✓  ${file}`);
    } else {
      console.log(`  ✗  ${file}`);
      for (const msg of errors) {
        console.log(`       ERROR: ${msg}`);
      }
      totalErrors += errors.length;
    }
  }

  console.log(`\n${agentFiles.length} agent personas checked — ${totalErrors} error(s) found`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (err) {
  console.error(`\nERROR: validate-agents failed unexpectedly: ${err.message}`);
  process.exit(1);
}
