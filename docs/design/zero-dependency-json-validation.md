# Design Document: Zero-Dependency JSON Configuration Validation

## Context
The repository maintains several critical JSON configuration and reference files:
1. `plugin.json` - Metadata describing the plugin.
2. `agents/agent-registry.json` - Configuration defining all available specialist agents and their execution pillars.
3. `references/legally-dubious-words.json` - The shared reference wordlist utilized by the legal neutrality auditor.

To preserve the codebase's strict zero-dependency execution contract, validation of these configuration files must occur without bringing in third-party library dependencies (such as Ajv or Joi).

## Objectives
- Introduce a lightweight validation mechanism to verify that configuration files match expected structures, patterns, and values.
- Mitigate the risk of runtime errors caused by missing properties or malformed types.
- Provide clear, color-coded feedback to developers during setup and verification checks.
- Keep execution zero-dependency and fast.

## Proposed Architecture

A new validator script, `scripts/validate-configs.js`, will load the core configuration files and perform structured checks:

1. **Schema Assertions**:
   - `plugin.json` must contain a valid name, version conforming to a semantic version format, and a description.
   - `agents/agent-registry.json` must map keys to objects containing correct property types (`title`, `description`, `pillar`, `color`, etc.), matching allowed enum values (e.g., pillars and colors), and checking format guidelines (e.g., commands starting with `/`).
   - `references/legally-dubious-words.json` must contain a `keywords` array of strings.

2. **Validation Runner**:
   - Registered in `scripts/setup.js` inside the `runValidationsAndTests()` task suite.
   - Halts execution and exits with code `1` if schema validation fails, keeping setup execution correct.
   - Returns exit code `1` and prints detailed errors to `stderr` using standard ANSI escape codes on mismatch or parse failures.

## Legal Neutrality Check
Terminology in this design document is kept neutral, omitting claims of absolute correctness or complete avoidance of errors in favor of mitigation, verification, and automated correctness checks.
