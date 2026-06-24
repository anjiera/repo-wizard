# Design Document: Legal Consent Gate & Disclaimers

This document describes the design and implementation of the **Legal Onboarding Consent Gate** (Step 0) and the disclaimer systems in `repo-wizard`.

---

## 1. Objectives

As an AI-driven tool configuration assistant, `repo-wizard` recommends security libraries, licensing configurations, and compliance rulesets. To manage liability:
1. **Developer Ownership**: The developer must acknowledge that the tool makes suggestions, but they retain final responsibility for code correctness and licensing.
2. **Explicit Consent**: Execution must block and refuse to scan or modify the repository unless the developer has accepted the terms.
3. **Traceability**: A persistent record of consent must be logged locally in the project state.

---

## 2. Step 0: The Consent Gate

Before running any codebase profiling or executing subagents, the lead agent completes the **Step 0 Consent Check**:

```
                  +-----------------------------------+
                  |           Launch Command          |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |      Check .repo-wizard/          |
                  |          .tos_agreed              |
                  +-----------------+-----------------+
                                    |
                     +--------------+--------------+
                     |                             |
              [File Exists]                 [File Missing]
                     |                             |
                     v                             v
            +--------+--------+           +--------+--------+
            |  Read Consent   |           |  Halt Execution |
            |  Proceed to     |           |  Display Terms  |
            |  Step 1         |           |  Prompt (y/N)   |
            +-----------------+           +--------+--------+
                                                   |
                                     +-------------+-------------+
                                     |                           |
                                [Accepted]                  [Declined]
                                     |                           |
                                     v                           v
                            +--------+--------+         +--------+--------+
                            | Write JSON file |         | Exit with error |
                            | .tos_agreed     |         | "Refused Terms" |
                            +--------+--------+         +-----------------+
                                     |
                                     v
                            +--------+--------+
                            | Proceed to      |
                            | Step 1          |
                            +-----------------+
```

### The Consent Schema (`.tos_agreed`)
When a developer accepts the agreement, a JSON state file is saved:
```json
{
  "agreed_by": "dev-user",
  "timestamp": "2026-06-23T18:02:36.000Z"
}
```
If this file exists, subsequent runs bypass the prompt and execute immediately.

---

## 3. Disclaimers & Hooks

### A. The Developer Empowerment Disclaimer
All generated markdown and HTML reports (e.g. executive summaries, full reports, and observations) must append this standard notice to the bottom:

> *"Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes."*

### B. Mismatch Hook
If the lead agent scans a project with sensitive requirements (e.g. processing payments or medical records) but detects that it is running in a lightweight local sandbox, it appends the **Mismatch Hook**:

> *"To improve this repository in the direction of [Production Tool / Enterprise System] standard, copy this codebase locally and run /repo-wizard to begin an interactive step-by-step implementation plan."*
