#!/usr/bin/env node
/**
 * scripts/validate-questionnaire.js
 *
 * Validates references/questionnaire-spec.json structure and business rules:
 * - Ensure it is valid JSON.
 * - Ensure category IDs and question IDs are unique and follow naming rules.
 * - Ensure dependsOn references valid question IDs.
 * - Ensure manifest mapping targets valid subagent keys from agent-registry.json.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { ROOT_DIR, COLORS } = require('./validation-helpers');
const { RESET, BOLD, GREEN, RED, BLUE } = COLORS;

const ROOT = ROOT_DIR;
const SPEC_PATH = path.join(ROOT, 'references', 'questionnaire-spec.json');
const REGISTRY_PATH = path.join(ROOT, 'agents', 'agent-registry.json');

function validate() {
  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Checking questionnaire spec integrity...${RESET}`);

  if (!fs.existsSync(SPEC_PATH)) {
    console.error(`  ${RED}✗${RESET}  Missing questionnaire-spec.json`);
    process.exit(1);
  }

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
  } catch (err) {
    console.error(`  ${RED}✗${RESET}  Failed to parse questionnaire-spec.json: ${err.message}`);
    process.exit(1);
  }

  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (err) {
    console.error(`  ${RED}✗${RESET}  Failed to parse agent-registry.json: ${err.message}`);
    process.exit(1);
  }

  const validAgentKeys = new Set(Object.keys(registry));
  const categoryIds = new Set();
  const questionMap = new Map(); // id -> question object
  const errors = [];

  // Basic layout validation
  if (!spec.categories || !Array.isArray(spec.categories)) {
    errors.push("Root JSON must contain a 'categories' array.");
  }

  if (errors.length > 0) {
    printErrorsAndExit(errors);
  }

  // Phase 1: Collect categories and questions, validate naming/uniqueness
  for (const category of spec.categories) {
    if (!category.id || typeof category.id !== 'string') {
      errors.push(`Category missing string ID.`);
      continue;
    }
    if (categoryIds.has(category.id)) {
      errors.push(`Duplicate category ID found: "${category.id}"`);
    }
    categoryIds.add(category.id);

    if (!category.title || typeof category.title !== 'string') {
      errors.push(`Category "${category.id}" is missing a title.`);
    }

    if (!category.questions || !Array.isArray(category.questions)) {
      errors.push(`Category "${category.id}" must contain a 'questions' array.`);
      continue;
    }

    for (const q of category.questions) {
      if (!q.id || typeof q.id !== 'string') {
        errors.push(`Question in category "${category.id}" is missing an ID.`);
        continue;
      }
      if (questionMap.has(q.id)) {
        errors.push(`Duplicate question ID found: "${q.id}"`);
      }
      questionMap.set(q.id, q);

      if (!q.phrasing || typeof q.phrasing !== 'string') {
        errors.push(`Question "${q.id}" is missing phrasing text.`);
      }

      const validTypes = ['single-select', 'multi-select', 'boolean', 'text'];
      if (!q.type || !validTypes.includes(q.type)) {
        errors.push(`Question "${q.id}" has an invalid type: "${q.type}". Must be one of ${JSON.stringify(validTypes)}.`);
      }

      if ((q.type === 'single-select' || q.type === 'multi-select') && (!q.options || !Array.isArray(q.options))) {
        errors.push(`Selectable question "${q.id}" must contain an 'options' array.`);
      }
    }
  }

  // Phase 2: Validate logical rules (dependsOn and mapping targets)
  for (const q of questionMap.values()) {
    // Check dependsOn link exists
    if (q.dependsOn) {
      const parentId = q.dependsOn.questionId;
      if (!parentId) {
        errors.push(`Question "${q.id}" has a dependsOn rule missing 'questionId'.`);
      } else if (!questionMap.has(parentId)) {
        errors.push(`Question "${q.id}" depends on non-existent question ID: "${parentId}".`);
      }
    }

    // Check mapping manifest subagents
    if (q.mapping && q.mapping.manifest && q.mapping.manifest.contracts) {
      const contracts = Object.keys(q.mapping.manifest.contracts);
      for (const agentKey of contracts) {
        if (!validAgentKeys.has(agentKey)) {
          errors.push(`Question "${q.id}" maps to non-existent subagent contract: "${agentKey}".`);
        }
      }
    }
  }

  if (errors.length > 0) {
    printErrorsAndExit(errors);
  }

  console.log(`  ${GREEN}✓${RESET}  references/questionnaire-spec.json is structurally and semantically valid.`);
  console.log(`\n${BOLD}${GREEN}All questionnaire validation checks passed successfully!${RESET}\n`);
}

function printErrorsAndExit(errors) {
  console.log(`  ${RED}✗  Questionnaire validation failed with ${errors.length} error(s):${RESET}`);
  for (const err of errors) {
    console.log(`       ${RED}ERROR:${RESET} ${err}`);
  }
  process.exit(1);
}

validate();
