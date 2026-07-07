#!/usr/bin/env node
'use strict';

const path = require('path');
const { fork } = require('child_process');
const { RESET, RED } = require('../solo-dev-toolkit/scripts/cli-helpers');

const args = process.argv.slice(2);

const COMMANDS = {
  scan: './initial-codebase-scan.js',
  prepare: './prepare-native-execution.js',
  synthesize: './reports-synthesize.js',
  run: './run-adk-orchestrator.js',
  compile: './reports-compile.js'
};

if (args.length === 0) {
  printUsageAndExit('No subcommand provided.');
}

const subcommand = args[0];
const mappedScript = COMMANDS[subcommand];

if (!mappedScript) {
  printUsageAndExit(`Invalid subcommand: "${subcommand}".`);
}

// Ensure no other subcommand is passed as positional argument
for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('-')) {
    if (arg === '--report-path' || arg === '--report-style' || arg === '--tos-path' || arg === '--agent' || arg === '--pillar') {
      i++;
    }
  } else if (COMMANDS[arg]) {
    printUsageAndExit(`Conflicting subcommand "${arg}" detected. You can only execute one subcommand at a time.`);
  }
}

function printUsageAndExit(err) {
  if (err) {
    console.error(`${RED}✗ Error: ${err}${RESET}\n`);
  }
  console.log('Usage: node scripts/repo-wizard.js <subcommand> [options]');
  console.log('\nAvailable Subcommands:');
  console.log('  scan       Perform codebase sizing, stacking analysis, and pre-scan setup.');
  console.log('  prepare    Archive previous files, promote configurations, and unpack contracts and prompt data.');
  console.log('  synthesize Synthesize subagent observations into compiledAnalysis session payload.');
  console.log('  run        Run ADK InMemoryRunner subagent orchestration loop.');
  console.log('  compile    Compile technical reports, executive summaries, and backlog CSV deliverables.');
  console.log('\nExamples:');
  console.log('  node scripts/repo-wizard.js scan --report-path . --pillar QUALITY');
  console.log('  node scripts/repo-wizard.js prepare --report-path .');
  console.log('  node scripts/repo-wizard.js synthesize --redact');
  console.log('  node scripts/repo-wizard.js compile --report-path .');
  process.exit(1);
}

// Fork child process to preserve command line arguments for target scripts
const scriptPath = path.resolve(__dirname, mappedScript);
const childArgs = args.slice(1);
const child = fork(scriptPath, childArgs);

child.on('error', (err) => {
  console.error(`${RED}✗ Error: Failed to execute subcommand child process:${RESET}`, err.stack);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code === null ? 1 : code);
});
