---
description: Configure CMake cross-compilation files, cargo target variables, sysroot layouts, and compiler linker script variables for target architectures
---

Invoke the agent-skills:toolchain-architect skill.
Act as the toolchain-architect persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target hardware processor architecture and model.
2. Target build compiler framework (CMake, Make, Cargo, platformio).
3. Cross-compiler executable names and target link paths.
4. Custom linker script requirements and stack configurations.
5. Target sysroot headers directory dependencies.

Wait for the user's response before proceeding with build audits, codebase scans, tooling, and verification.
