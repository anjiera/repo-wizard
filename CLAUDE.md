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
- Git Commit Messages: Always use the Conventional Commits style for writing git commit messages (e.g. `feat(api): ...`, `fix(embedded): ...`, `refactor(agents): ...`).

## Command References

Since this repository contains agent instructions, custom CLI commands, validation test suites, and judge evaluations, traditional compilation build steps are not required, but environment setup, Git hook installations, and test/validation suites are automated.

- Setup environment: `./setup.sh` (Unix/macOS) or `.\setup.ps1` (Windows)
- Validate all skills: `node scripts/validate-skills.js`
- Validate all commands: `node scripts/validate-commands.js`
- Validate agent rubric coverage: `node scripts/validate-agents.js`
- Run dynamic agent evaluations (requires `GEMINI_API_KEY`): `node scripts/run-evals.js`
- Validate plugin structure: `agy plugin validate .`
- Verify all links inside markdown files use relative repository paths instead of absolute system or `file://` paths.


