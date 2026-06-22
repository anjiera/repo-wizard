# repo-wizard

Repo Wizard is a collection of production-grade security, data privacy, accessibility, testing, and documentation skills for AI coding agents.

## Project Structure

```
skills/           → Core skills (SKILL.md per directory)
agents/           → Reusable agent personas (legal-neutrality-agent, repo-wizard-agent, etc.)
.claude/commands/ → Claude Code slash command configurations
.gemini/commands/ → Gemini CLI slash command configurations
commands/         → Antigravity CLI slash command configurations
references/       → High-density supplementary audit checklists and dictionaries
docs/             → User-facing onboarding and setup guides
```

## Conventions

- Every skill lives in `skills/<name>/SKILL.md` using kebab-case.
- Every skill must have a YAML frontmatter block containing a unique `name` and descriptive `description` for trigger matching.
- Skill descriptions must follow the pattern: *"Describes what the skill does. Use when..."* to help matching engines parse intent.
- Every skill file must maintain: Overview, When to Use, Process, Common Rationalizations, Red Flags, and Verification sections.
- Large references (checklists, phrasing databases) exceeding 100 lines must be saved under `references/`, not within the skill folder itself.
- Supporting scripts under a skill's `scripts/` folder should be executable Bash or PowerShell scripts with error handling (`set -e` in bash).

## Command References

Since this is a documentation and configuration repository, build commands are not applicable, but file structure and lint validation must be performed manually before packaging.
- Check that all skills contain valid YAML frontmatter.
- Verify all links inside markdown files are absolute using the `file://` scheme.
