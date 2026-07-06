# Technical Design - Unified CLI Orchestrator

This document outlines the architecture for the unified CLI entry point `scripts/repo-wizard.js` and its companion workspace preparation script `scripts/prepare-native-execution.js`.

## Pitch & Value Proposition

> "New to coding? You don't know what you don't know. repo-wizard can help. Point repo-wizard at any local repository, and let specialized agents audit your codebase, recommend best-practice tooling, and build a ready-to-run improvement backlog that you can hand off to other coding agents to roll out."

The lifecycle of repo-wizard consists of:
$$\text{Scan} \longrightarrow \text{Interview} \longrightarrow \text{Prepare} \longrightarrow \text{Dispatch} \longrightarrow \text{Compile}$$

## Goals & Objectives
1. **Consolidated Interface**: Establish a single entry point for all execution stages of the wizard setup, reducing the command surface for the Lead Agent and human developers.
2. **Deterministic Validation**: Verify that the command receives exactly one valid positional subcommand at a time, minimizing invocation mistakes.
3. **Optimized Token Efficiency**: Bundle the promotion of state files and the unpacking of subagent prompts/contracts into a single preparation utility to minimize Lead Agent turn counts during Native Chat scans.

## Command Architecture

The script `scripts/repo-wizard.js` serves as the primary subcommand router. It validates the first positional argument `args[0]` against a set of supported subcommands:

- **`scan`**: Executes the unified codebase setup and static analysis script (`initial-codebase-scan.js`).
- **`prepare`**: Runs the workspace preparation utility (`prepare-native-execution.js`).
- **`run`**: Runs subagents sequentially in fallback mode (`run-fallback-sequential-orchestration.js`).
- **`compile`**: Triggers the report compilation utility (`reports-compile.js`).

### Argument Validation
The router enforces the following constraints:
- If no subcommand is provided, or if the provided subcommand is not recognized, the script exits with an error status and prints the usage helper.
- Only a single subcommand is permitted per execution. If multiple positional subcommands are detected, the router rejects the command.
- Additional parameter flags (e.g. `--report-path`, `--pillar`, `--headless`) are forwarded directly to the target module script.

## Workspace Preparation (`prepare-native-execution.js`)
The `prepare` command invokes `scripts/prepare-native-execution.js`, which consolidates the following operations:
1. Directory verification: Verifies and builds the target `reports/`, `contracts/`, and `agents/` observation subdirectories under `.repo-wizard/`.
2. State file promotion: Copies the updated `manifest.json` and `session.json` configuration states from the root to the target reports subdirectory.
3. Contract unpacking: Resolves `manifest.json` contracts and writes active, non-skipped entries to individual `contracts/<agent-name>-contract.json` files.
4. Prompt data serialization: Reads the registry and maps active subagent system prompts to `resolved_agents_data.json` using relative pathing based on the active installation directory.
