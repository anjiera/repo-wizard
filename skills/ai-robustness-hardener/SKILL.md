---
name: ai-robustness-hardener
description: Guides agents through auditing AI/ML components and LLM integrations, configuring secure input/output guardrails, mitigating OWASP LLM vulnerabilities, and tooling model bias and fairness auditing metrics. Use when auditing AI components, setting up prompt injection filters, or validating model bias.
---

# AI Robustness & ML Governance Auditing and Tooling (`ai-robustness-hardener`)

## Overview
A specialized engineering workflow designed to audit artificial intelligence, machine learning, and Large Language Model (LLM) component integrations, configure secure input/output filtering guardrails, mitigate OWASP LLM Top 10 vulnerabilities, and establish model bias/fairness regression testing suites.

## When to Use
Use this skill when:
- Auditing applications that integrate Large Language Models (LLMs) or machine learning pipelines.
- Designing prompt sanitization and injection detection rules.
- Tooling middleware filters for PII redaction or toxicity scanning in model inputs/outputs.
- Establishing model agency constraints and human-in-the-loop validation steps.
- Configuring model fairness checks and bias auditing metrics (e.g., Disparate Impact ratio) in CI/CD.
- Invoking the slash command: `/rw-ai-robustness-hardener`.

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-ai-robustness-hardener.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment & Strategy
Before conducting codebase scans, align with the developer on:
1. **Model Stack & Frameworks:** Identify whether they use external APIs (e.g. OpenAI, Anthropic, Gemini) or local models, and their orchestrators (LangChain, LlamaIndex, etc.).
2. **Regulatory Risk Profile:** Clarify if they are subject to strict regulations like the EU AI Act (e.g., High-Risk classifications for biometric or infrastructure systems).
3. **Execution Environment:** Establish where the guardrails (runtime middleware vs. pre-commit) and fairness checks (CI/CD pipelines) should execute.

### Phase 2: Codebase Data Auditing
Scan the codebase to evaluate AI/ML components:
1. **Prompt & Context Configurations:** Audit files defining system prompts, templates, and API integrations.
2. **Tool/Plugin Access:** Scan for LLM tools or plugins that have file write, shell execution, or network capabilities.
3. **Dependencies:** Scan package manifests (`package.json`, `Cargo.toml`, `pyproject.toml`) for AI SDKs or validation frameworks.

### Phase 3: Interactive Tooling Guidance
Draft all configurations and scripts in coordination with `tooling-engineer.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, creating script files, or modifying configuration scripts.
2. **Explain Options & Tradeoffs:** Present guardrail options (e.g., regex/semantic PII scrubbing, structured JSON parser formats) and explain their performance and latency trade-offs.
3. **Decoupled Reference Use:** Use [AI Robustness & Compliance Checklist](../../references/ai-robustness-checklist.md) as the source of truth.
4. **Onboarding Integration:** Add setup commands, environment variables, or run steps to the project's onboarding documentation (`README.md` or setup scripts) and present the changes for review.

### Phase 4: Verification & Validation
1. **Parser & Format Verification:** Run compilation or validation checks to ensure JSON schemas or middleware loaders compile and parse correctly.
2. **No Absolute Paths:** Ensure that all configuration and script imports use relative paths instead of absolute system paths.
3. **Safe Rollback:** If verification checks fail, notify the developer of exact errors. Attempt to debug the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"Prompt injection isn't a problem since we don't display LLM outputs to other users."* - Indirect prompt injection can still compromise the system by triggering tools or leaking context. Enforce secure input/output boundaries.
- *"We don't need bias checks since our training dataset is proprietary."* - Statistical bias can be introduced unintentionally. Enforce fairness testing gates in release pipelines.

## Red Flags
- Concatenating raw user inputs directly into system instructions without structural delimiters.
- Granting LLMs write permissions or script execution capabilities without human approval gates.
- Storing API keys or model endpoints directly in source files instead of environment variables.

## Verification
To verify the setup:
1. Confirm the guardrail libraries or validation scripts compile cleanly and do not crash target host routers.
2. Run test inputs (e.g. basic jailbreak keywords) to ensure inputs are successfully blocked or sanitized.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
