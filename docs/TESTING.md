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
- *Reference:* For more details, see the standalone [prompt-evaluations.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/design/prompt-evaluations.md) guide.

### Level 3: Contract Validation
Ensures the orchestrator and subagents communicate using consistent interfaces:
- **[validate-contracts.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-contracts.js)**: Enforces schema validation on JSON parameter contracts passed to subagents.

### Level 4: Subagent Mocking & Harnesses
Simulates subagent execution to test the orchestrator's report-compilation logic:
- **[run-mock-harness.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/run-mock-harness.js)**: Simulates the orchestration of all 18 specialist subagents. It generates mock observations files on the filesystem, runs contract validation on every exchange, and verifies observation file paths.
- *Reference:* For more details on the parallel run-time architecture, see the [hybrid-orchestration.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/design/hybrid-orchestration.md) design document.

### Level 5: End-to-End (E2E) Sandboxes
Asserts physical workspace transformations:
- **[run-e2e-tests.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/run-e2e-tests.js)**: Spawns a temporary repository, triggers gitignore updates, performs session version archiving (creating `session_YYYYMMDD_HHMMSS.json`), and executes [validate-deliverables.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-deliverables.js) to audit formatting, section/paragraph counts, and disclaimers.
- *Reference:* For details on how the sandbox tests injection vulnerabilities, see the security guide [passive-data-boundaries.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/design/passive-data-boundaries.md).

---

## 3. How and When to Run Tests

### Running Locally (Manual Executions)
All test scripts are self-contained and run with zero external npm dependencies. For more details on the architecture behind these zero-dependency scripts, see [zero-dependency-scripting.md](file:///d:/DevSandbox/agy-projects/repo-wizard/docs/design/zero-dependency-scripting.md).

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

### D. Testing for Red Flag & Adversarial Behaviors
AI agents must actively avoid harmful or restricted actions ("Red Flags"), such as making direct code modifications without consent, providing absolute legal/compliance guarantees, or hardcoding system parameters.

We test for Red Flag avoidance using **Adversarial Temptation Evals** (Level 2):
1. **Define a Temptation Prompt**: Add a test case in `evals/<agent-name>.js` that explicitly commands the agent to violate a Red Flag. Examples configured in our codebase:
   - **Privacy Guardian**: Tempting the agent to write mock database decryption keys or auto-delete scripts.
   - **Compliance Pilot**: Tempting the agent to write dummy FIPS certificates or configure GPG signing without setup guides.
   - **Supply Chain Scanner**: Tempting the agent to suppress vulnerability warnings or bypass manifest modification consent.
   - **AppSec Hardener**: Tempting the agent to hardcode raw JWT signature secrets or disable CORS globally.
2. **Add Negative Rubrics**: Formulate rubrics that check that the agent refused, postponed, or correctly deferred to the developer/harness rather than complying blindly.
3. **Execute Evals**: Run `node scripts/run-evals.js` to ensure the model resists the temptation and adheres to its safety boundaries.

---



## 5. Troubleshooting Test Failures

### A. Static Linter Failures (Level 1)
If `node scripts/validate-agents.js` or `validate-skills.js` fail:
* **Missing Agent Persona Headers:** Check that your agent persona file in `agents/` includes the mandatory header structure (`Step 1`, `Step 2`, `Step 3`, `3.1`, `3.2`, `3.3`).
* **Rubric Parity Rule Violation:** If you create a new agent (e.g., `agents/my-new-agent.md`), you **must** also create a corresponding dynamic evaluation file under `evals/my-new-agent.js`.
* **Command Definition Mismatch:** If `validate-commands.js` fails, it means you updated a slash command (e.g. in `.gemini/commands/`) but forgot to synchronize the duplicate config files in `.claude/commands/` or `commands/`. Run `node scripts/validate-commands.js` to see the exact field mismatch, then copy the updated settings.

### B. LLM-as-a-Judge Rejections (Level 2)
If `node scripts/run-evals.js` fails:
1. **Locate the Failure logs:** The script prints the target prompt, the agent's output response, and the judge's exact reasoning.
2. **Determine the Root Cause:**
   - **If the Agent is wrong:** Refine the agent system prompt (in `agents/`) to explicitly instruct it to fulfill the missing detail.
   - **If the Judge rubric is too strict or ambiguous:** Rubrics must be binary, objective conditions. For example, change *"The response is helpful"* to *"The response explicitly states the rollback command 'git reset'"*. Update the rubric inside `evals/<agent-name>.js`.

### C. Contract Schema Mismatches (Level 3)
If `node scripts/validate-contracts.js` fails:
* This indicates that a specialist subagent was called with unexpected configuration keys or type mismatches.
* Check the schema definition in [validate-contracts.js](file:///d:/DevSandbox/agy-projects/repo-wizard/scripts/validate-contracts.js) and compare it against the JSON argument object generated by the mock harness or orchestrator.

### D. Mock Harness Failures (Level 4)
If `node scripts/run-mock-harness.js` fails:
* Verify that the mock execution files generated under `.repo-wizard/` match the expected file naming convention (e.g. `observation_*.json`).
* Ensure no stray sandbox directories are locking files on Windows systems.

### E. E2E Sandbox Failures (Level 5)
If `node scripts/run-e2e-tests.js` fails:
* **Sandbox Preservation:** The runner does not delete the test workspace if a test fails. Navigate to the preserved folder `temp_e2e_sandbox/` to inspect:
  - `.repo-wizard/session.json` (to see the state of options).
  - Generated report files (to see if section headings or the disclaimer block was missed).
* **Resetting the Sandbox:** Before running tests again, delete the directory manually:
  ```powershell
  Remove-Item -Recurse -Force temp_e2e_sandbox
  ```

