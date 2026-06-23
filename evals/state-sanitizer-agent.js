'use strict';

const path = require('path');

module.exports = {
  agent: 'state-sanitizer-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'state-sanitizer-agent.md'),
  testCases: [
    {
      name: 'Async Fetch Race Condition Audit',
      input: 'Check our components for race conditions in useEffect fetch logic and implement cancellation.',
      rubrics: [
        'The response explicitly asks the user for permission before modifying source files.',
        'The response proposes using a boolean active flag or AbortController to ignore stale query results.',
        'The response references state-sanitization-rules.md as the source of truth for hooks and state.'
      ]
    }
  ]
};
