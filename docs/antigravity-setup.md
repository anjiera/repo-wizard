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
The command automatically invokes the `legal-neutrality-auditor` skill and adopts the `legal-neutrality-auditor-agent` auditor persona.

### 2. On-Demand Skill Activation
Antigravity automatically discovers the `skills/` directory. If you ask the agent:
> *"Audit my warning alert strings for liability"*
> *"Look at this UI description and verify it has neutral phrasing"*

The agent will detect the intent, prompt you for permission to load the `legal-neutrality-auditor` skill, and start the interactive alignment dialogue.
