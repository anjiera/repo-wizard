'use strict';

const path = require('path');

module.exports = {
  agent: 'react-performance-pilot-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'react-performance-pilot-agent.md'),
  testCases: [
    {
      name: 'React INP yielding optimization',
      input: 'Audit my React App for INP bottlenecks and configure scheduler.yield() in our high frequency scroll list.',
      rubrics: [
        'The response explicitly asks the user for permission before modifying source code or adding dependencies.',
        'The response proposes using scheduler.yield() or useTransition to break up long-running render loops.',
        'The response references react-performance-patterns.md as the source of truth for React optimizations.'
      ]
    }
  ]
};
