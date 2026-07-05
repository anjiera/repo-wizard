# Technical Design: Pillar Concurrency Controls and Batching Thresholds

This document outlines the design for resource-limiting and API request rate mitigation inside the `repo-wizard` subagent coordination layer.

---

## 1. Architectural Motivation

When running extensive codebase sweeps, spawning multiple LLM subagents concurrently can lead to the following outcomes:
1. **API Rate Limiting**: Exceeding the requests-per-minute (RPM) or tokens-per-minute (TPM) thresholds defined by the LLM provider.
2. **Context Memory Contention**: Oversaturating the agent environment's execution queues, leading to timeouts or high latency.
3. **Budget Depletion**: Unmitigated token consumption from executing too many specialist subagents concurrently.

To address these concerns, we implement a threshold-based concurrency-limiting model.

---

## 2. Threshold Controls

### 2.1 Pre-Scan Sizing Warning
The initial scan checks the target repository size and counts the total number of relevant specialist agents.
If the count exceeds the threshold of 6 relevant agents, the pre-scan utility outputs a High Sweep Warning and halts execution with exit code `2`.
To guide the user in choosing a stage, the warning reports the precise count of relevant specialist agents mapped to each quality pillar:
* **SECURITY**
* **PERFORMANCE**
* **ARCHITECTURE**
* **QUALITY**

This allows developers to execute audits in smaller, isolated stages (e.g. `--pillar SECURITY`) to mitigate concurrent token load.

### 2.2 Native Execution Batching
During native parallel execution (where the Lead Agent directly invokes subagents via the `invoke_subagent` tool), a strict **Pillar Concurrency & Batching Rule** is enforced:
* **Concurrency Cap**: No more than 6 specialist subagents within the same quality pillar category are permitted to execute concurrently.
* **Batch Partitioning**: If a pillar has more than 6 relevant subagents, the Lead Agent must partition them into batches of at most 6 (e.g. 8 subagents are split into a batch of 6 and a batch of 2).
* **Sequential Batch Gate**: The Lead Agent must wait for the active batch to write its observation reports to disk before invoking the subsequent batch.

This hybrid approach mitigates parallel call volume while maintaining multi-agent scanning capabilities.
