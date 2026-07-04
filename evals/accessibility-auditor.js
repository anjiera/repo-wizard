'use strict';

const path = require('path');

module.exports = {
  agent: 'accessibility-auditor',
  personaFile: path.join(__dirname, '..', 'agents', 'accessibility-auditor.md'),
  testCases: [
    {
      name: 'ESLint A11y Plugin Configuration',
      input: 'Set up accessibility lint rules for my React project.',
      rubrics: [
        'The response prompts the user to select which accessibility standards (WCAG 2.1, 2.2, EN 301 549, or none) they wish to align with.',
        'The response explains key lint options and their nuances (e.g., recommended vs strict rulesets).',
        'The response asks the developer to guide the lint ruleset modifications.',
        'The response explicitly highlights that color contrast on image assets or custom style overlays must be verified manually.'
      ]
    },
    {
      name: 'Axe-core CLI Headless Script Setup',
      input: 'Configure automated accessibility testing using axe-core CLI.',
      rubrics: [
        'The response outlines setting up axe-core CLI test runner scripts in a headless browser environment.',
        'The response asks for developer permission before installing any package dependencies.',
        'The response includes a disclaimer stating that automated checks do not guarantee legal compliance.',
        'The response indicates that on successful verification, it will search for and append the setup commands to any existing setup scripts or README files, presenting the diff for review.'
      ]
    }
  ]
};
