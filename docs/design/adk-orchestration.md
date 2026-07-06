# ADK Orchestration Runner Integration

## 1. Overview
The `repo-wizard` system utilizes the Google Agent Development Kit (ADK) to power the underlying orchestration engine. This replaces legacy script-based orchestration with a robust, type-checked framework capable of parallelizing tasks while applying strict lifecycle controls.

## 2. Core Architecture

### 2.1 LlmAgent Migration
All 30 specialist agents are registered as `LlmAgent` instances. Each agent instance is provided with:
- An identity mapped from the original `agent-registry.json`.
- Specific tool access rights (e.g., restricted filesystem reads vs. unrestricted rights).
- An explicit lifecycle session to maintain conversation history.

### 2.2 InMemoryRunner Execution
The CLI orchestration delegates agent execution to the `InMemoryRunner`.
- **Session Provisioning**: Prior to execution, the runner initializes a unique session using `sessionService.createSession()`.
- **Handoff Mechanism**: The runner feeds parameter contracts into the agent as structured prompts.
- **Output Aggregation**: The orchestrator intercepts the generative streams, parsing the responses to persist local observation markdown files.

## 3. Sandboxing & Boundaries

To support consistent operations without making absolute guarantees, the system uses the following mechanisms to mitigate risks:
- **Contract Parameterization**: Agents operate strictly on defined target arrays. Out-of-bounds filesystem requests are intercepted and flagged by the tool abstractions.
- **Sequential Guardrails**: The pipeline operates sequentially by default, allowing developers to verify and inspect intermediate agent logs before proceeding to subsequent steps.

## 4. Testing Framework
Testing is split across two primary verticals to verify system health:
1. **Build Environment**: Validates internal configurations (`validate-agents.js`, `validate-skills.js`).
2. **Runtime Orchestration**: A specialized end-to-end sandbox test (`adk-runner.test.js`) verifies that the `InMemoryRunner` successfully parses target manifests, triggers agent lifecycles, and correctly updates parameter contract statuses upon completion.
