# Design Document: Self-Auditing Prompt Alignment (Meta-Agents)

This document describes the design and verification patterns for prompt consistency and agent auditing in the `repo-wizard` system.

---

## 1. The Meta-Agent Pattern

In a large agentic network (18+ specialists), maintaining prompt consistency is challenging. Prompts drift as developers add instructions, leading to mismatched behaviors, lost context, or bloated token usage.

`repo-wizard` addresses this using a **Meta-Agent Pattern**:
* **The Specialist network**: Implements domain rules (security, testing, accessibility).
* **The Meta-Agent (`agent-alignment-auditor`)**: Audits the prompts of other agents. It verifies formatting rules, checks that they remain within token budgets, and confirms they contain standard mitigation blocks (such as the rollback protocol or disclaimers).

```
                      +-----------------------------+
                      |     Developer Git Commit    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    Pre-Commit Linter        |
                      |  (validate-agents.js)       |
                      +--------------+--------------+
                                     |
                       +-------------+-------------+
                       |                           |
                 [Format Valid]             [Format Invalid]
                       |                           |
                       v                           v
              +--------+--------+        +---------+---------+
              | Stage & Commit  |        | Block Commit      |
              +-----------------+        | Run Alignment     |
                                         | Auditor Agent to    |
                                         | rewrite prompt    |
                                         +-------------------+
```

---

## 2. Static Rules & Linter Gates

Rather than relying purely on LLM evaluations, prompt consistency is anchored by a high-performance, zero-dependency static validator: **`scripts/validate-agents.js`**.

The linter enforces three strict constraints on every agent markdown file:

### A. Mandatory Step Header Structure
To safeguard the step-based execution structure of each agent, each markdown persona must contain:
* `## Step 1` (Target Stack & Onboarding)
* `## Step 2` (Codebase Auditing)
* `## Step 3` (Interactive Guidance)
  * `### 3.1` (Consent Protocol)
  * `### 3.2` (Control Boundaries)
  * `### 3.3` (Mitigation & Rollback)

### B. Standardized References
Agents must explicitly mention the [tooling-robustness-protocol.md](../references/tooling-robustness-protocol.md) file inside their `Step 3.3` instructions to align on rollback behaviors.

### C. Rubric Parity
Every agent persona file must have a corresponding dynamic test file under `evals/` matching the agent file name.

---

## 3. Dynamic Prompt Auditing

If the static linter fails, the developer can run the `/rw-agent-alignment-auditor` command, which dispatches the file contents to the `agent-alignment-auditor` subagent. 

The auditor agent:
1. Parses the markdown headings.
2. Identifies missing verification checkpoints or un-conventional phrasing.
3. Automatically reformats the markdown content while preserving the core technical instructions, presenting the diff to the developer for review before committing.
