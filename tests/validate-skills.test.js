'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, SCRIPTS_DIR, assert, runScript } = require('./test-utils');

function run() {
  console.log('Testing validate-skills.js...');
  const scriptPath = path.join(SCRIPTS_DIR, 'validate-skills.js');

  // Test 1: Run in current healthy state
  const healthyRun = runScript(scriptPath);
  assert(healthyRun.code === 0, 'validate-skills.js exits with 0 on healthy repository');

  // Test 2: Create a skill with missing sections
  const tempSkillDir = path.join(ROOT, 'skills', 'temp-bad-skill');
  fs.mkdirSync(tempSkillDir, { recursive: true });
  const badSkillContent = `---
name: temp-bad-skill
description: Skill missing required sections
---
## Overview
`;
  fs.writeFileSync(path.join(tempSkillDir, 'SKILL.md'), badSkillContent);

  try {
    const unhealthyRun = runScript(scriptPath);
    assert(unhealthyRun.code === 1, 'validate-skills.js exits with 1 when a skill is missing sections');
    assert(unhealthyRun.stdout.includes('Missing required section: ## When to Use'),
      'validate-skills.js prints correct missing section error');
  } finally {
    if (fs.existsSync(path.join(tempSkillDir, 'SKILL.md'))) fs.unlinkSync(path.join(tempSkillDir, 'SKILL.md'));
    if (fs.existsSync(tempSkillDir)) fs.rmdirSync(tempSkillDir);
  }
}

module.exports = { run };
