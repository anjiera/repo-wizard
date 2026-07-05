# Markdown Duplication Validator Design

This document describes the design and implementation of the Markdown Duplication Validator, a verification utility built into the documentation analysis suite.

## Purpose

The Markdown Duplication Validator is designed to identify and flag repetitive text patterns within and across markdown files in the repository. Its primary goal is to help maintain DRY (Don't Repeat Yourself) compliance in prompt instructions, checklists, and references. It flags duplication so that redundant sections can be migrated to unified reference files under `references/`.

## Architecture & Algorithm

The validator executes as a stage within the `validate-project-docs.js` pipeline. It operates by scanning all markdown (`.md`) files in targeted folders (`skills/`, `agents/`, `references/`, `docs/`) and applying the following processing pipeline:

### 1. Extraction and Filtering
Content is parsed by splitting files into paragraph blocks using blank lines. The validator filters out blocks that do not represent general prose, including:
- Standard markdown headers (lines starting with `#`).
- Markdown table structures (lines starting with `|`).
- Code blocks (sections enclosed in triple backticks).
- Horizontal separators.
- Blocks falling below a size threshold (less than 60 characters or 10 words) to avoid flagging short bullets or standard headings.

### 2. Normalization
Each remaining text block is normalized to reduce formatting noise:
- Stripping markdown hyperlinks (mapping `[text](url)` to `text`).
- Removing bold and italic delimiters (`**`, `*`, `__`, `_`).
- Stripping list prefixes (ordered/unordered).
- Stripping punctuation characters.
- Converting all text to lowercase.
- Collapsing consecutive whitespaces.

### 3. Verification Rules
The normalized blocks are validated against two rules:
- **Intra-File Duplication**: Flags a paragraph if it occurs multiple times within a single file.
- **Inter-File Duplication**: Flags a paragraph if it appears across three or more different markdown files.

### 4. Whitelisting
To support standard, legally required disclaimers (such as the Developer Empowerment Disclaimer or No Advice Provided Disclaimer), a static whitelist of normalized strings is maintained. Any block matching or containing a whitelisted entry is exempt from duplication alerts.

## Verification

Robustness is verified via unit tests that construct temporary markdown files with:
- Unique content (verifying clean validation passes).
- Repeated text within a single file (verifying intra-file warning triggers).
- Identical text across multiple separate files (verifying inter-file consolidation prompts).
