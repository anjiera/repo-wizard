# Technical Design: Deterministic Agent Interfaces (`manifest.json`)

This document explains the architecture for configuring and orchestrating non-deterministic specialist subagents using strict JSON contracts in Repo Wizard.

## 1. The Orchestration Dilemma
LLM agents are inherently non-deterministic. When orchestrating a massive swarm of 31 subagents, relying purely on conversational memory or unstructured free-text system prompts to pass configuration state introduces unacceptable variability. Agents may misinterpret execution modes, hallucinate constraints, or drop project context entirely.

## 2. The Contract-Driven Architecture

Repo Wizard solves this by enforcing a strict API-like interface between the user's interactive alignment answers and the active subagents.

### 2.1 The `manifest.json` Data Store
When a user answers the profiling questionnaire (e.g. specifying strictness gates, coverage thresholds, target hardware, etc.), these choices are not just blindly piped into a master string prompt. Instead, they are parsed and compiled into a strict `manifest.json` configuration file under `.repo-wizard/manifest.json`.

This JSON file contains:
- **`global`**: Shared invariants across all subagents (e.g., `budget_tier`, `project_type`, `languages`).
- **`contracts`**: A nested dictionary containing distinct parameter payloads tailored for every individual specialist subagent (e.g., `coverage_threshold` for the QA Engineer, or `hook_strictness` for the VCS Workflow Engineer).

### 2.2 Bridging the Contract to the Prompt
When the Lead Agent invokes a subagent via `@google/adk` natively (or via the CLI orchestrator script), it explicitly injects the path to the `manifest.json` file into the subagent's system prompt instructions.

The subagents are pre-programmed via their respective `SKILL.md` workflows to **always read their JSON contract block first** before performing any analysis or code modifications.

## 3. Benefits of Deterministic Bridging
- **Consistency:** If the user specifies `budget_tier: free`, the JSON schema guarantees that every single agent sees and obeys this constraint without it getting lost in context translation.
- **Audibility:** A user can review `.repo-wizard/manifest.json` to see the exact state parameters passed to the swarm.
- **Portability:** Because the state is serialized to JSON rather than trapped in conversational context, we can pause, resume, and archive full orchestration sessions natively.
