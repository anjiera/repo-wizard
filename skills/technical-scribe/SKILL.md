---
name: technical-scribe
description: Guides agents through scaffolding Nygard-style ADR systems, writing lightweight ADR CLI creation scripts, generating Mermaid architecture diagrams, and configuring Incident Post-Mortem and Cycle Retrospective templates.
---

# Technical Documentation & Architecture Visualization (`technical-scribe`)

## Overview
A specialized repository automation workflow designed to configure Architecture Decision Record (ADR) workspaces, write custom CLI helper scripts for ADR generation, visualize system context/container architectures using GFM-compliant Mermaid diagrams, and establish standardized templates for Incident Post-Mortems and Sprint/Cycle Retrospectives.

## When to Use
Use this skill when:
- Establishing a new repository and setting up technical documentation practices.
- Introducing Architecture Decision Records (ADRs) to document key system design trade-offs.
- Creating architectural diagrams to map components and data flows.
- Scaffolding templates to support Incident Post-Mortems (for production bug-fixes) and Cycle Retrospectives (for sprint review cycles, including *Stop-Start-Continue-Kudos* rituals).
- Integrating documentation quality checks (e.g. PR checklists or lints) into commit/submit hooks.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-technical-scribe.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Scope Definition
Align with the developer on target settings before scanning or writing any files:
1. **ADR Path & Structure:** Establish the target directory for ADRs (typically `docs/decisions/`) and format conventions (Nygard-style sequential numbering).
2. **ADR Helper CLI Language:** Ask the developer for their programming language preference (e.g., Bash shell script, Python, or Node.js) to scaffold a lightweight command-line script for spawning new ADR files.
3. **Architecture Diagrams:** Identify the core components (frontend web apps, backend APIs, databases, message brokers, external services) and connections to document using GFM-compatible Mermaid blocks.
4. **Post-Mortem & Retrospective Formats:** Establish template locations (e.g., under `docs/post-mortems/` and `docs/retrospectives/`). Note that Incident Post-Mortems are used to analyze specific failures, whereas Retrospectives look back at sprint cycles and feature releases (integrating standard Agile questions and the *Stop-Start-Continue-Kudos* kudos ritual).

### Phase 2: Codebase Documentation Audit
Scan the codebase to evaluate current documentation patterns:
1. **Directories Check:** Scan for folders like `docs/`, `decisions/`, `references/`, `wiki/` to check for pre-existing documents.
2. **Configuration Check:** Check package manifests (e.g. `package.json`, `pyproject.toml`) and scripts to see if document generation utilities or testing frameworks are present.
3. **VCS Check:** Verify the active version control system configuration to know how to integrate hooks or setup scripts.

### Phase 3: Interactive Scaffolding Guidance
Draft all documentation and configuration templates. Adhere strictly to these rules:
1. **Explicit Consent:** Ask the user for permission before creating directories or writing helper scripts.
2. **Interactive Code Review:** Display generated script files, diagrams, and templates to the user and prompt them to guide or review changes.
3. **Decoupled Reference Use:** Refer to [Repository Documentation & Architecture Standards](../../references/coding-standards/documentation-standards.md) as the source of truth for all schemas (ADR, Post-Mortems, Retrospectives, and GFM Mermaid styles).
4. **Build/Onboarding Integration:** Once documentation paths and tools are scaffolded, automatically append setup commands or usage examples to the repository's onboarding instructions (`README.md` or setup scripts) for developer review.

### Phase 4: Verification & Validation
1. **Mermaid Validation:** Verify that GFM-compatible Mermaid blocks do not contain syntax errors, HTML tags in labels, or unquoted special characters in node definitions.
2. **CLI Executability:** Ensure any generated ADR helper script has appropriate executable permissions set (e.g., `chmod +x` on Unix systems) or works on Windows terminals.
3. **No Absolute Paths:** Ensure that all markdown documentation links use relative repository paths instead of absolute system paths.

## Common Rationalizations
- *"We don't need a script for ADRs, developers can copy-paste."* - Creating manual ADRs leads to inconsistent numbering, broken templates, and skipped headers. A lightweight script ensures conformance.
- *"A combined post-mortem and retrospective template is simpler."* - Post-mortems evaluate incident failures and technical root causes immediately following a bug-fix, while retrospectives evaluate human and system processes over regular work cycles. Combining them dilutes both.
- *"HTML in Mermaid labels makes them look nicer."* - Standard GFM parsers frequently crash or fail to render Mermaid blocks that contain HTML tags in node labels. Keep node definitions plain-text and quoted.

## Red Flags
- Scaffolding a combined post-mortem/retrospective file instead of two distinct templates.
- Writing a script or creating a directory without asking the developer for consent first.
- Failing to verify GFM compatibility of Mermaid blocks.
- Hardcoding absolute local paths (e.g. `C:\Users\...` or `/home/...`) in Markdown files.

## Verification
To verify the documentation configuration:
1. Ensure the directories exist and contain clean, valid markdown files.
2. Test the ADR helper script by executing it to ensure it creates a sequentially numbered ADR file with the correct Nygard template.
3. Run the project's static validation checks (e.g. `validate-skills.js`, `validate-agents.js`, `validate-commands.js`) to confirm all files are processed without errors.
