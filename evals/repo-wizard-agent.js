'use strict';

const path = require('path');

module.exports = {
  agent: 'repo-wizard-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'repo-wizard-agent.md'),
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
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, can you set up my repository? It is a Gradle Kotlin project with approximately 12,000 estimated lines of code.',
      rubrics: [
        'The response prompts the developer with the Incremental Adoption Question due to the LOC exceeding the 10,000 line threshold.',
        'The response contains the mandatory upfront safety disclaimer.'
      ]
    },
    {
      name: 'History Archiving On Fresh Start',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, we have an active session found on disk. I would like to choose "Start Fresh". Let\'s begin.',
      rubrics: [
        'The response explicitly states that the previous session.json and repo-wizard-full-report.md configurations will be archived to history/ with a timestamp before clearing.'
      ]
    },
    {
      name: 'Backlog Mode Selection & Deliverables',
      input: 'Assuming we have already agreed to the TOS and .tos_agreed exists, let\'s start. I would like to configure my repository using the "backlog" execution mode. I want granular task stories and we use Scrum.',
      rubrics: [
        'The response acknowledges the backlog execution mode toggle.',
        'The response mentions exporting a CSV backlog (.repo-wizard/backlog.csv), a full technical report (.repo-wizard/repo-wizard-full-report.md / .html), and a constructive 3-section executive summary (.repo-wizard/repo-wizard-executive-summary.md / .html).',
        'The response acknowledges the Scrum planning framework and granularity.'
      ]
    }
  ]
};
