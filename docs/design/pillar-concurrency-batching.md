# Technical Design: Pillar Concurrency & Batching

This document outlines how Repo Wizard manages execution scale and prevents local resource exhaustion or API rate limits when dispatching massive multi-agent audits.

## 1. The Swarm Scaling Problem
Repo Wizard delegates validation to 31 separate specialist subagents. If the Lead Agent attempted to dispatch all 31 agents simultaneously:
- **API Rate Limits:** Concurrent requests to LLM providers would immediately trigger HTTP 429 Too Many Requests errors.
- **Local Starvation:** Compiling TypeScript code, running container scanners, and executing Rust tests all at the same time would crash the developer's laptop due to memory and CPU exhaustion.
- **Token Depletion:** Parallel generation would exhaust the daily or minute-based token limits assigned to the API key.

## 2. Quality Pillars & Batching

To solve this, Repo Wizard introduces the **Pillar Concurrency & Batching** architecture. 

### 2.1 Semantic Partitioning
The 31 agents are divided into four semantic Quality Pillars via `agents/agent-registry.json`:
1. **SECURITY** (e.g., AppSec, Supply Chain, Fuzz Testing)
2. **PERFORMANCE** (e.g., React Performance, Benchmarking)
3. **ARCHITECTURE** (e.g., Maintainability, Database Lifecycle)
4. **QUALITY** (e.g., Accessibility, QA, Dev Onboarding)

By grouping agents logically, the user can choose to run targeted sweeps (e.g., "Only audit Security") instead of a full 31-agent gauntlet.

### 2.2 Concurrency Caps
Even if a user selects `ALL` pillars, the execution engine enforces a strict **Global Concurrency Cap of 6**.

During native execution, the Lead Agent dispatches subagents in batches. The orchestrator must:
1. Count the number of queued specialist subagents.
2. Slice them into batches of no more than 6.
3. Use `invoke_subagent` to spawn the batch.
4. **Strict Barrier:** Wait for all 6 subagents to complete their sandbox execution and write their Markdown observation files to disk before spawning the next batch.

## 3. Benefits of Batching
- **Deterministic Throughput:** By capping concurrency, Repo Wizard guarantees a stable footprint regardless of the host machine's power.
- **Resilience:** If one batch fails or hits a rate limit, the impact is isolated to those 6 agents rather than the entire swarm.
- **Token Pacing:** Sequential batching spaces out API requests over several minutes, drastically reducing the chance of triggering provider rate limits.
