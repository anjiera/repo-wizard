# Using Repo Wizard with GitHub Copilot

Before getting started, run the repository setup script to check prerequisites, configure Git hooks, and verify code integrity:
```bash
# On Unix / macOS / Git Bash
./setup.sh

# On Windows (PowerShell)
.\setup.ps1
```

GitHub Copilot does not support native plugin slash commands like Antigravity, but you can easily load the personas and skills as project-wide guidelines or reference them directly in Copilot Chat.

---


## Method 1: Project-Wide Guidelines (Recommended)

GitHub Copilot reads `.github/copilot-instructions.md` at the root of a workspace to align its responses and coding style with your preferences.

1. Create a `.github/` folder in your project root.
2. Create `copilot-instructions.md` inside it.
3. Paste or link the contents of the agent persona you want to enforce. For example:
   ```markdown
   # Legal Neutrality Instructions
   
   [Copy and paste the instructions from repo-wizard/agents/legal-neutrality-auditor-agent.md]
   ```
   Copilot will now respect these legal neutrality rules and validation checkpoints for all UI-related file generations in the project.

---

## Method 2: On-Demand References in Copilot Chat

When using the Copilot Chat panel in VS Code or JetBrains, you can reference specific skill files using the `#` symbol:

1. Open the Chat Panel.
2. Reference the skill file using `#file`:
   > *"Scan my file `strings.xml` for liability using `#file:legal-neutrality-auditor.md`"*
   > *"Give me 5 neutral alternatives for this wording based on the rules in `#file:legal-neutrality-auditor-agent.md` and `#file:legal-phrasing-dictionary.md`"*
3. Copilot will read the selected files and follow their step-by-step processes exactly.
