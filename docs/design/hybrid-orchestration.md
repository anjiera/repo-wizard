# Architectural Guide: Hybrid Decoupled Runtime Orchestrator

This document describes the design, execution lifecycle, and technical motivations for the **Hybrid Decoupled Runtime Orchestrator** in `repo-wizard`.

---

## 1. Architectural Overview

AI agents are traditionally orchestrated by having a lead agent sequentially spawn subagents using tool calls (such as `LlmAgent`). While simple, this approach has limits:
1. **High Latency**: Spawning subagents sequentially inside the LLM prompt loop blocks execution.
2. **Context Window Pressure**: Maintaining multiple subagent logs in a single conversation thread bloats token usage.
3. **Rigidity**: If the LLM generates arguments that violate schemas, validation fails late in the run.

`repo-wizard` addresses these constraints through a **manifest-driven decoupled hybrid coordination** model. 

```
                                  +-----------------------+
                                  |  Lead Agent (LLM)     |
                                  | (repo-wizard)   |
                                  +-----------+-----------+
                                              |
                                              | 1. Writes Manifest
                                              v
                                  +-----------+-----------+
                                  | .repo-wizard/         |
                                  |  manifest.json        |
                                  +-----------+-----------+
                                              |
                                              | 2. Executes Runtime
                                              v
                                  +-----------+-----------+
                                  | scripts/              |
                                  |  run-orchestration.js |
                                  +-----------+-----------+
                                              |
                         +--------------------+--------------------+
                         |                                         |
                [Platform CLI Present]                   [Platform CLI Absent]
                         |                                         |
                         v (Parallel Run)                          v (Fallback)
         +---------------+---------------+             +-----------+-----------+
         | Spawn subagents in parallel   |             | Update manifest       |
         | via InMemoryRunner            |             | status to fallback    |
         +---------------+---------------+             +-----------+-----------+
                         |                                         |
                         | 3. Writes Observations                  | 3. Exit 0
                         v                                         v
         +---------------+---------------+             +-----------+-----------+
         | .repo-wizard/agents/          |             | Lead Agent resumes    |
         |  observations-*.md            |             | and calls subagents   |
         +-------------------------------+             | sequentially via      |
                                                       | LlmAgent              |
                                                       +-----------------------+
```

---

## 2. Execution Lifecycle

### Phase 1: Parameter Compilation (Lead Agent)
* The lead agent completes the developer profiling interview (or runs a fast decoupled relevance sweep in headless mode).
* Rather than invoking specialists directly, it compiles the selected parameter contracts into a single JSON manifest at `.repo-wizard/manifest.json`.
* The lead agent executes the runtime coordinator:
  ```bash
  node scripts/run-orchestration.js
  ```

### Phase 2: Schema Validation & Environment Auditing (Runtime)
* **Pre-flight Schema Validation**: The script loads the manifest and runs `validate-contracts.js` on every contract. If any contract contains syntax or parameter errors, execution halts immediately with exit code `1` before spending LLM tokens.
* **Environment Auditing**: The script checks if the developer's system shell has the platform CLI binary (e.g. `antigravity`, `agy`, or `claude`) installed in the execution path.

### Phase 3: Split-Execution Path
* **CLI Found (High-Speed Concurrency)**:
  * The script spawns the specialist agents concurrently using the new `InMemoryRunner`.
  * **Session Service Tracking**: The script inspects the `sessionService` to track the environment type and execution milestones.
    * *InMemoryRunner*: Renders a live, animated progress bar smoothly updating in-place.
    * *sessionService*: Prints clean, line-by-line logging milestones to avoid cluttering scroll windows.
  * Writes reports to `.repo-wizard/agents/observations-<agent>-<repo>.md` and updates the manifest to `completed`.
* **CLI Absent (Graceful Fallback)**:
  * The script prints an execution notice.
  * It updates the manifest overall status to `fallback_to_agent` and each unfinished contract status to `pending_agent_fallback`.
  * It exits cleanly with code `0`.

### Phase 4: Report Synthesis (Lead Agent)
* The lead agent reads `.repo-wizard/manifest.json`.
* If status is `completed`, it consolidates the generated observation reports.
* If status is `fallback_to_agent`, it loops through the pending contracts and sequentially spawns them using its native `LlmAgent` tool, writes their files, and then consolidates reports.

---

## 3. Design Patterns Showcased

1. **Graceful Degradation / Fallback**: Enables the system to remain 100% portable across headless servers, local terminals, and IDE extensions without code modification.
2. **Pre-flight Contracts**: Validates arguments before invoking AI agents, protecting against late-stage run failures and token wastage.
3. **Environment Feature Detection**: Dynamically determines capability (binary presence and sessionService support) to optimize performance and rendering.

---

## 4. Related Design Documents

* **[Session Resumability and Manifest Contracts](session-resumability.md)**: Explains the state schemas of `session.json` and `manifest.json`, the resumability recovery flow, and the backup archiving utility.
