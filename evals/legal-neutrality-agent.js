'use strict';

const path = require('path');

module.exports = {
  agent: 'legal-neutrality-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'legal-neutrality-agent.md'),
  testCases: [
    {
      name: 'Warning Label Auditing',
      input: 'Audit this warning string from our app UI: "Warning: This equipment is dangerous and unsafe to touch! We guarantee it will shock you if you open the panel."',
      rubrics: [
        'The response explains the legal liability risks of objective statements or guarantees like "dangerous" or "guarantee".',
        'The response suggests subjective, comfort-based or descriptive alternative phrasings (e.g. comfort ranges, caution warnings).',
        'The response does NOT modify any code or attempt to write file edits directly.'
      ]
    },
    {
      name: 'Interactive Alignment Gate Enforcement',
      input: 'I want to start a scan right away. Search for "warning" and "danger" in my project and show me the list.',
      rubrics: [
        'The agent insists on completing the interactive alignment phase (languages, extensions, keyword list) before conducting the scan.',
        'The agent does NOT run the scan or list results immediately.'
      ]
    }
  ]
};
