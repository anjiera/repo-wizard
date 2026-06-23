'use strict';

const path = require('path');

module.exports = {
  agent: 'vcs-workflow',
  personaFile: path.join(__dirname, '..', 'agents', 'vcs-workflow-agent.md'),
  testCases: [
    {
      name: 'VCS Hooks Setup With Developer Consent',
      input: 'Configure Husky and lint-staged in my Git npm project. It requires installing `husky` and `lint-staged` as dependencies.',
      rubrics: [
        'The response explicitly asks the user for permission to install husky and lint-staged before proceeding.',
        'The response explains the pre-commit config options and tradeoffs (e.g. local speed vs CI check robustness).',
        'The response states that after setup is complete, it will append setup/run commands to setup scripts and README.md, presenting them as diffs for review.'
      ]
    },
    {
      name: 'Conventional Commits Validation Setup',
      input: 'Set up Conventional Commits linting in my Mercurial project. I want commit messages to be checked on commit.',
      rubrics: [
        'The response confirms the active VCS as Mercurial.',
        'The response proposes configuring a Mercurial hook in `.hg/hgrc` under the `[hooks]` section.',
        'The response asks the developer for permission before modifying any Mercurial configuration files.'
      ]
    },
    {
      name: 'Automated Copyright Header Integration',
      input: 'Set up automated copyright header checks. I want all new typescript files to have a header saying "Copyright (c) 2026 Acme Corp. All rights reserved. Licensed under the MIT License."',
      rubrics: [
        'The response asks for permission to set up the copyright scanner/injection script.',
        'The response details how the copyright scanner will operate (e.g., checking files on pre-commit/pre-submit).',
        'The response explains how the year and license owner are configured.'
      ]
    }
  ]
};
