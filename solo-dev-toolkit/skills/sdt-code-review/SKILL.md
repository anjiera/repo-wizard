---
name: sdt-code-review
description: Conducts solo-developer-optimized code reviews, applying blast-radius risk gating, change sizing checks, active disproof testing, and papercut frequency tracking. Use to review and audit code changes before commit or merge.
---

# Code Review & Verification (sdt-code-review)

## Overview

This skill provides a highly focused, adversarial code review workflow optimized for **solo developers** working at high velocity. It strips out team coordination and meeting overhead, focusing 100% on logical correctness, clean architecture, security, performance, and regression prevention.

To optimize speed without compromising safety, it utilizes **Blast-Radius Gating** to adjust the review intensity based on the risk level of the change, and **Active Disproof Testing** to verify high-stakes code through automated tests.

---

## When to Use

Use this skill whenever you need to review and audit code changes before they are committed to version control.

### Change Sizing Check
Before starting the review, check the size of the changes. Large diffs degrade review quality. Keep changes focused and incremental:
*   `~100 lines changed` ──► Ideal. Easy to audit thoroughly.
*   `~300 lines changed` ──► Acceptable if it represents a single, cohesive logical change.
*   `>500 lines changed` ──► Too large. The agent must split the task (e.g., horizontally by layer, or vertically by slice) before proceeding.

### Blast-Radius Risk Gating
Categorize the changes into one of three risk tiers to determine the required review depth:

| Risk Tier | Scope of Changes | Required Review Depth |
| :--- | :--- | :--- |
| **Low Risk** | Styling, CSS, markup, typo fixes, or internal documentation changes. | **Bypass:** Standard linter/format check only. No reviewer agent needed. |
| **Medium Risk** | Adding helper functions, minor utilities, writing new tests, or modifying non-critical views. | **Single-Pass:** Spawns a reviewer subagent to check for basic edge cases and styling consistency. |
| **High Risk** | Modifying database schemas, security guards, core orchestration loops, CLI parameters, or file-writing tools. | **Deep Review:** Mandatory adversarial review cycle (Doubt Cycle) + active disproof testing. |

---

## Core Process

### Step 1: Risk & Sizing Assessment
Evaluate the changed files. Determine the Change Size and the Blast-Radius Risk Tier (Low, Medium, or High).
*   If size is >500 lines, stop and split the change.
*   If **Low Risk**, run standard formatting/linting and proceed to commit.
*   If **Medium** or **High Risk**, proceed with the steps below.

### Step 2: Local Verification Gate
Run all local compilers, unit tests, and linters:
*   *Windows (PowerShell):* `.\setup.ps1` or your workspace test command.
*   *Linux / macOS:* `./setup.sh` or your workspace test command.
If the build or tests fail, you must fix them before proceeding.

### Step 3: Adversarial Review (Medium & High Risk)
Spawn the reviewer agent (`code-reviewer`) using the definition and prompt rules in [code-reviewer-agent.md](../../agents/code-reviewer-agent.md) (or conduct a self-audit following those rules if subagents are unsupported) to inspect the files across the **Five Core Solo-Developer Axes**:
1.  **Correctness:** Are edge cases handled? (e.g., empty arrays, null values, network timeouts). Are errors caught and handled gracefully?
2.  **Security:** Are inputs validated at system boundaries? Are there hardcoded secrets or prompt injection vulnerabilities?
3.  **Performance:** Are there $N+1$ query patterns, unbounded loops, or unnecessary allocations in hot paths?
4.  **Maintainability:** Is the code DRY compliant? Is there redundant copy or hardcoded text that should be consolidated? Does the code align with architecture guidelines?
5.  **Honesty & Completeness:** Are there any placeholder implementations, mock bypasses of validations, or word-count/documentation padding? Every change must be fully implemented.


### Step 4: Active Disproof Testing (High Risk Only)
For High Risk changes, the reviewer must actively attempt to disprove the correctness of the code:
1.  **Hypothesize a Failure Mode:** Think of a boundary condition, race condition, or edge case where the code might fail.
2.  **Write a Disproof Test:** Write a quick, automated test script in your testing suite designed to fail if your hypothesis is correct.
3.  **Verify the Result:** 
    *   If the test **passes**, the author model's code is correct; the doubt is disproved.
    *   If the test **fails**, the bug is confirmed. The author model must fix the code until the test passes.

### Step 5: Resolution & Papercut Logging
*   Classify review findings:
    *   `[Critical]` / `[Important]` — Must fix before committing. Repeat Step 2 to verify changes.
    *   `[Nit]` / `[FYI]` — Minor issues (typos, styling, non-critical warnings).
*   **The Papercut Log (Deduplication & Line Drift Mitigation):**
    To prevent a "death by a thousand papercuts" when working at high velocity, the agent must log all minor (`[Nit]` or `[FYI]`) findings in a root-level `papercuts.csv` file:
    *   *CSV Schema:* `DateFirstSeen,DateLastSeen,File,Line,Scope,Severity,Description,Frequency`
    *   *Scope definition:* Identify the logical area (e.g., `Imports`, `class: Router`, `function: parseDocs`, `global constants`) to help orient the developer and mitigate line drift.
    *   *Deduplication:* Before adding a new row, compare the issue against existing rows. Check for matching `File`, `Scope`, and `Description`. Do NOT use `Line` for deduplication, as line numbers shift as files grow.
        *   If it **is** present: Update `DateLastSeen` and `Line` (updating to the current location), and increment `Frequency` by 1.
        *   If it **is not** present: Append a new row: `Today,Today,File,Line,Scope,Severity,Description,1`.
    *   *Frequency Elevation (10x Rule):* If the frequency of an issue reaches **10**, the agent must elevate it in the final output:
        *   *"ELEVATED PAPER-CUT: The minor issue in [File:Scope] ('Description') has been noticed 10 times. Would you like to resolve this issue now in a separate commit?"*
        *   Do not block the current code review or commit from passing, but raise it explicitly for user decision.
    *   *Papercut Day Threshold (100 Active Issues):* Count the total number of rows in `papercuts.csv`. If the active count reaches **100**, alert the user:
        *   *"WARNING: There are currently X minor issues in papercuts.csv. Consider scheduling a 'Papercut Day' cleanup session."*
*   Once all Critical/Important issues are resolved and tests are green, proceed with the automated commit.

---

## Papercut Triage & Checkup

Over time, minor issues may be fixed as side-effects of refactoring without being explicitly removed from the registry. To keep the papercut list clean and verified, run a **Papercut Checkup** at your discretion (or automatically when the active count exceeds 100 items).

During a triage sweep, execute these steps for every active row in `papercuts.csv`:
1.  **Locate the Target Context:** Open the specified `File` and find the section matching the listed `Scope`. Use the approximate `Line` number as a reference.
2.  **Verify Reproducibility:** Check if the issue described in the `Description` is still present in the codebase.
3.  **Prune Stale Entries:** If the issue has been resolved, if the code block has been deleted, or if the code has been rewritten to fix the concern, **remove the row** from `papercuts.csv`.
4.  **Pruning Summary:** Output a summary detailing how many stale issues were pruned and how many active issues remain in the papercut log.

---

## Differentiating the Papercut List from the Project Backlog

To avoid developer and agent confusion, a strict boundary is enforced between these two files:

1.  **Development-Time Papercut List (`papercuts.csv`):** 
    *   *Purpose:* A lightweight developer tool used *during the building* of this project. It tracks minor nits, code formatting discrepancies, and inline typos identified during manual or automated code reviews.
    *   *Location:* Root of the repository (`papercuts.csv`).
2.  **Scan-Time Project Backlog (`.repo-wizard/backlog.csv`):**
    *   *Purpose:* A user-facing deliverable generated *by* the `repo-wizard` tool when it runs a security or compliance scan on a target repository. It contains high-level governance, auditing, and security scaffolding task recommendations mapped by priorities (High, Medium, Low).
    *   *Location:* Inside the configuration/output folder of the scanned target project (`.repo-wizard/backlog.csv`).

### Future Product Roadmap: `rw-papercut-exporter`
Once core manual testing is complete, the `repo-wizard` CLI will be extended to include a `rw-papercut-exporter` command. This utility will bridge the two concepts: it will parse the product's `backlog.csv` output, extract all recommendations marked as `Priority = 'Low'`, and append them to a local `papercuts.csv` file, allowing target users to easily schedule their own Papercut Day sweeps.

---

## Common Rationalizations

*   **"The tests pass, so the code is perfect."**
    *   *Reality:* Tests only cover what the developer thought to test. This is why Step 4 (writing a new, targeted disproof test) is required for High Risk changes.
*   **"I have 100% test coverage, so everything works."**
    *   *Reality:* High coverage does not guarantee correctness. You can only test the code you wrote, not the code you *should* have written to handle missing requirements or edge cases.
*   **"This is a temp fix; I'll clean it up later."**
    *   *Reality:* On solo-dev projects, "later" rarely comes. If it is minor, add it to the `papercuts.csv` log. If it is significant, address it now.

---

## Red Flags

*   Bypassing the review gate for High Risk changes under time pressure.
*   Letting minor issues slide without logging them to `papercuts.csv` or updating their frequency.
*   Writing PRs larger than 500 lines of code without splitting.
*   Failing to run local validation checks after making edits based on review feedback.
*   Letting the `papercuts.csv` list grow indefinitely without running a triage checkup.
*   Confusing `papercuts.csv` with `backlog.csv` or attempting to log scan-time product recommendations directly into the development-time linter.

---

## Verification

The agent must check off the following before declaring the task finished:
- [ ] Change sizing verified (<500 lines) and risk tier classified
- [ ] Local tests, compilers, and linters run and verified green
- [ ] Code inspected across all five axes (Correctness, Readability, Architecture, Security, Performance)
- [ ] (High Risk Only) Adversarial disproof test written and run
- [ ] All `[Critical]` and `[Important]` issues resolved
- [ ] All minor issues (`[Nit]` and `[FYI]`) logged or updated in `papercuts.csv` with a stable `Scope`
- [ ] Conventional Commit message drafted
