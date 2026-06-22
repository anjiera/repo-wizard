# Contributing to Repo Wizard

We welcome contributions to expand our agent capabilities, checklists, and configurations! To maintain production-grade quality, please follow these guidelines when adding or modifying files in this plugin.

---

## 🛠️ How to Add a New Skill

1. **Create the Skill Folder:** Add a new kebab-case directory under `skills/` (e.g., `skills/my-new-audit/`).
2. **Write SKILL.md:** Every skill folder must contain a `SKILL.md` file. It must have a valid YAML frontmatter block containing `name` and `description` (used by agents for trigger matching).
3. **Keep it under 500 lines:** Avoid bloat in `SKILL.md` to conserve agent context tokens. If you have detailed checklists or rules, place them in a separate reference markdown file under `references/`.
4. **Follow the Standard Structure:**
   * **Overview:** What the skill does.
   * **When to Use:** Explicit triggers.
   * **Process:** Sequential, numbered steps for the agent to execute.
   * **Common Rationalizations / Red Flags:** Trap scenarios where agents might cut corners, and how to avoid them.
   * **Verification:** A checklist for confirming the skill succeeded.

---

## 🧑‍💻 How to Add a New Persona

1. **Create the Agent File:** Add a markdown file under `agents/` named after the role (e.g., `agents/accessibility-auditor-agent.md`).
2. **Anatomy of a Persona:**
   * **Role & Focus:** Define the persona's core area of expertise.
   * **Scope of Work:** What tasks they are authorized to perform.
   * **Verification Steps:** How they confirm their output is secure and compliant.
   * **Style Guidelines:** Clear instructions on output tone and formatting.

---

## 🔌 Integrating Slash Commands

When introducing a new command, configure configuration bindings across all client environments:
* **Antigravity CLI:** Create/edit `commands/new-command.toml`.
* **Claude Code:** Create `.claude/commands/new-command.md`.
* **Gemini CLI:** Create `.gemini/commands/new-command.toml`.

---

## 🧪 Testing Your Changes

* Validate that all `SKILL.md` files contain correct YAML frontmatter names and descriptions.
* Ensure all links use absolute paths with the `file://` scheme to ensure they are clickable in client chats.
