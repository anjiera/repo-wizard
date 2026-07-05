# Using Repo Wizard with Google Antigravity CLI (`agy`)

You can install the `repo-wizard` package as a native plugin in the Google Antigravity CLI, giving the AI agent native access to structured workflows, specialized auditor personas, and custom slash commands.

---

## Installation

### Option 1: Install from your Local Clone (Recommended for Development)

1. Clone the repository to your system:
   ```bash
   git clone https://github.com/anjiera/repo-wizard.git
   ```
2. Run the repository setup script to check prerequisites, configure Git hooks, and verify code integrity:
   ```bash
   # On Unix / macOS
   ./setup.sh

   # On Windows
   .\setup.ps1
   ```
3. Install the plugin using `agy`:
   ```bash
   agy plugin install /path/to/repo-wizard
   ```

   This validates the directory structure and installs the skills, personas, and commands into your global Antigravity config directory.

### Option 2: Install from Remote Git Repository

Directly install the plugin by pointing `agy` to your remote repository URL:
```bash
agy plugin install https://github.com/anjiera/repo-wizard.git
```

Verify that the plugin is active:
```bash
agy plugin list
```

---

## How to use the Legal Neutrality Scanner

Once installed, you can trigger a legal neutrality check in two ways:

### 1. Slash Command
Type the custom slash command in the chat input:
```bash
/rw-legal-neutrality-auditor
```
The command automatically invokes the `legal-neutrality-auditor` skill and adopts the `legal-neutrality-auditor` auditor persona.

### 2. On-Demand Skill Activation
Antigravity automatically discovers the `skills/` directory. If you ask the agent:
> *"Audit my warning alert strings for liability"*
> *"Look at this UI description and verify it has neutral phrasing"*

The agent will detect the intent, prompt you for permission to load the `legal-neutrality-auditor` skill, and start the interactive alignment dialogue.

---

## Custom Command Permissions (Bypassing Approval Gates)

By default, the Antigravity sandbox environment requires you to explicitly review and click "Approve" for every command execution (e.g. running scripts like validation tests or codebase line counting scripts).

If you plan to run headless scans frequently, clicking "Approve" for each sub-process script can cause questionnaire fatigue. You can pre-authorize these script command prefixes to run silently without prompting you.

### Authorizing Script Paths
When you run the plugin, you can authorize command prefixes using the permission tool or in your Antigravity config file. For example:
- To allow running helper validator scripts: Authorize prefix `node scripts/`
- To allow running E2E tests: Authorize prefix `node scripts/run-e2e-tests.js`
- To allow running the LOC count utility: Authorize prefix `node solo-dev-toolkit/scripts/count-loc.js`

---

## Running Commands via the CLI

When executing slash commands like `/repo-wizard` directly from the command line using the `agy` CLI, you can choose between two output modes:

### 1. Print Mode (`-p` / `--print`)
This runs the prompt non-interactively and prints the final result only after the command completes. Because executing a full scan with parallel subagents can exceed the default 5-minute timeout of `agy`, you should explicitly increase the timeout limit using `--print-timeout`:
```bash
agy --dangerously-skip-permissions --print-timeout 10m -p "/repo-wizard --headless"
```

### 2. Interactive Mode (`-i` / `--prompt-interactive`)
This runs the command and streams live progress, agent thoughts, and tool executions to the terminal in real-time. This is the recommended option to monitor scans as they run:
```bash
agy --dangerously-skip-permissions -i "/repo-wizard --headless"
```

> [!NOTE]
> **Native Chat UI:** Running `/repo-wizard` within the Antigravity native chat window in your IDE or editor does not face command-line timeout limits, as the session is persistent and streams responses continuously.
