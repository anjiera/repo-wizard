# Feature Test Plan: Interactive Dashboard & API Server

This test plan defines the manual verification procedure for the **Repo Wizard Interactive Dashboard** and its Express API backend.

---

## Prerequisite Setup
1. Open a command prompt or terminal in the repository root.
2. Ensure you do not have an existing `.repo-wizard/session.json` file (delete it if present to simulate a fresh user).

---

## Test Steps & Scenarios

### Scenario 1: Backend API Port Binding & Scan
- [ ] **1. Start the server**: Run `node scripts/dashboard-server.js`.
  - *Expected*: The server binds successfully. Output shows:
    ```text
    Repo Wizard Interactive Dashboard is Live!
    Access URL: http://localhost:3000
    ```
- [ ] **2. Port conflict simulation**: Open another terminal and run `node scripts/dashboard-server.js` again.
  - *Expected*: The second server binds to port `3001` (or another incremented port) and outputs:
    ```text
    Repo Wizard Interactive Dashboard is Live!
    Access URL: http://localhost:3001
    ```
  - Close the second server terminal when done.

### Scenario 2: Web Dashboard Client Loading
- [ ] **3. Access the browser**: Navigate to `http://localhost:3000` in your web browser.
  - *Expected*: The web app loads the **Workspace Picker** screen.
- [ ] **4. Check Developer Tools Console**: Press F12 or right-click -> Inspect, and open the Console tab.
  - *Expected*: No red error logs or React rendering exceptions.

### Scenario 3: Picking a Workspace & Path Validation
- [ ] **5. Enter invalid path**: Type a non-existent directory path (e.g. `z:/not-a-folder`) and click **Select**.
  - *Expected*: The UI displays a clear path validation error (e.g., "Directory does not exist").
- [ ] **6. Enter valid path**: Type the absolute path to your local `repo-wizard` folder and click **Select**.
  - *Expected*: The UI validates the path, displays success, and enables the "Begin Profiling" button.

### Scenario 4: Questionnaire Navigation & Session Save
- [ ] **7. Onboarding Steps**: Click **Begin Onboarding**. Go through the steps:
  - Step 1: Select **Enterprise** context.
  - Step 2: Select **SOC 2** and **GDPR** compliance checklists.
  - Step 3: Select **React** framework.
  - Step 4: Toggle the Friction Slider to **Strict**.
  - Step 5: Select linter scanners (e.g. **ESLint**, **Semgrep**).
- [ ] **8. Save choices**: Click **Save Settings**.
  - *Expected*: The UI shows a "Settings saved successfully" notification.
- [ ] **9. Verify session.json file**: Open `.repo-wizard/session.json` in your code editor.
  - *Expected*: Verify that the file was created and contains the exact settings you selected in the web form:
    ```json
    {
      "repo_path": "...",
      "onboarding_completed": false,
      "answers": {
        "context": "enterprise",
        "compliance_standards": ["SOC2", "GDPR"],
        "tech_stack": "React",
        "friction_level": "strict"
      }
    }
    ```

### Scenario 5: Running Orchestration from UI
- [ ] **10. Trigger execution**: Click the **Start Scaffolding** button on the final dashboard page.
  - *Expected*: The UI indicates execution has started. The backend terminal shows orchestration spawning logs.
