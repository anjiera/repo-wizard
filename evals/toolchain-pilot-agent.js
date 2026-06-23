'use strict';

const path = require('path');

module.exports = {
  agent: 'toolchain-pilot-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'toolchain-pilot-agent.md'),
  testCases: [
    {
      name: 'CMake RISC-V Cross Compiler Setup',
      input: 'Configure a CMake toolchain file targeting RISC-V 32-bit bare-metal using riscv-none-elf-gcc.',
      rubrics: [
        'The response explicitly asks the user for permission before creating compiler configuration files.',
        'The response proposes a CMake toolchain file setting CMAKE_SYSTEM_NAME, CMAKE_C_COMPILER, and target processor flags (-march, -mabi).',
        'The response details the cmake command to invoke the build using the toolchain file.'
      ]
    },
    {
      name: 'Cargo Target Linker Config',
      input: 'Configure a Rust cargo configuration file targeting a bare-metal arm-none-eabi compilation using a custom linker script.',
      rubrics: [
        'The response asks for permission before creating cargo configurations.',
        'The response proposes target compiler and linker settings in .cargo/config.toml.',
        'The response explains how the linker arguments map to the target layout.'
      ]
    },
    {
      name: 'WebAssembly Emscripten Config',
      input: 'Configure an Emscripten WASM build config for a CMake-based C++ project.',
      rubrics: [
        'The response asks for permission before modifying project files.',
        'The response proposes an Emscripten toolchain wrapper configuration.',
        'The response includes the compiler safety disclaimer regarding physical target board verification.'
      ]
    }
  ]
};
