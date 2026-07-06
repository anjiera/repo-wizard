#!/usr/bin/env node
/**
 * test-helpers.js
 *
 * Runs integration and unit tests for the helper validator scripts.
 * Modularized version that imports suites from tests/ directory.
 */

'use strict';

const { stats } = require('../tests/test-utils');

// Require all test suites
const validateAgents = require('../tests/validate-agents.test');
const validateCommands = require('../tests/validate-commands.test');
const validateSkills = require('../tests/validate-skills.test');
const validateDocs = require('../tests/validate-docs.test');
const adkRunner = require('../tests/adk-runner.test');
const validateDeliverables = require('../tests/validate-deliverables.test');
const reportStyling = require('../tests/report-styling.test');
const scanHelpers = require('../tests/scan-helpers.test');
const initialCodebaseScan = require('../tests/initial-codebase-scan.test');
const validateScripts = require('../tests/validate-scripts.test');
const validateContracts = require('../tests/validate-contracts.test');
const registerPlugin = require('../tests/register-plugin.test');
const redactor = require('../tests/redactor.test');

function runAll() {
  try {
    validateAgents.run();
    validateCommands.run();
    validateSkills.run();
    validateDocs.run();
    adkRunner.run();
    validateDeliverables.run();
    reportStyling.run();
    scanHelpers.run();
    initialCodebaseScan.run();
    validateScripts.run();
    validateContracts.run();
    registerPlugin.run();
    redactor.run();

    console.log(`\nAll helper validator tests complete: ${stats.testsPassed} / ${stats.testsRun} assertions passed.`);
    process.exit(0);
  } catch (err) {
    console.error(`\nTest suite failed: ${err.message}`);
    process.exit(1);
  }
}

runAll();
