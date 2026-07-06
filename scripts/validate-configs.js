#!/usr/bin/env node
/**
 * scripts/validate-configs.js
 *
 * Zero-dependency validation check for core configuration JSON files:
 * - plugin.json
 * - agents/agent-registry.json
 * - references/legally-dubious-words.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

const ROOT = path.resolve(__dirname, '..');
const PLUGIN_PATH = path.join(ROOT, 'plugin.json');
const REGISTRY_PATH = path.join(ROOT, 'agents', 'agent-registry.json');
const WORDS_PATH = path.join(ROOT, 'references', 'legally-dubious-words.json');

function validate() {
  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Checking configuration files integrity...${RESET}`);

  const errors = [];

  // 1. Validate plugin.json
  if (!fs.existsSync(PLUGIN_PATH)) {
    errors.push("Missing plugin.json at root.");
  } else {
    try {
      const plugin = JSON.parse(fs.readFileSync(PLUGIN_PATH, 'utf8'));
      if (typeof plugin !== 'object' || plugin === null || Array.isArray(plugin)) {
        errors.push("plugin.json: Root must be a JSON object.");
      } else {
        if (typeof plugin.name !== 'string' || !plugin.name) {
          errors.push("plugin.json: 'name' must be a non-empty string.");
        }
        if (typeof plugin.version !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/.test(plugin.version)) {
          errors.push(`plugin.json: 'version' must be a valid semantic version string. Got: "${plugin.version}"`);
        }
        if (typeof plugin.description !== 'string' || !plugin.description) {
          errors.push("plugin.json: 'description' must be a non-empty string.");
        }
        const allowedKeys = ['name', 'version', 'description'];
        for (const k of Object.keys(plugin)) {
          if (!allowedKeys.includes(k)) {
            errors.push(`plugin.json: unexpected property "${k}".`);
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to parse plugin.json: ${err.message}`);
    }
  }

  // 2. Validate agents/agent-registry.json
  if (!fs.existsSync(REGISTRY_PATH)) {
    errors.push("Missing agents/agent-registry.json.");
  } else {
    try {
      const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
      if (typeof registry !== 'object' || registry === null || Array.isArray(registry)) {
        errors.push("agents/agent-registry.json: Root must be a JSON object.");
      } else {
        const allowedPillars = ['QUALITY', 'SECURITY', 'ARCHITECTURE', 'PERFORMANCE', 'ORCHESTRATOR', 'HELPER'];
        const allowedColors = ['WHITE', 'YELLOW', 'GREEN', 'BLUE'];

        for (const [agentKey, spec] of Object.entries(registry)) {
          if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
            errors.push(`agent-registry.json: key "${agentKey}" must map to a spec object.`);
            continue;
          }

          // Check required fields
          const requiredFields = ['title', 'description', 'pillar', 'alias', 'color', 'mockCapability', 'mockTool', 'command', 'reference', 'permissions'];
          for (const field of requiredFields) {
            if (!(field in spec)) {
              errors.push(`agent-registry.json: agent "${agentKey}" is missing required property "${field}".`);
            }
          }

          // Additional properties check
          for (const k of Object.keys(spec)) {
            if (!requiredFields.includes(k)) {
              errors.push(`agent-registry.json: agent "${agentKey}" has unexpected property "${k}".`);
            }
          }

          // Validate values & types
          if ('title' in spec && (typeof spec.title !== 'string' || !spec.title)) {
            errors.push(`agent-registry.json: agent "${agentKey}" title must be a non-empty string.`);
          }
          if ('description' in spec && (typeof spec.description !== 'string' || !spec.description)) {
            errors.push(`agent-registry.json: agent "${agentKey}" description must be a non-empty string.`);
          }
          if ('alias' in spec && (typeof spec.alias !== 'string' || !spec.alias)) {
            errors.push(`agent-registry.json: agent "${agentKey}" alias must be a non-empty string.`);
          }
          if ('pillar' in spec && !allowedPillars.includes(spec.pillar)) {
            errors.push(`agent-registry.json: agent "${agentKey}" pillar "${spec.pillar}" is invalid. Allowed: ${JSON.stringify(allowedPillars)}`);
          }
          if ('color' in spec && !allowedColors.includes(spec.color)) {
            errors.push(`agent-registry.json: agent "${agentKey}" color "${spec.color}" is invalid. Allowed: ${JSON.stringify(allowedColors)}`);
          }
          if ('mockCapability' in spec && spec.mockCapability !== null && typeof spec.mockCapability !== 'string') {
            errors.push(`agent-registry.json: agent "${agentKey}" mockCapability must be a string or null.`);
          }
          if ('mockTool' in spec && spec.mockTool !== null && typeof spec.mockTool !== 'string') {
            errors.push(`agent-registry.json: agent "${agentKey}" mockTool must be a string or null.`);
          }
          if ('command' in spec && spec.command !== null) {
            if (typeof spec.command !== 'string') {
              errors.push(`agent-registry.json: agent "${agentKey}" command must be a string or null.`);
            } else if (!spec.command.startsWith('/')) {
              errors.push(`agent-registry.json: agent "${agentKey}" command "${spec.command}" must start with a slash (/).`);
            }
          }
          if ('reference' in spec && spec.reference !== null && typeof spec.reference !== 'string') {
            errors.push(`agent-registry.json: agent "${agentKey}" reference must be a string or null.`);
          }
          if ('permissions' in spec && (typeof spec.permissions !== 'object' || spec.permissions === null || Array.isArray(spec.permissions))) {
            errors.push(`agent-registry.json: agent "${agentKey}" permissions must be a JSON object.`);
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to parse agents/agent-registry.json: ${err.message}`);
    }
  }

  // 3. Validate references/legally-dubious-words.json
  if (!fs.existsSync(WORDS_PATH)) {
    errors.push("Missing references/legally-dubious-words.json.");
  } else {
    try {
      const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
      if (typeof words !== 'object' || words === null || Array.isArray(words)) {
        errors.push("references/legally-dubious-words.json: Root must be a JSON object.");
      } else {
        if (!words.keywords || !Array.isArray(words.keywords)) {
          errors.push("legally-dubious-words.json: root JSON must contain a 'keywords' array of strings.");
        } else {
          for (let i = 0; i < words.keywords.length; i++) {
            if (typeof words.keywords[i] !== 'string' || !words.keywords[i]) {
              errors.push(`legally-dubious-words.json: keyword at index ${i} must be a non-empty string.`);
            }
          }
        }
        const allowedKeys = ['keywords'];
        for (const k of Object.keys(words)) {
          if (!allowedKeys.includes(k)) {
            errors.push(`legally-dubious-words.json: unexpected property "${k}".`);
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to parse references/legally-dubious-words.json: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`  ${RED}✗  Configuration files validation failed with ${errors.length} error(s):${RESET}`);
    for (const err of errors) {
      console.error(`       ${RED}ERROR:${RESET} ${err}`);
    }
    process.exit(1);
  }

  console.log(`  ${GREEN}✓${RESET}  All core configuration files match their defined rules.`);
  console.log(`\n${BOLD}${GREEN}All configuration validation checks passed successfully!${RESET}\n`);
}

validate();
