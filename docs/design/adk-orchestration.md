# Technical Design: ADK Orchestration Runner Integration

This document outlines the architecture of the `run-adk-orchestrator.js` engine, detailing how Repo Wizard handles complex, 31-agent swarms natively.

## 1. The Novelty of InMemory Orchestration

Most popular agentic frameworks (such as AutoGen, LangChain, or CrewAI) rely heavily on external orchestration servers, complex cloud-based message queues, or heavy middleware to coordinate swarms of this scale. 

Repo Wizard takes a drastically different approach. By leveraging the Google Agent Development Kit (ADK), we orchestrate 31 decoupled agents **natively in-memory, entirely inside the local developer sandbox.**

This approach yields several massive advantages:
- **Privacy:** Codebase context and analysis data never leaves the developer's machine (except for the raw LLM inference payload).
- **Latency:** Inter-agent communication and state parsing happen in local memory, eliminating network hops and queueing delays.
- **Simplicity:** The system requires zero dependencies, zero Docker containers for the orchestrator, and zero external database infrastructure.

## 2. Core Architecture

### 2.1 Specialist Subagents
All 31 specialist agents are registered as discrete entities. Each agent instance is provisioned with:
- An identity mapped from the original `agent-registry.json`.
- Specific, sandboxed tool access rights (e.g., restricted filesystem reads).
- An explicit lifecycle session to maintain conversation history without leaking context to other agents.

### 2.2 InMemoryRunner Execution
The CLI orchestration delegates agent execution to the `InMemoryRunner`.
- **Session Provisioning**: Prior to execution, the runner initializes a unique session.
- **Handoff Mechanism**: The runner feeds parameter contracts (from `manifest.json`) into the agent as structured system prompts.
- **Output Aggregation**: The orchestrator intercepts the generative streams, parsing the responses to persist local observation markdown files to the `.repo-wizard/reports/` directory.

## 3. Sandboxing & Boundaries

To support consistent operations without making absolute guarantees, the system uses the following mechanisms to mitigate risks:
- **Contract Parameterization**: Agents operate strictly on defined target configurations. Out-of-bounds filesystem requests are intercepted and flagged by the tool abstractions.
- **Sequential Guardrails**: The pipeline operates sequentially by default (or grouped in safe batches of 6), allowing developers to verify and inspect intermediate agent logs before proceeding to subsequent steps.

## 4. Testing Framework
Testing is split across two primary verticals to verify system health:
1. **Build Environment**: Validates internal configurations (`validate-agents.js`, `validate-skills.js`).
2. **Runtime Orchestration**: A specialized end-to-end sandbox test (`adk-runner.test.js`) verifies that the `InMemoryRunner` successfully parses target manifests, triggers agent lifecycles, and correctly updates parameter contract statuses upon completion.
