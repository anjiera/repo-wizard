'use strict';

const path = require('path');

module.exports = {
  agent: 'technical-scribe',
  personaFile: path.join(__dirname, '..', 'agents', 'technical-scribe.md'),
  testCases: [
    {
      name: 'ADR Tooling and Helper CLI Setup',
      input: 'Configure Nygard-style ADRs under docs/decisions. I want a python helper script to easily generate new ADRs.',
      rubrics: [
        'The response explicitly asks the user for permission before creating the decisions directory or writing the Python script.',
        'The response details how the ADR structure will follow the standard Nygard headings (Status, Context, Decision, Consequences).',
        'The response proposes a Python helper script that determines the next sequence number and generates the template.'
      ]
    },
    {
      name: 'C4 Model Mermaid Diagram Generation',
      input: 'Create a system context diagram using Mermaid. The system is a web app frontend communicating with a backend API service, which reads/writes to a postgres database.',
      rubrics: [
        'The response presents a valid GFM Mermaid diagram.',
        'The response outlines the component boundaries (web app, backend API, database).',
        'The response asks the developer for feedback/review of the diagram layout before saving it.'
      ]
    },
    {
      name: 'Bug-fix Post-Mortem & Sprint Retrospective Templates',
      input: 'Set up post-mortem and retrospective templates for our project. We want to distinguish between incident post-mortems and cycle retrospectives.',
      rubrics: [
        'The response asks for permission before creating the template files or directories.',
        'The response proposes two distinct templates: one for Incident Post-Mortems (RCA, Timeline, Actions) and one for Sprint/Cycle Retrospectives.',
        'The Sprint Retrospective template includes standard Agile cycle questions and the custom Stop-Start-Continue-Kudos ritual section for team kudos.'
      ]
    }
  ]
};
