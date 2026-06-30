# Code Simplification Suggestions

This document presents targeted suggestions for simplifying the `repo-wizard` codebase. It identifies structural complexity, redundancy, and readability opportunities across the SPA frontend, Node.js backend dashboard server, orchestration script, and validation utilities.

---

## 1. SPA Frontend: [App.jsx](../dashboard/src/App.jsx)

The frontend is a Single Page Application (SPA) currently housed entirely in a single monolithic file of approximately 1,450 lines.

### Key Issues

* **Monolithic UI Component:** The root `App` component is responsible for rendering all screens (Landing, Consent, Folder Picker, Questionnaire Stepper, Running Scan, Success, and Report Viewer) as well as the Directory Browser Modal.
* **Tangled State Management:** State variables for theme toggling (`darkMode`), directory navigation (`browserCurrentPath`), questionnaire answers (`session`), log streams (`logs`), and reports list (`reports`) are all co-located, increasing cognitive load and re-render frequency.
* **Inline Hardcoded Constants:** Static configurations such as `complianceFrameworks` (lines 3–12) and the `steps` array (lines 421–426) are defined directly within or above the UI file.
* **Nested Conditional Rendering:** The UI uses a series of switch-like conditional branches (e.g. `screen === 'consent' && (...)`, `screen === 'landing' && (...)`) spanning hundreds of lines.

### Suggested Simplifications

1. **Deconstruct into Screen Components:**
   Extract each screen block into its own functional component under a new `components/` directory:
   * `components/LandingScreen.jsx`
   * `components/ConsentScreen.jsx`
   * `components/FolderPicker.jsx`
   * `components/QuestionnaireStepper.jsx`
   * `components/RunningScan.jsx`
   * `components/SuccessScreen.jsx`
   * `components/ReportViewer.jsx`
2. **Isolate the Directory Browser Modal:**
   Create a dedicated `components/DirectoryBrowserModal.jsx` and extract its file system browsing logic into a custom React hook `hooks/useDirectoryBrowser.js`. This isolates the fetching and state tracking of folder nodes from the main app flow.
3. **Decouple Configurations:**
   Move `complianceFrameworks` and `steps` into a dedicated configuration file, e.g. `config/stepper.config.js`.
4. **Use a Router or Simple Screen Wrapper:**
   Replace the inline conditional checks in `App.jsx` with a simpler rendering map or router, delegating screen logic entirely to the subcomponents:
   ```jsx
   const screens = {
     consent: ConsentScreen,
     landing: LandingScreen,
     picker: FolderPicker,
     questionnaire: QuestionnaireStepper,
     running: RunningScan,
     success: SuccessScreen,
     reports: ReportViewer,
   };
   ```

---

## 2. SPA Backend Dashboard Server: [dashboard-server.js](../scripts/dashboard-server.js)

The server script is a zero-dependency backend of over 2,000 lines that acts as a router, static asset server, mock report generator, and HTML compiler.

### Key Issues

* **Massive Inline Mock Datasets:** Functions like `generateMockReports` (lines 414–548) and `compileRealReports` (lines 550–784) contain thousands of words of hardcoded markdown text, CEO summaries, and roadmap tables inline.
* **Embedded Configuration Mapping:** Agent mappings, capabilities, and tool relationships are hardcoded inside `createMockContract` (lines 202–283) and `generateManifestFromSession` (lines 285–362).
* **Hand-rolled Static File Server:** The `serveStaticFile` helper manually handles MIME types, ETags, and security checks to serve the Vite build output (lines 145–200).
* **Callback-based Port Scanner:** Finding an open port (lines 81–94) uses callback nesting instead of modern Promise chains.

### Suggested Simplifications

1. **Extract Static Report Templates:**
   Move all markdown report templates and mock text blocks into external template files (e.g. `.repo-wizard/templates/*.md`). Read them dynamically using `fs.promises.readFile`.
2. **Move Mappings to JSON/Config:**
   Move `AGENT_DESCRIPTIONS` (lines 580–607) and the capability-to-tool maps from `createMockContract` into `agents/agent-quality-pillar-mappings.json` or a separate `config/agent-mappings.json` file.
3. **Use Express or Fastify (If Constraints Allow):**
   If the zero-dependency constraint can be relaxed slightly for developer tooling, using a standard lightweight framework like `Polka` or `Express` would eliminate the need for the verbose, hand-rolled static file serving, ETag validation, and router logic. If zero-dependency must be preserved:
   * Split the code into `scripts/dashboard/static-server.js` and `scripts/dashboard/api-router.js`.
4. **Refactor Port Scanner to Promises:**
   Convert `findOpenPort` to use async/await:
   ```javascript
   async function findOpenPort(startPort) {
     for (let port = startPort; port <= 65535; port++) {
       if (await isPortFree(port)) return port;
     }
     throw new Error('No open ports found');
   }
   ```

---

## 3. Lead Orchestration Script: [run-orchestration.js](../scripts/run-orchestration.js)

Coordinates executing the agent suite and managing sub-processes.

### Key Issues

* **Mixed Mock and Real Execution Paths:** The script splits into a mock-execution loop (lines 205–257) and a real execution path (lines 259–400) within the same core function block.
* **Manual Process Output Buffering:** Standard output and error buffers are accumulated manually to print line-by-line logs prefixed with agent names (lines 314–344).
* **Platform-specific Taskkill Hooks:** Custom code handles process tree termination depending on Windows (`taskkill`) or Unix (`SIGKILL`) commands.

### Suggested Simplifications

1. **Separate Execution Strategies:**
   Extract mock execution and CLI execution into separate strategy runner modules (e.g. `scripts/orchestrator/mock-runner.js` and `scripts/orchestrator/cli-runner.js`), referencing a unified interface.
2. **Delegate Process Management:**
   Extract the sub-process spawning, stdout/stderr prefix buffering, and timeout termination into a reusable utility class or helper function `scripts/utils/process-helper.js`. This keeps the orchestrator's main flow focused on contract states.

---

## 4. Validation and Helper Scripts: [validate-deliverables.js](../scripts/validate-deliverables.js) and Validators

A collection of check scripts runs local sanity checks.

### Key Issues

* **Duplicated Inline CSV Parser:** Files like `validate-deliverables.js` implement custom CSV parsing logic (`parseCSV` on lines 41–90) to process the backlog report.
* **In-source Self-testing (Test Pollution):** Validator files such as `validate-contracts.js` (lines 137–273) and `validate-deliverables.js` contain their own inline unit tests (`runSelfTest`) and mock assertion blocks.

### Suggested Simplifications

1. **Extract Shared String/File Helpers:**
   Move `parseCSV`, `countWords`, and `countSentences` into a shared utility file `scripts/utils/string-helpers.js`.
2. **Move Self-tests to the `/tests` Directory:**
   Rather than letting test runners load and run self-test suites embedded inside core validation code (which increases file sizes and pollutes import side-effects), move all self-tests out of the validation scripts and place them cleanly into the [tests](../tests) directory.
