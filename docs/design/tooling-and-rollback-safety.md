# Design Document: Tool Tooling & VCS Rollback Mitigations

This document describes the design patterns and mitigation mechanisms implemented in the **Repo Wizard Tooling Engine** (`tooling-engineer.agent` and associated scripts).

---

## 1. Decoupled Tooling Pattern

Traditional coding agents often attempt to download packages, edit configurations, and write code in a single prompt block. This leads to brittle results when commands fail or syntax is incorrect.

`repo-wizard` decouples this by separating **decision-making** from **execution**:
1. **The Lead Orchestrator**: Decides *which* tools and compliance goals are needed based on user input.
2. **Specialist Agents**: Define the *rules* and linter configurations (e.g. ESLint configs, spectral rulesets).
3. **The Scaffolder Agent (`tooling-engineer.agent`)**: Executes package installations and file writes. It operates strictly on the JSON parameter contract, minimizing prompt rot and keeping execution code deterministic.

---

## 2. Configuration Presets

To facilitate compilation of boilerplate code, the scaffolder utilizes verified code **Presets**. Instead of letting the model guess framework structures, the scaffolder maps framework names to strict template strings:

* **React Router Preset**: Outputs clean `<Route>` and `<BrowserRouter>` blocks.
* **Zustand Store Preset**: Configures Zustand stores with standard `devtools` and `persist` middlewares.
* **Next.js Layout Preset**: Creates standard `app/layout.jsx` files conforming to Next.js routing requirements.

---

## 3. Rollback Mitigation Protocol (VCS Integration)

Because writing configuration files can break local environments, the scaffolder runs a **VCS Rollback loop** on every tooling cycle:

```
        +-------------------------------------------+
        |            Stage 1: Git Checkpoint        |
        |     (Verify repo is clean before run)     |
        +---------------------+---------------------+
                              |
                              v
        +-------------------------------------------+
        |           Stage 2: Write Configs          |
        |  (Scaffolder writes presets & config files)|
        +---------------------+---------------------+
                              |
                              v
        +-------------------------------------------+
        |            Stage 3: Verification          |
        |       (Run npm run build / npm test)      |
        +---------------------+---------------------+
                              |
               +--------------+--------------+
               |                             |
         [Build Passes]                [Build Fails]
               |                             |
               v                             v
        +------+----------------+     +------+----------------+
        | Commit Changes        |     | Execute Rollback      |
        | (Conventional Commits)|     | git reset --hard HEAD |
        +-----------------------+     +------+----------------+
                                             |
                                             v
                                      +------+----------------+
                                      | Report Error to User  |
                                      +-----------------------+
```

### Detailed Recovery Rules
1. **Pre-flight Clean Check**: The runner confirms the working tree has no uncommitted files. If it is dirty, it prompts the user to commit or stash.
2. **Build Verification**: Once configuration files are written and packages are installed, the scaffolder runs compilation audits.
3. **Automated Rollback**: If verification exits with code `1`, the scaffolder executes `git reset --hard HEAD` and `git clean -fd` to cleanly restore the repository, reporting the exact linter/compiler error.
4. **Sandbox Preservation**: During E2E testing (`run-e2e-tests.js`), if a test sandbox fails, the runner preserves the workspace folder (`temp_e2e_sandbox/`) instead of deleting it. This allows developers to inspect logs, check session state, and diagnose environment issues directly.
