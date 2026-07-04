# Using Repo Wizard with Claude Code

You can load `repo-wizard` as a local plugin in **Claude Code** to make custom developer personas and command-line slash commands available during your coding sessions.

---

## Installation

To load the plugin locally:

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
3. Start your Claude Code session by pointing to the plugin directory:
   ```bash
   claude --plugin-dir /path/to/repo-wizard
   ```


Verify that the plugin is loaded by typing `/plugins` in the chat window.

---

## Using commands and personas

Once loaded, Claude Code will register the custom command:

```bash
/rw-legal-neutrality-auditor
```

Typing this slash command will invoke the `legal-neutrality-auditor` skill and delegate the execution to the `legal-neutrality-auditor` persona, starting the interactive scoping alignment before scanning.
