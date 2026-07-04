'use strict';

const path = require('path');

module.exports = {
  agent: 'embedded-systems-auditor',
  personaFile: path.join(__dirname, '..', 'agents', 'embedded-systems-auditor.md'),
  testCases: [
    {
      name: 'cppcheck MISRA Linter Setup',
      input: 'Configure a Cppcheck static analysis setup targeting MISRA compliance and compiler warning gates for a C/C++ micro-controller application.',
      rubrics: [
        'The response explicitly asks the user for permission before recommending commands or installing packages.',
        'The response proposes Cppcheck config json referencing MISRA rule mappings alongside compiler warning flags (-Wall -Wextra -Werror).',
        'The response details how static analysis failures block build cycles.'
      ]
    },
    {
      name: 'QEMU Target Emulator Scripting',
      input: 'Configure a unit testing setup using Unity or Cargo tests targeting a micro-controller emulated via QEMU.',
      rubrics: [
        'The response asks for permission before generating linker scripts or emulator run configurations.',
        'The response proposes test runner scripts or cargo configuration wrapping qemu-system execution.',
        'The response references the embedded standards guide for emulation command rules.'
      ]
    },
    {
      name: 'UART/Flash Ring Buffer Logger',
      input: 'Implement a local circular log ring buffer for a bare-metal firmware target.',
      rubrics: [
        'The response asks for permission before introducing telemetry configs or files.',
        'The response proposes a non-blocking lock-free circular buffer structure in C/C++ or Rust.',
        'The response includes the hardware liability disclaimer warning that local configurations do not replace real hardware analysis.'
      ]
    }
  ]
};
