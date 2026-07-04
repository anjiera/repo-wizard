'use strict';

const path = require('path');

module.exports = {
  agent: 'repo-wizard',
  personaFile: path.join(__dirname, '..', 'agents', 'repo-wizard.md'),
  testCases: [
    {
      name: 'Legal Terms and Consent Gate Trigger',
      input: 'Can you onboarding my repository? I am running the wizard for the first time with no prior setup.',
      rubrics: [
        'The response presents the Terms of Service & Developer Agreement text to the user.',
        'The response halts execution and prompts the user to accept the disclaimer before proceeding.'
      ]
    },
    {
      name: 'Large Codebase Incremental Adoption Trigger',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, can you set up my repository? It is a Gradle Kotlin project. The LOC counting script output indicates that the codebase size exceeds the incremental adoption threshold configured in report-constants.js.',
      rubrics: [
        'The response prompts the developer with the Incremental Adoption Question due to the LOC exceeding the threshold configured in report-constants.js.',
        'The response contains the mandatory upfront safety disclaimer.'
      ]
    },
    {
      name: 'History Archiving On Fresh Start',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, we have an active session found on disk. I would like to choose "Start Fresh". Let\'s begin.',
      rubrics: [
        'The response explicitly states that the previous session.json and <repo-name>-full-report.md configurations will be archived to history/ with a timestamp before clearing.'
      ]
    },
    {
      name: 'Backlog Mode Selection & Deliverables',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, let\'s start. I would like to configure my repository using the "backlog" execution mode. I want granular task stories and we use Scrum.',
      rubrics: [
        'The response acknowledges the backlog execution mode toggle.',
        'The response mentions exporting a CSV backlog (.repo-wizard/reports/<repo-name>/backlog.csv), a full technical report (<repo-name>-full-report.md / .html), and a constructive 3-section executive summary (<repo-name>-executive-summary.md / .html).',
        'The response acknowledges the Scrum planning framework and granularity.'
      ]
    },
    {
      name: 'Headless Remote Mode URL Routing',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, please run the repository wizard on this remote URL: https://github.com/myorg/myproject',
      rubrics: [
        'The response detects the URL parameter and sets MODE=HEADLESS_REMOTE.',
        'The response defaults to executing a shallow clone (Approach A) instead of prompting to choose between Approach A and B.'
      ]
    },
    {
      name: 'Headless Local Mode Parameter Routing',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, please run /repo-wizard headless on my current workspace directory.',
      rubrics: [
        'The response detects the headless parameter and sets MODE=HEADLESS_LOCAL.',
        'The response acknowledges executing a non-blocking, best-guess codebase scan.'
      ]
    },
    {
      name: 'Headless Mode observations-<repo-name-here> deliverables & mismatch hook',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, we are running in headless mode on a remote repo named myproject. It has weekend hobby code and lacks testing frameworks but handles sensitive payment data. What reports will you generate?',
      rubrics: [
        'The response states it will generate observations, full report, and executive summary reports prefixed with the repository name (e.g. myproject-observations.md / .html).',
        'The response mentions that agent mini-reports are saved using the prefix format myproject-observations-<agent-name>.md.',
        'The response includes the mismatch hook recommending copying locally and running /repo-wizard, using the updated wording without the word upgrade.'
      ]
    }
  ]
};
