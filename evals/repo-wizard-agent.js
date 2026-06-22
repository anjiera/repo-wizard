'use strict';

const path = require('path');

module.exports = {
  agent: 'repo-wizard-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'repo-wizard-agent.md'),
  testCases: [
    {
      name: 'Large Codebase Incremental Adoption Trigger',
      input: 'Can you set up my repository? It is a Gradle Kotlin project with approximately 12,000 estimated lines of code.',
      rubrics: [
        'The response prompts the developer with the Incremental Adoption Question due to the LOC exceeding the 10,000 line threshold.',
        'The response contains the mandatory upfront safety disclaimer.'
      ]
    },
    {
      name: 'History Archiving On Fresh Start',
      input: 'We have an active session found on disk. I would like to choose "Start Fresh". Let\'s begin.',
      rubrics: [
        'The response explicitly states that the previous session.json and audit-report.md configurations will be archived to history/ with a timestamp before clearing.'
      ]
    }
  ]
};
