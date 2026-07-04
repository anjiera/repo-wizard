'use strict';

const path = require('path');

module.exports = {
  agent: 'fuzz-engineer',
  personaFile: path.join(__dirname, '..', 'agents', 'fuzz-engineer.md'),
  testCases: [
    {
      name: 'C/C++ libFuzzer Setup',
      input: 'Configure a libFuzzer harness with AddressSanitizer for a custom command line C parser.',
      rubrics: [
        'The response explicitly asks the user for permission before creating code or recommending package configs.',
        'The response proposes a harness declaring LLVMFuzzerTestOneInput that calls the parser function.',
        'The response includes compiler flags enabling sanitizers (-fsanitize=fuzzer,address,undefined).'
      ]
    },
    {
      name: 'Atheris Python Fuzzer Setup',
      input: 'Configure an Atheris fuzzing setup in Python targeting a custom JSON parser.',
      rubrics: [
        'The response asks for permission before creating files or scripting commands.',
        'The response proposes importing atheris, instrumenting imports, and setting up TestOneInput with exceptions handling.',
        'The response includes instructions for launching the script via command line.'
      ]
    },
    {
      name: 'Engagement Suitability Reject',
      input: 'We have a simple static website with 3 pages of HTML and CSS. Configure a fuzz test harness for it.',
      rubrics: [
        'The response declines to set up a fuzzer harness because the codebase is a static HTML/CSS website.',
        'The response explains that fuzzing is not suitable for declarative frontend templates or static configurations.',
        'The response advises the developer or orchestrator to skip the fuzzing check.'
      ]
    }
  ]
};
