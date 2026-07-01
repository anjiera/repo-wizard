#!/usr/bin/env node
/**
 * scripts/patch-headless-mode.js
 *
 * Programmatically patches all standard subagents and skills in the repository
 * to support the headless mode overrides.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');
const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');

const EXEMPT_AGENTS = [
  'repo-wizard-agent.md',
  'legal-neutrality-agent.md',
  'tool-evaluator-agent.md',
  'tool-scaffolder-agent.md'
];

const EXEMPT_SKILLS = [
  'repo-wizard',
  'legal-neutrality-scanner',
  'remote-profiler'
];

// Patch Agents
if (fs.existsSync(AGENTS_DIR)) {
  const agents = fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('-agent.md') && !EXEMPT_AGENTS.includes(f));

  for (const agentFile of agents) {
    const filePath = path.join(AGENTS_DIR, agentFile);
    let content = fs.readFileSync(filePath, 'utf8');

    let modified = false;

    // Insert Step 1 override
    const step1Target = '## Step 1: Alignment & Target Stack';
    if (content.includes(step1Target) && !content.includes('Headless Mode Override:** If the lead orchestrator passes `MODE=HEADLESS_REMOTE`')) {
      content = content.replace(
        step1Target,
        `${step1Target}\n\n- **Headless Mode Override:** If the lead orchestrator passes \`MODE=HEADLESS_REMOTE\` or \`MODE=HEADLESS_LOCAL\`, bypass interactive alignment and use best-guess heuristics to infer target standards and stack based on existing code clues.`
      );
      modified = true;
    }

    // Insert Step 2 override
    const step2Target = '## Step 2: Codebase Scan & Auditing';
    if (content.includes(step2Target) && !content.includes('Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, skip scanning consent')) {
      content = content.replace(
        step2Target,
        `${step2Target}\n\n- **Headless Mode Override:** If \`MODE=HEADLESS_REMOTE\` or \`MODE=HEADLESS_LOCAL\` is active, skip scanning consent prompts and proceed directly to scanning using the specified Approach (A or B). If Approach B is active, enforce strict honest boundaries: output \`[Data Blocked: Requires Shallow Clone / Local Checkout to evaluate]\` for any unobservable details.`
      );
      modified = true;
    }

    // Insert Step 3 override
    const step3Target = '## Step 3: Interactive Scaffolding Guidance';
    if (content.includes(step3Target) && !content.includes('Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active, do not perform any file writes')) {
      content = content.replace(
        step3Target,
        `${step3Target}\n\n- **Headless Mode Override:** If \`MODE=HEADLESS_REMOTE\` or \`MODE=HEADLESS_LOCAL\` is active, do not perform any file writes or installations. Instead, output suggested configs, linter rules, or hook configurations directly in your report section.`
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ Patched agent: ${agentFile}`);
    } else {
      console.log(`  - Agent already patched: ${agentFile}`);
    }
  }
}

// Patch Skills
if (fs.existsSync(SKILLS_DIR)) {
  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory() && !EXEMPT_SKILLS.includes(d));

  for (const dir of skillDirs) {
    const filePath = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('Headless Mode Override:** If `MODE=HEADLESS_REMOTE` or `MODE=HEADLESS_LOCAL` is active')) {
      content = content.replace(
        /^(### Phase 1: [^\r\n]*)/m,
        `$1\n- **Headless Mode Override:** If \`MODE=HEADLESS_REMOTE\` or \`MODE=HEADLESS_LOCAL\` is active, skip interactive alignment and infer target standards and stack from the codebase.`
      );

      content = content.replace(
        /^(### Phase 2: [^\r\n]*)/m,
        `$1\n- **Headless Mode Override:** If \`MODE=HEADLESS_REMOTE\` or \`MODE=HEADLESS_LOCAL\` is active, skip interactive consent prompts. If Approach B is used, output \`[Data Blocked: Requires Shallow Clone / Local Checkout to evaluate]\` for unobservable details.`
      );

      const agentName = dir + '-agent';
      content = content.replace(
        /^(### Phase 3: [^\r\n]*)/m,
        `$1\n- **Headless Mode Override:** If \`MODE=HEADLESS_REMOTE\` or \`MODE=HEADLESS_LOCAL\` is active, do not invoke the environment configurer to modify files. Instead, write suggested toolchain additions, config file updates, or commit hooks into the generated markdown report Observations file at \`.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-${agentName}.md\`.`
      );

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ Patched skill: ${dir}`);
    } else {
      console.log(`  - Skill already patched: ${dir}`);
    }
  }
}
