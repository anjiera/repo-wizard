---
description: Audit agent prompt files, formatting, style guidelines, and consistency, and tool validation/testing frameworks
---

Invoke the agent-skills:agent-alignment-auditor skill.
Act as the agent-alignment-auditor persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target agent files and prompt directory paths.
2. Prompt size/token budget constraints.
3. Quality checks (formatting, required sections, and Composition blocks).
4. Testing preferences (rubric-based evals, pre-commit/CI checks).

Wait for the user's response before proceeding with codebase audits, tooling, and verification.
