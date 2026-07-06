# Technical Design: Questionnaire Schema & State Lifecycle

This document describes the design, schema specification, and state mapping architecture of the interactive repository onboarding questionnaire in the `repo-wizard` system.

---

## 1. System Architecture & State Flow

The onboarding questionnaire decouples the declarative question rules, user answers, and specialist tool execution parameter contracts. 

The lifecycle is divided into three distinct zones:

```
                  +-----------------------------------+
                  |   references/                     |
                  |   questionnaire-spec.json         |  (1. Declarative Questionnaire Rules)
                  +-----------------+-----------------+
                                    |
                                    | Prompts user sequentially
                                    v
                  +-----------------+-----------------+
                  |   .repo-wizard/                   |
                  |   session.json                    |  (2. Progress & Answer State Store)
                  +-----------------+-----------------+
                                    |
                                    | Compiles contracts
                                    v
                  +-----------------+-----------------+
                  |   .repo-wizard/                   |
                  |   manifest.json                   |  (3. Subagent Execution Contracts)
                  +-----------------------------------+
```

### 1.1 Declarative Specification (`questionnaire-spec.json`)
The source of truth for the questionnaire's structure, text, options, branching logic, and contract mapping targets. The Lead Agent parses this JSON dynamically to drive the interactive interview.

### 1.2 Interactive Session State (`session.json`)
Saves the user's explicit selections during the onboarding wizard.
* **Purpose:** Enables session resumability, revisitations, and step-by-step editing without destroying state.
* **Structure:** Retains a simple `answers` object containing direct key-value pairs matching the question IDs.

### 1.3 Execution Manifest (`manifest.json`)
Stores the translated system and specialist subagent parameter contracts.
* **Purpose:** Serves as the payload for the orchestrator script (`run-fallback-sequential-orchestration.js`) and parallel subagent dispatches.
* **Structure:** Separated into a `global` block (metadata like codebase languages) and a `contracts` block (subagent configurations).

---

## 2. Specification Schema (`questionnaire-spec.json`)

The spec file uses a structured JSON schema to categorize questions and handle conditional branching.

### 2.1 Schema Definition
* **`categories`** (Array): Groups questions into logical auditing phases (e.g. `context`, `compliance`, `stack`, `strictness`, `adoption`).
  * `id`: Unique string key.
  * `title`: The header displayed to the user.
  * `subtitle` (Optional): Explanatory secondary text.
  * `questions` (Array):
    * `id`: Unique question key used as the answer identifier.
    * `phrasing`: The exact user-facing question text.
    * `type`: The prompt input format (`boolean`, `single-select`, `multi-select`, `text`).
    * `allowWriteIn` (Optional): Boolean. If true, adds a write-in response option to standard selects (e.g., for custom languages or build systems).
    * `dependsOn` (Optional): Defines conditional routing criteria for branching questions.
    * `options` (Array): List of selectable values.
    * `mapping` (Object): Dictates how the selected value modifies `session.json` and compiles into `manifest.json`.

### 2.2 Branching Mechanics (`dependsOn`)
To mitigate questionnaire fatigue, questions are conditionally activated using the `dependsOn` constraint:
* **`questionId`**: The parent question whose value determines visibility.
* **`value`**: The exact value that triggers the question (e.g., `true` for a boolean flag).
* **`contains`**: Evaluates multi-select arrays, displaying the question if the parent list contains the specified string.

---

## 3. Answer Resolution & Manifest Mapping

Once the interview completes or the user confirms their choices at the review gate, the Lead Agent parses the answers block from `session.json` and evaluates the `mapping` block for each active question:

1. **Direct Values (`$value`)**:
   Replaces the placeholder `$value` with the user's selected choice (or array of choices).
2. **Conditional Activation (`enabled_if_any` / `enabled_if_not`)**:
   Determines if a specialist subagent contract should be generated. For example, if a compliance framework category matching `accessibility` is selected, `accessibility-auditor` is enabled and configured with the selected standard flags.
3. **Lookup Dictionary Mapping**:
   Resolves descriptive user options into technical configuration values (e.g., mapping `"enterprise-paid"` to a `"budget_tier": "enterprise"` contract parameter).

---

## 4. Local vs. Remote Quality Gates

When configuring when and where linters, formatters, and testing suites execute, the questionnaire presents the user with choices regarding local enforcement (Pre-commit Hooks) and remote enforcement (CI Pipelines). 

While both serve the goal of maintaining high-quality code, they operate in distinct environments and fulfill different roles in the developer workflow.

| Feature | Local Pre-Commit Hooks | Remote CI Pipelines |
| :--- | :--- | :--- |
| **Where it Runs** | Locally on the developer's computer. | Remotely on a shared cloud server (e.g., GitHub, GitLab). |
| **Trigger Event** | When running `git commit`. | When pushing code or opening a Pull Request (PR). |
| **Speed** | Instant (runs in seconds). | Minutes (awaits server provisioning and builds). |
| **Main Goal** | Catches simple errors before they are saved to history. | Acts as a centralized, trusted final check before merging. |

### 4.1 Local Pre-Commit Hooks
Pre-commit hooks are scripts configured within the repository's local Git configuration directory (`.git/hooks/`). Repo Wizard configures these hooks using tools like Husky.
* **How it works:** When a developer runs the `git commit` command, Git automatically pauses the commit and runs the configured tools (like ESLint or formatter checks) locally.
* **Feedback loop:** If the tools detect errors, Git immediately aborts the commit. The code is not recorded in Git history, and the developer can fix the issue instantly.
* **Target Audience:** Best for catching quick syntax issues, formatting drift, and hardcoded API keys locally before they are pushed or shared.

### 4.2 Remote CI (Continuous Integration) Pipelines
CI pipelines are automated workflows executed by third-party hosting services (such as GitHub Actions or GitLab CI) on shared servers.
* **Configuration-as-Code Model:** Repo Wizard configures these remote checks programmatically by writing static configuration files directly into the project workspace (e.g. `.github/workflows/ci.yml` or `.gitlab-ci.yml`). No external dashboard interaction is required; the cloud provider automatically triggers these workflows when the files are pushed.
* **How it works:** When a developer pushes commits to a remote server or opens a Pull Request to merge their branch, the hosting platform spins up a clean virtual machine, pulls the code, installs dependencies, and runs the entire suite of linters, security scanners, and tests.
* **Centralized Enforcement:** Because developers can bypass local hooks (e.g. using `git commit --no-verify`), the CI pipeline serves as the ultimate authoritative gatekeeper. It verifies that all code entering the main branch meets the team's defined standards.
