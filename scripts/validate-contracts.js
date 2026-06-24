#!/usr/bin/env node
/**
 * validate-contracts.js
 *
 * Validates parameter contracts (JSON) passed between the lead orchestrator and
 * specialist subagents against the formal contract specifications.
 *
 * Can be run stand-alone with --test to execute its own self-test suite, or
 * imported/required as a helper module in other test scripts.
 */

'use strict';

// ANSI escape codes for premium console styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

/**
 * Validates a contract object against the schema.
 * Returns an array of error messages. Empty array means valid.
 */
function validateContract(contract) {
  const errors = [];

  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['Contract must be a valid JSON object.'];
  }

  // 1. Validate task_metadata
  if (!contract.task_metadata || typeof contract.task_metadata !== 'object' || Array.isArray(contract.task_metadata)) {
    errors.push('Missing or invalid "task_metadata" object.');
  } else {
    const meta = contract.task_metadata;
    
    if (!Array.isArray(meta.target_modules) || !meta.target_modules.every(m => typeof m === 'string')) {
      errors.push('task_metadata.target_modules must be an array of strings.');
    }
    if (typeof meta.language !== 'string' || !meta.language) {
      errors.push('task_metadata.language must be a non-empty string.');
    }
    if (typeof meta.build_system !== 'string' || !meta.build_system) {
      errors.push('task_metadata.build_system must be a non-empty string.');
    }
    if (typeof meta.execution_mode !== 'string' || !['scaffold', 'backlog'].includes(meta.execution_mode)) {
      errors.push('task_metadata.execution_mode must be either "scaffold" or "backlog".');
    }
    if (meta.budget_tier && !['free', 'premium'].includes(meta.budget_tier)) {
      errors.push('task_metadata.budget_tier must be either "free" or "premium".');
    }
    if (meta.execution_environments && (!Array.isArray(meta.execution_environments) || !meta.execution_environments.every(e => typeof e === 'string'))) {
      errors.push('task_metadata.execution_environments must be an array of strings.');
    }

    // Validate backlog_parameters if execution_mode is backlog
    if (meta.execution_mode === 'backlog') {
      if (!meta.backlog_parameters || typeof meta.backlog_parameters !== 'object' || Array.isArray(meta.backlog_parameters)) {
        errors.push('Missing "backlog_parameters" object under task_metadata for backlog mode.');
      } else {
        const bp = meta.backlog_parameters;
        if (typeof bp.granularity !== 'string' || !['granular', 'epic'].includes(bp.granularity)) {
          errors.push('backlog_parameters.granularity must be "granular" or "epic".');
        }
        if (typeof bp.framework !== 'string' || !['Scrum', 'Kanban'].includes(bp.framework)) {
          errors.push('backlog_parameters.framework must be "Scrum" or "Kanban".');
        }
        if (bp.custom_labels && (!Array.isArray(bp.custom_labels) || !bp.custom_labels.every(l => typeof l === 'string'))) {
          errors.push('backlog_parameters.custom_labels must be an array of strings.');
        }
      }
    }
  }

  // 2. Validate compliance_targets
  if (contract.compliance_targets !== undefined) {
    if (!Array.isArray(contract.compliance_targets)) {
      errors.push('compliance_targets must be an array.');
    } else {
      contract.compliance_targets.forEach((ct, idx) => {
        if (!ct || typeof ct !== 'object' || Array.isArray(ct)) {
          errors.push(`compliance_targets[${idx}] must be an object.`);
        } else {
          if (typeof ct.standard !== 'string' || !ct.standard) {
            errors.push(`compliance_targets[${idx}].standard must be a non-empty string.`);
          }
          if (!Array.isArray(ct.focus_areas) || !ct.focus_areas.every(f => typeof f === 'string')) {
            errors.push(`compliance_targets[${idx}].focus_areas must be an array of strings.`);
          }
        }
      });
    }
  }

  // 3. Validate tooling_specification
  if (contract.tooling_specification !== undefined) {
    if (!Array.isArray(contract.tooling_specification)) {
      errors.push('tooling_specification must be an array.');
    } else {
      contract.tooling_specification.forEach((ts, idx) => {
        if (!ts || typeof ts !== 'object' || Array.isArray(ts)) {
          errors.push(`tooling_specification[${idx}] must be an object.`);
        } else {
          if (typeof ts.capability !== 'string' || !ts.capability) {
            errors.push(`tooling_specification[${idx}].capability must be a non-empty string.`);
          }
          if (typeof ts.selected_tool !== 'string' || !ts.selected_tool) {
            errors.push(`tooling_specification[${idx}].selected_tool must be a non-empty string.`);
          }
          if (ts.install_command && typeof ts.install_command !== 'string') {
            errors.push(`tooling_specification[${idx}].install_command must be a string.`);
          }
          if (ts.config_file !== undefined) {
            if (!ts.config_file || typeof ts.config_file !== 'object' || Array.isArray(ts.config_file)) {
              errors.push(`tooling_specification[${idx}].config_file must be an object.`);
            } else {
              if (typeof ts.config_file.path !== 'string' || !ts.config_file.path) {
                errors.push(`tooling_specification[${idx}].config_file.path must be a non-empty string.`);
              }
              if (ts.config_file.ruleset && typeof ts.config_file.ruleset !== 'string') {
                errors.push(`tooling_specification[${idx}].config_file.ruleset must be a string.`);
              }
            }
          }
        }
      });
    }
  }

  return errors;
}

/**
 * Self-test suite for the contract validator
 */
function runSelfTest() {
  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Running contract validator self-test...${RESET}`);
  let failures = 0;

  const validContract = {
    task_metadata: {
      target_modules: ['/src/backend', '/src/frontend'],
      language: 'typescript',
      build_system: 'npm-vite',
      budget_tier: 'free',
      execution_environments: ['pre-commit', 'CI'],
      execution_mode: 'scaffold'
    },
    compliance_targets: [
      {
        standard: 'GDPR',
        focus_areas: ['PII logs scrubbing']
      }
    ],
    tooling_specification: [
      {
        capability: 'Static Application Security Testing',
        selected_tool: 'Semgrep',
        install_command: 'npm install -D semgrep',
        config_file: {
          path: '.semgrep.yaml',
          ruleset: 'p/security-audit'
        }
      }
    ]
  };

  const validBacklogContract = {
    task_metadata: {
      target_modules: ['/src'],
      language: 'javascript',
      build_system: 'npm',
      execution_mode: 'backlog',
      backlog_parameters: {
        granularity: 'granular',
        framework: 'Scrum',
        custom_labels: ['sprint-1']
      }
    }
  };

  const invalidContracts = [
    {
      description: 'Missing task_metadata',
      data: { compliance_targets: [] },
      expectedError: 'Missing or invalid "task_metadata"'
    },
    {
      description: 'Invalid execution_mode',
      data: {
        task_metadata: {
          target_modules: ['/'],
          language: 'python',
          build_system: 'pip',
          execution_mode: 'invalid-mode'
        }
      },
      expectedError: 'task_metadata.execution_mode'
    },
    {
      description: 'Missing backlog_parameters in backlog mode',
      data: {
        task_metadata: {
          target_modules: ['/'],
          language: 'python',
          build_system: 'pip',
          execution_mode: 'backlog'
        }
      },
      expectedError: 'Missing "backlog_parameters"'
    },
    {
      description: 'Malformed compliance standard',
      data: {
        task_metadata: {
          target_modules: ['/'],
          language: 'python',
          build_system: 'pip',
          execution_mode: 'scaffold'
        },
        compliance_targets: [
          { standard: '', focus_areas: [] } // Standard empty
        ]
      },
      expectedError: 'standard must be a non-empty string'
    }
  ];

  // Test Valid
  const validErrors = validateContract(validContract);
  if (validErrors.length > 0) {
    console.error(`  ${RED}✗${RESET} ${BOLD}Fail:${RESET} Valid scaffold contract was rejected:`, validErrors);
    failures++;
  } else {
    console.log(`  ${GREEN}✓${RESET} ${BOLD}Pass:${RESET} Valid scaffold contract accepted`);
  }

  const validBacklogErrors = validateContract(validBacklogContract);
  if (validBacklogErrors.length > 0) {
    console.error(`  ${RED}✗${RESET} ${BOLD}Fail:${RESET} Valid backlog contract was rejected:`, validBacklogErrors);
    failures++;
  } else {
    console.log(`  ${GREEN}✓${RESET} ${BOLD}Pass:${RESET} Valid backlog contract accepted`);
  }

  // Test Invalid
  for (const tc of invalidContracts) {
    const errs = validateContract(tc.data);
    const matched = errs.some(e => e.includes(tc.expectedError));
    if (errs.length > 0 && matched) {
      console.log(`  ${GREEN}✓${RESET} ${BOLD}Pass:${RESET} Invalid contract (${tc.description}) correctly caught with error matching "${tc.expectedError}"`);
    } else {
      console.error(`  ${RED}✗${RESET} ${BOLD}Fail:${RESET} Invalid contract (${tc.description}) was not correctly rejected. Errors found:`, errs);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n${BOLD}${RED}Self-test failed:${RESET} ${failures} case(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}All contract validator self-tests passed.${RESET}`);
    process.exit(0);
  }
}

if (require.main === module) {
  runSelfTest();
} else {
  module.exports = { validateContract };
}
