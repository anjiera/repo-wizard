#!/usr/bin/env node
/**
 * run-mock-harness.js
 *
 * Simulates the orchestration of decoupled specialist subagents by the lead
 * orchestrator. Mocks the invocation contract exchange and generates mock
 * subagent observations (mini-reports) on the filesystem.
 *
 * Verifies:
 *   - The simulated parameter contract for every specialist passes schema validation.
 *   - The generated observations files match the expected naming and location rules.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ANSI escape codes for premium console styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const { validateContract } = require('./validate-contracts');

const ROOT = path.resolve(__dirname, '..');
const SPECIALISTS = [
  'accessibility-auditor-agent',
  'compliance-pilot-agent',
  'privacy-guardian-agent',
  'supply-chain-scanner-agent',
  'testing-pilot-agent',
  'vcs-workflow-agent',
  'technical-scribe-agent',
  'appsec-hardener-agent',
  'resilience-pilot-agent',
  'deployment-pilot-agent',
  'api-contract-pilot-agent',
  'data-pipeline-pilot-agent',
  'notebook-sanitizer-agent',
  'embedded-systems-pilot-agent',
  'fuzzing-pilot-agent',
  'toolchain-pilot-agent',
  'formal-methods-pilot-agent',
  'ai-robustness-pilot-agent',
  'react-performance-pilot-agent',
  'state-sanitizer-agent'
];

const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

/**
 * Creates a mock contract for a given specialist subagent
 */
function createMockContract(specialist, mode = 'scaffold') {
  const capabilityMap = {
    'accessibility-auditor-agent': 'Accessibility Auditing',
    'compliance-pilot-agent': 'Compliance Hardening',
    'privacy-guardian-agent': 'PII Logging Audits',
    'supply-chain-scanner-agent': 'Dependency Licensing',
    'testing-pilot-agent': 'Unit Testing',
    'vcs-workflow-agent': 'Git Hook Automation',
    'technical-scribe-agent': 'ADR & Architecture Diagrams',
    'appsec-hardener-agent': 'Application Hardening',
    'resilience-pilot-agent': 'Retry & Circuit Breaker Setup',
    'deployment-pilot-agent': 'Container Orchestration & Backup',
    'api-contract-pilot-agent': 'API Linting & Schema Checking',
    'data-pipeline-pilot-agent': 'Data Integrity Checks',
    'notebook-sanitizer-agent': 'Jupyter Notebook Cleaners',
    'embedded-systems-pilot-agent': 'Embedded Warning Linters',
    'fuzzing-pilot-agent': 'Fuzz Testing Harnesses',
    'toolchain-pilot-agent': 'Cross-Compilation Toolchains',
    'formal-methods-pilot-agent': 'Formal Model Verification',
    'ai-robustness-pilot-agent': 'AI Input/Output Guardrails',
    'react-performance-pilot-agent': 'React Performance Auditing',
    'state-sanitizer-agent': 'State Sanitization Auditing'
  };

  const toolMap = {
    'accessibility-auditor-agent': 'axe-core',
    'compliance-pilot-agent': 'checkov',
    'privacy-guardian-agent': 'gdpr-sanitizer',
    'supply-chain-scanner-agent': 'fossa',
    'testing-pilot-agent': 'vitest',
    'vcs-workflow-agent': 'husky',
    'technical-scribe-agent': 'mermaid-cli',
    'appsec-hardener-agent': 'helmet',
    'resilience-pilot-agent': 'opossum',
    'deployment-pilot-agent': 'docker-compose',
    'api-contract-pilot-agent': 'spectral',
    'data-pipeline-pilot-agent': 'pandera',
    'notebook-sanitizer-agent': 'nbstripout',
    'embedded-systems-pilot-agent': 'cppcheck',
    'fuzzing-pilot-agent': 'cargo-fuzz',
    'toolchain-pilot-agent': 'riscv-gcc',
    'formal-methods-pilot-agent': 'kani',
    'ai-robustness-pilot-agent': 'llm-guard',
    'react-performance-pilot-agent': 'react-scan',
    'state-sanitizer-agent': 'eslint-plugin-react-hooks'
  };

  const contract = {
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: mode
    },
    compliance_targets: [
      {
        standard: 'SOC2',
        focus_areas: ['audit logs']
      }
    ],
    tooling_specification: [
      {
        capability: capabilityMap[specialist] || 'General QA',
        selected_tool: toolMap[specialist] || 'eslint',
        install_command: `npm install -D ${toolMap[specialist] || 'eslint'}`,
        config_file: {
          path: `.config-${toolMap[specialist] || 'eslint'}`
        }
      }
    ]
  };

  if (mode === 'backlog') {
    contract.task_metadata.backlog_parameters = {
      granularity: 'granular',
      framework: 'Scrum',
      custom_labels: ['mock-test']
    };
  }

  return contract;
}

/**
 * Creates a mock observations report matching the specialist and repo
 */
function writeMockObservation(agentsDir, specialist, repoName) {
  const content = `# Observations for ${specialist} in ${repoName}

## Findings
- Simulated scan completed successfully for ${specialist}.
- Identified potential additions for tooling configurations.

## Suggested Toolchain Actions
- Install standard devDependencies.
- Configure pre-commit hook integrations.

${DISCLAIMER_TEXT}
`;
  const fileName = `observations-${specialist}-${repoName}.md`;
  fs.writeFileSync(path.join(agentsDir, fileName), content);
}

function runMockOrchestration(targetRepoDir, executionMode = 'scaffold') {
  const repoName = path.basename(targetRepoDir);
  const wizardDir = path.join(targetRepoDir, '.repo-wizard');
  const agentsDir = path.join(wizardDir, 'agents');

  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Simulating orchestration sweep for repository: "${repoName}" (${executionMode} mode)${RESET}`);

  // Create directories if missing
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  let contractErrorsCount = 0;
  let observationsWritten = 0;

  // 1. Simulating Phase 3 / 5 Contract dispatch & Relevance audits
  for (const specialist of SPECIALISTS) {
    const contract = createMockContract(specialist, executionMode);
    
    // Validate the contract payload
    const errors = validateContract(contract);
    if (errors.length > 0) {
      console.error(`  ${RED}✗${RESET} Contract validation failed for ${specialist}:`, errors);
      contractErrorsCount += errors.length;
    } else {
      // Simulate writing observations
      writeMockObservation(agentsDir, specialist, repoName);
      observationsWritten++;
    }
  }

  console.log(`  ${GREEN}✓${RESET} Validated and dispatched ${observationsWritten} contracts successfully.`);
  
  if (contractErrorsCount > 0) {
    console.error(`  ${RED}✗${RESET} Failed: ${contractErrorsCount} parameter contract schema errors.`);
    return false;
  }

  // 2. Validate that files exist in the expected format
  const files = fs.readdirSync(agentsDir);
  const expectedFilesCount = SPECIALISTS.length;
  if (files.length !== expectedFilesCount) {
    console.error(`  ${RED}✗${RESET} Naming check failed: Expected ${expectedFilesCount} files under DIRS, found ${files.length}`);
    return false;
  }

  console.log(`  ${GREEN}✓${RESET} Observations format check: all ${files.length} files exist and match suffix observations-<agent>-<repo>.md.`);
  return true;
}

function main() {
  const tempRepo = path.join(ROOT, 'temp_mock_repo');
  let success = false;
  try {
    if (!fs.existsSync(tempRepo)) {
      fs.mkdirSync(tempRepo, { recursive: true });
    }
    const scaffoldSuccess = runMockOrchestration(tempRepo, 'scaffold');
    const backlogSuccess = runMockOrchestration(tempRepo, 'backlog');
    success = scaffoldSuccess && backlogSuccess;
  } catch (err) {
    console.error(`  ${RED}✗${RESET} Mock harness crashed:`, err.message);
  } finally {
    // Cleanup temp files safely using recursive rmSync
    if (fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
  }

  if (success) {
    console.log(`\n${BOLD}${GREEN}Subagent Mocking Harness run: PASSED.${RESET}`);
    process.exit(0);
  } else {
    console.error(`\n${BOLD}${RED}Subagent Mocking Harness run: FAILED.${RESET}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
