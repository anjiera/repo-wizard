#!/usr/bin/env node
/**
 * validate-skills.js
 *
 * Validates every skill in skills/ against the required sections and schema.
 *
 * Checks:
 *   - SKILL.md exists in every skill directory
 *   - YAML frontmatter present with 'name' and 'description' fields
 *   - frontmatter 'name' matches the directory name
 *   - description does not exceed 1024 characters
 *   - required sections are present (Overview, When to Use, Core Process/Process, Common Rationalizations, Red Flags, Verification)
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

const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');
const MAX_DESCRIPTION_LENGTH = 1024;

// Sections every standard SKILL.md must contain.
const REQUIRED_SECTIONS = [
  ['## Overview'],
  ['## When to Use'],
  ['## Core Process', '## Process'],
  ['## Common Rationalizations'],
  ['## Red Flags'],
  ['## Verification'],
];

function parseFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;

  const result = {};
  let lastKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    const isIndented = /^[ \t]/.test(line);
    if (colonIdx !== -1 && !isIndented) {
      const key   = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key) {
        result[key] = value;
        lastKey = key;
      }
    } else if (lastKey && line.trim()) {
      result[lastKey] += '\n' + line.trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return result;
}

function validateSkill(dirName) {
  const errors = [];
  const skillPath = path.join(SKILLS_DIR, dirName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    errors.push('Missing SKILL.md');
    return { errors };
  }

  let content;
  try {
    content = fs.readFileSync(skillPath, 'utf8');
  } catch (err) {
    errors.push(`Unreadable SKILL.md: ${err.message}`);
    return { errors };
  }

  // Parse frontmatter
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors };
  }

  if (!fm.name) {
    errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== dirName) {
    errors.push(`Frontmatter name '${fm.name}' does not match directory name '${dirName}'`);
  }

  if (!fm.description) {
    errors.push("Frontmatter missing required field: 'description'");
  } else if (fm.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description is ${fm.description.length} chars — exceeds the ${MAX_DESCRIPTION_LENGTH}-char limit`);
  }

  // Check required sections
  for (const headings of REQUIRED_SECTIONS) {
    const found = headings.some(heading => content.includes(heading));
    if (!found) {
      errors.push(`Missing required section: ${headings[0]}`);
    }
  }

  // Honesty & Anti-Cheating Checks
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

  return { errors };
}

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`ERROR: skills directory not found at ${SKILLS_DIR}`);
    process.exit(1);
  }

  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
    .sort();

  let totalErrors = 0;

  for (const dirName of skillDirs) {
    const { errors } = validateSkill(dirName);
    totalErrors += errors.length;

    if (errors.length === 0) {
      console.log(`  ${GREEN}✓${RESET}  ${dirName}`);
    } else {
      console.log(`  ${RED}✗${RESET}  ${dirName}`);
      for (const msg of errors) {
        console.log(`       ${RED}ERROR:${RESET} ${msg}`);
      }
    }
  }

  if (totalErrors > 0) {
    console.log(`\n${BOLD}${RED}${skillDirs.length} skills checked — ${totalErrors} error(s) found${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}${skillDirs.length} skills checked — ${totalErrors} error(s) found${RESET}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`\nERROR: validate-skills failed unexpectedly: ${err.message}`);
  process.exit(1);
}
