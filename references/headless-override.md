# Headless Mode Override Protocol

This document defines the canonical Headless Mode Override steps that all specialist agents and skills must follow under `MODE=HEADLESS`.

## Alignment & Target Stack
- Bypass interactive alignment/questionnaires and use best-guess heuristics to infer target standards and stack based on existing codebase clues.

## Codebase Scan & Auditing
- Skip scanning consent prompts and proceed directly to scanning using a shallow clone (Approach A).
- If file read permissions are restricted or specific deep properties are physically unobservable, enforce strict honest boundaries: output `[Data Blocked: Requires Shallow Clone / Local Checkout to evaluate]` for any unobservable details.

## Interactive Tooling Guidance
- Do not perform any package installations or write files in the targeted repository.
- Instead, write all suggested additions, configuration updates, or commit hooks into the generated observations report at `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-<agent-name>.md`.
