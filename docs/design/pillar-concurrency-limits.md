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
If the count exceeds the threshold of 6 relevant agents, the pre-scan utility outputs a High Agent Count Warning and halts execution with exit code `2`.
To guide the user in choosing a stage, the warning reports the precise count of relevant specialist agents mapped to each quality pillar:
* **SECURITY**
* **PERFORMANCE**
* **ARCHITECTURE**
* **QUALITY**

This allows developers to execute audits in smaller, isolated stages (e.g. `--pillar SECURITY`) to mitigate concurrent token load.

### 2.2 Native Execution Batching
During native parallel execution (where the Lead Agent directly invokes subagents via the `invoke_subagent` tool), a strict **Pillar Concurrency & Batching Rule** is enforced:
* **Global Concurrency Cap**: A maximum of **6** active subagents total across all quality pillars are permitted to execute concurrently at any given time.
* **Mixed Pillar Batching**: If the total number of relevant subagents to run exceeds 6, the Lead Agent partitions them into batches of at most 6 (which can contain a mix of different pillars).
* **Sequential Batch Gate**: The Lead Agent must wait for the active batch to write its observation reports to disk before invoking the subsequent batch.

This batching model is designed to mitigate parallel API call volume and reduce token execution rates.
