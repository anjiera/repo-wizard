# Technical Design: Zero-Dependency Deterministic Synthesis Engine

This document explains the architecture of the `reports-synthesize.js` engine and how Repo Wizard generates robust, deterministic reports without invoking secondary LLMs for compilation.

## 1. The Challenge of LLM-Driven Synthesis
Many agentic workflows rely on "Synthesizer" or "Writer" agents to gather the output of parallel subagents and compile them into a final document. This approach introduces significant risks:
- **Structural Hallucination:** The LLM might ignore requested formats, omit sections, or alter structural boilerplate.
- **Data Loss:** Context window limitations often cause LLMs to drop or summarize crucial technical details found by subagents.
- **Token Inefficiency:** Passing 30+ subagent observation documents into a single context window is extremely expensive and slow.

## 2. Zero-Dependency Assembly

Repo Wizard solves this by removing the LLM from the assembly process entirely. The final deliverables (`executive-summary.md` and `full-report.md`) are compiled using a strict, zero-dependency Node.js script relying purely on deterministic AST and regex parsing.

### 2.1 Subagent Output Contracts
Each specialist subagent is instructed to output its authentic findings in structured Markdown format, with specific headers for quick wins, structural observations, and backlog tickets.

### 2.2 Extraction & Compilation
The compiler script reads these individual Markdown files from disk and extracts the sections programmatically:
1. **Extraction:** It uses Regex and string slicing to lift the raw observation bullets from each file.
2. **Concatenation:** It concatenates the findings grouped by their respective Quality Pillars.
3. **Boilerplate Interpolation:** It interpolates these dynamic bullet points into hardcoded structural templates (e.g., standardizing the Section 1, Section 2, and Section 3 headers).

### 2.3 Limits & Truncation
To prevent the generated report from becoming unreadable on massive codebases, the synthesis engine strictly enforces paragraph, bullet, and word-count thresholds defined in `scripts/report-constants.js`. If a scan returns 50 security issues, the compiler deterministically slices the list down to the highest-priority `X` items, ensuring the Executive Summary remains a true summary.

## 3. Nuance: Where LLMs Still Operate

> [!IMPORTANT]
> **Deterministic Assembly vs. Hallucination-Free Content**
> While the *assembly* of the document is 100% deterministic, the raw observation bullets being compiled are still written by LLMs (the specialist subagents). Therefore, while we eliminate *structural* hallucinations and context-dropping during compilation, the possibility of an agent hallucinating an observation during the scan still exists. The synthesis engine guarantees the structure, not the underlying truth of the data.

## 4. Architectural Benefits
- **Zero Token Overhead:** Compiling the report consumes zero API tokens.
- **Instantaneous Compilation:** The compilation phase executes in milliseconds.
- **Predictable Layouts:** The generated markdown always maps perfectly to the `md-to-html.js` generator pipeline without formatting anomalies.
