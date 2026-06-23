# Testing Agentic Systems: `repo-wizard` Testing Guide

Testing AI agents—especially Agent-to-Agent (A2A) orchestration networks—differs fundamentally from testing traditional deterministic software. This document describes the testing philosophy, the testing pyramid implemented in this repository, how to execute tests, and how to add new ones.

---

## 1. Testing Philosophy for Agentic Networks

AI agents are probabilistic and operate inside a host CLI shell using tools (e.g. reading files, running commands). Traditional testing fails here because:
- **Non-Determinism**: An agent's thoughts and phrasing vary across runs.
- **Cost & Latency**: Running real LLM calls for every integration test is slow and expensive.
- **Tool Execution Risk**: Letting an untested agent modify files could result in broken builds or code deletion.

To mitigate this, `repo-wizard` implements a multi-layered testing system that decouples **agent intent** from **physical filesystem results** and **contract compliance**.

---

## 2. The Testing Pyramid in `repo-wizard`

We organize our validation into five distinct levels:

```
               ▲
              / \
             /   \      Level 5: E2E Sandboxes (run-e2e-tests.js)
            / E2E \
           /_______\    Level 4: Subagent Mocking (run-mock-harness.js)
          /  Mock   \
         /___________\  Level 3: Contract Validation (validate-contracts.js)
        /  Contracts  \
       /_______________\ Level 2: LLM-as-a-Judge Evals (run-evals.js)
      /  Prompt Evals   \
     /___________________\ Level 1: Static Linters (validate-agents/commands/skills.js)
```

### Level 1: Static Linters (Zero API Dependency)
These scripts check configuration, command, and prompt files for syntactic correctness:
- **[validate-agents.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-agents.js)**: Verifies every agent persona file contains mandatory headers (Step 1, Step 2, Step 3, 3.1, 3.2, 3.3), references to the robustness protocol, and has a corresponding eval test file.
- **[validate-commands.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-commands.js)**: Verifies that custom commands are identical across `.claude/`, `.gemini/`, and `commands/` directories.
- **[validate-skills.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-skills.js)**: Checks that all skills contain a `SKILL.md` with correct YAML frontmatter and required sections.

### Level 2: LLM-as-a-Judge Prompt Evaluations
Catches prompt regressions by evaluating agent intent:
- **[run-evals.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/run-evals.js)**: Feeds the agent persona and a mock prompt into Gemini, then passes the output to a second Gemini call (the judge) to verify specific rubrics.
- **Evals definitions**: Stored under [evals/](file:///d:/DevSandbox/agy-projects/repo-wizard/evals/) (e.g., [repo-wizard-agent.js](file:///d:/DevSandbox/agy-projects/repo-wizard/evals/repo-wizard-agent.js)).

### Level 3: Contract Validation
Ensures the orchestrator and subagents communicate using consistent interfaces:
- **[validate-contracts.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-contracts.js)**: Enforces schema validation on JSON parameter contracts passed to subagents.

### Level 4: Subagent Mocking & Harnesses
Simulates subagent execution to test the orchestrator's report-compilation logic:
- **[run-mock-harness.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/run-mock-harness.js)**: Simulates the orchestration of all 18 specialist subagents. It generates mock observations files on the filesystem, runs contract validation on every exchange, and verifies observation file paths.

### Level 5: End-to-End (E2E) Sandboxes
Asserts physical workspace transformations:
- **[run-e2e-tests.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/run-e2e-tests.js)**: Spawns a temporary repository, triggers gitignore updates, performs session version archiving (creating `session_YYYYMMDD_HHMMSS.json`), and executes [validate-deliverables.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-deliverables.js) to audit formatting, section/paragraph counts, and disclaimers.

---

## 3. How and When to Run Tests

### Running Locally (Manual Executions)
All test scripts are self-contained and run with zero external npm dependencies:

```bash
# Run all static checks
node scripts/validate-agents.js
node scripts/validate-commands.js
node scripts/validate-skills.js

# Run integration tests for the helper validation scripts
node scripts/test-helpers.js

# Run schema validation on subagent contracts
node scripts/validate-contracts.js

# Run subagent mocking and E2E sandboxes
node scripts/run-mock-harness.js
node scripts/run-e2e-tests.js

# Run LLM-as-a-Judge evaluations (Requires GEMINI_API_KEY env variable)
$env:GEMINI_API_KEY="your-api-key"
node scripts/run-evals.js
```

### In-CI Pipeline (Pull Request Gates)
Linters and unit/sandbox tests should run on every commit or pull request. The CI check will exit with code 1 if:
- An agent file is missing Step 1/2/3 headers or the rollback protocol.
- Command definitions or descriptions mismatch.
- A new agent does not have a matching eval script (the **Rubric Parity Rule**).
- E2E sandbox files or backlogs miss the Developer Empowerment Disclaimer.

---

## 4. How to Add More Tests

### A. Adding a New Agent Evaluation Test Case
When adding a new subagent or modifying an existing agent prompt:
1. Locate or create its test file in `evals/<agent-name>-agent.js`.
2. Add a new test case object inside `testCases`:
   ```javascript
   {
     name: 'Compliance Trigger for HIPAA',
     input: 'Setup HIPAA compliance logging audits.',
     rubrics: [
       'The response mentions configuring audit logging policies.',
       'The response asks for the database platform (e.g. Postgres, DynamoDB).'
     ]
   }
   ```
3. Run `node scripts/run-evals.js` to ensure the agent persona satisfies the new rubrics.

### B. Adding a New Deliverable Check
If a report layout changes:
1. Open [validate-deliverables.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-deliverables.js).
2. Add assertions in `validateFile` (e.g., check for specific HTML headers or CSS styles).
3. Run `node scripts/validate-deliverables.js --test` to run the linter's self-test and verify it catches compliant and non-compliant files.

### C. Adding a Contract Schema Check
If subagents begin expecting new configuration parameters:
1. Update `validateContract` in [validate-contracts.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-contracts.js) to enforce the new types.
2. Update the invalid/valid contracts inside the script's `runSelfTest` function to assert that missing parameters are rejected.
3. Run `node scripts/validate-contracts.js` to verify.

---

## 5. Troubleshooting Test Failures

- **E2E Sandbox Preservation**: If an E2E sandbox test fails, the workspace directory is preserved at `temp_e2e_sandbox/` for diagnostics rather than being deleted. You can inspect this directory to see exactly what files were generated.
- **Judge Rejections**: If an LLM-as-a-judge test fails, verify if the agent output is actually incorrect, or if the rubric is ambiguous. Rubrics should be clear, binary assertions (e.g. *"The response contains X"* instead of *"The response is helpful"*).
