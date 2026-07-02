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

// ANSI escape codes for premium console styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');
const EVALS_FILE = path.resolve(__dirname, 'run-evals.js');
const MAPPINGS_FILE = path.resolve(__dirname, '..', 'agents', 'agent-quality-pillar-mappings.json');
const { QUALITY_PILLARS } = require('./quality-pillars');
const { TEAM_COLORS } = require('./report-constants');

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

  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Checking agent evaluation coverage...${RESET}`);

  for (const file of agentFiles) {
    const fullPath = path.join(AGENTS_DIR, file);
    const resolvedPath = path.resolve(fullPath);
    
    // Find matching suite by resolving paths
    const matchingSuite = TEST_SUITE.find(suite => {
      const suitePath = path.resolve(suite.personaFile);
      return suitePath === resolvedPath;
    });

    if (!matchingSuite) {
      console.log(`  ${RED}✗${RESET}  ${file} — No evaluation test suite defined in run-evals.js`);
      totalErrors++;
      continue;
    }

    const errors = [];

    // Quality Pillar & Team Color mapping validation
    const agentKey = file.replace(/\.md$/, '');
    if (!fs.existsSync(MAPPINGS_FILE)) {
      errors.push('Missing agent-quality-pillar-mappings.json file.');
    } else {
      let mappings;
      try {
        mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
      } catch (err) {
        errors.push(`Failed to parse agent-quality-pillar-mappings.json: ${err.message}`);
      }

      if (mappings) {
        const mapping = mappings[agentKey];
        if (!mapping) {
          errors.push(`Missing entry in agent-quality-pillar-mappings.json for agent key "${agentKey}".`);
        } else {
          if (!mapping.pillar || !QUALITY_PILLARS[mapping.pillar]) {
            errors.push(`Invalid or missing Quality Pillar key: "${mapping.pillar || 'none'}"`);
          }
          if (!mapping.color || !TEAM_COLORS[mapping.color]) {
            errors.push(`Invalid or missing Cybersecurity Team Color key: "${mapping.color || 'none'}"`);
          }
        }
      }
    }

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

    // Scan agent file contents for structure, prompt injection, and cheating patterns
    try {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Honesty & Anti-Cheating Checks (run on ALL agents)
      const CHEATING_INJECTION_PATTERNS = [
        {
          regex: /(?:ignore|bypass)\s+(?:the\s+)?(?:validation|checks|rules|consent|tos)/i,
          message: "Suspicious instruction to ignore/bypass active validation checks, consent gates, or rules."
        },
        {
          regex: /pretend\s+(?:the\s+)?(?:scan|check|validation)/i,
          message: "Suspicious instruction to pretend a scan or check was executed."
        },
        {
          regex: /always\s+(?:output|return|report)\s+(?:success|completed|passed)/i,
          message: "Directive telling the agent to always report success regardless of execution state."
        },
        {
          regex: /do\s+not\s+(?:perform|run)\s+(?:real|actual)\s+(?:scanning|checks|auditing)/i,
          message: "Instruction telling the agent to skip real scanning/auditing."
        }
      ];

      const SUSPICIOUS_STATIC_PATTERNS = [
        {
          regex: /always\s+(?:output|write)\s+(?:exactly|the following)/i,
          message: "Suspicious directive telling the agent to output a static pre-written response."
        },
        {
          regex: /use\s+(?:the\s+)?(?:following\s+)?(?:mock|dummy|placeholder|fake)\s+(?:content|report|summary|text)/i,
          message: "Instruction suggesting the use of hardcoded mock, dummy, or placeholder report data."
        }
      ];

      for (const pattern of CHEATING_INJECTION_PATTERNS) {
        if (pattern.regex.test(content)) {
          errors.push(`[Honesty Check Failed] ${pattern.message} (Matched pattern: ${pattern.regex})`);
        }
      }

      for (const pattern of SUSPICIOUS_STATIC_PATTERNS) {
        if (pattern.regex.test(content)) {
          errors.push(`[Honesty Check Failed] ${pattern.message} (Matched pattern: ${pattern.regex})`);
        }
      }

      // Structural validations for execution agents (excluding helpers/orchestrators)
      const EXEMPT_AGENTS = [
        'repo-wizard-agent.md',
        'legal-neutrality-agent.md',
        'tool-evaluator-agent.md',
        'tool-scaffolder-agent.md'
      ];

      if (!EXEMPT_AGENTS.includes(file)) {
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
      }
    } catch (err) {
      errors.push(`Failed to read agent file: ${err.message}`);
    }

    if (errors.length === 0) {
      console.log(`  ${GREEN}✓${RESET}  ${file}`);
    } else {
      console.log(`  ${RED}✗${RESET}  ${file}`);
      for (const msg of errors) {
        console.log(`       ${RED}ERROR:${RESET} ${msg}`);
      }
      totalErrors += errors.length;
    }
  }

  if (totalErrors > 0) {
    console.log(`\n${BOLD}${RED}${agentFiles.length} agent personas checked — ${totalErrors} error(s) found${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}${agentFiles.length} agent personas checked — ${totalErrors} error(s) found${RESET}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`\nERROR: validate-agents failed unexpectedly: ${err.message}`);
  process.exit(1);
}
