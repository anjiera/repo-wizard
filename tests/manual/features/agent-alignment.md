# Feature Test Plan: Agent Alignment & /rw-agent-align

This test plan defines the manual verification procedure for **Agent Alignment** audits and command parity.

---

## Test Steps & Scenarios

### Scenario 1: Pre-Commit Persona Validation
- [ ] **1. Run the agents validator**: Execute the static agent prompt checker:
  ```bash
  node scripts/validate-agents.js
  ```
  - *Expected*: The script parses all 27 markdown personas under `agents/` and checks for the mandatory step headers and Rubric Parity. Returns `0 error(s) found`.
- [ ] **2. Simulate a validation error**: Create a mock agent file `agents/temp-test-agent.md` and omit the required `## Step 3` header or omit its corresponding eval file. Run the script again.
  - *Expected*:
    - The validator fails.
    - Prints a clear message: `[ERROR] temp-test-agent.md is missing required evaluation suite under evals/temp-test-agent.js` or `missing mandatory heading: ## Step 3`.
- [ ] **3. Clean up**: Delete `agents/temp-test-agent.md`.

### Scenario 2: Running the /rw-agent-align Command
- [ ] **4. Run alignment scanner command**: In your agent environment, execute:
  ```bash
  /rw-agent-align
  ```
  - *Expected*:
    - The orchestrator invokes the `agent-alignment-pilot` subagent.
    - The subagent reviews your agent files, scans for missing steps, and outputs a prompt alignment audit report showing that all 27 specialist agent prompts comply with the required headers.
