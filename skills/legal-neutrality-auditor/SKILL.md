---
name: legal-neutrality-auditor
description: Identifies areas to improve legal neutrality in the UI.
---

# Legal Neutrality Scanner

## Overview
A specialized engineering workflow designed to audit user-facing UI elements, messages, and configurations to ensure they remain legally neutral, subjective, and comfort-oriented, minimizing liability risk (e.g., avoiding statements that can be construed as medical, health, or financial advice) without making direct code modifications.

---

## When to Use

### Triggering Conditions
* Auditing user-facing UI labels, descriptions, and dashboard statuses.
* Writing or reviewing warning banner messages, alerts, and system notification copy.
* Designing onboarding documentation, terms of service dialogs, or metadata descriptions.
* Reviewing OS script files (`.bat`, `.sh`, `.ps1`) or application wrappers containing terminal output displayed to users.

### When NOT to Use
* Reviewing internal codebase symbols (e.g., private variable names, function declarations, database columns) that are never exposed to the end-user.
* Attempting to scan binary files, images, PDFs, ZIP archives, or compiled assets (these require manual human proofreading).

---

## Core Process

### Headless Scan Override
If the active environment is headless (`MODE=HEADLESS`), bypass all interactive alignment questions, consent loops, and manual test approvals. Follow the automated best-guess configuration parameters and report file outputs defined in the [Headless Mode Override Protocol](../../references/headless-override.md). Specifically, write your specialist observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-legal-neutrality-auditor.md` under Phase 3 / Phase 4.

### Phase 1: Interactive Alignment
You **MUST** initiate an interactive discussion with the user before executing any file reads or keyword searches. If the developer has no preference or is unsure of the target languages, file extensions, or keywords, suggest candidate defaults dynamically.
1. **Target Language(s)**: Ask which spoken language (e.g., English, Spanish, Japanese) and programming filetypes (e.g., Kotlin, XML, Swift) you should prioritize.
2. **Exclusion Check**: State which file extensions you plan to analyze by default based on the programming language, and explicitly ask the user if there are any specific file extensions they want to include or ignore.
3. **Keyword Translation Disclosure**:
   - Inform the user that safety-checking keywords are dynamically loaded from the shared wordlist in [legally-dubious-words.json](../../references/legally-dubious-words.json).
   - Read the keywords from the JSON file, translate them dynamically using your built-in translation/linguistic knowledge, and list both the English keywords and their translated equivalents for user review.
4. **Keyword Customization**: Ask the user if they want to add or remove any specific keywords of concern before the scan begins.
5. **Wait for Approval**: Stop and wait for the user's response before proceeding.

### Phase 2: Codebase Scanning
Once parameters are approved:
1. **Search Execution**: Run search/grep queries for the final customized list of keywords in the permitted text file extensions.
2. **Binary Filtering**: Ensure you ignore non-text or binary files (PDFs, ZIPs, images, executables).
3. **Variable/Symbol Filter**: Ignore database queries, internal configuration keys, or code symbols that do not get rendered in the UI.

### Phase 3: Analysis & Batching
For each match found:
1. **Assess Legal Risk**: Evaluate why the phrasing lacks neutrality (e.g., "Telling the user the weather is 'Safe & Pleasant' could be construed as a health or safety guarantee, exposing the app to liability if the user experiences heat stress"), referring to the [Legal Phrasing Dictionary & Reference Guide](../../references/legal-phrasing-dictionary.md) as your source of truth for high-liability phrases and recommended alternatives.
2. **Suggest Alternatives**: Provide up to **5 alternative phrasings** that use subjective, comfort-based language (e.g., "Safe Now" → "Within Comfort Range", "Conditions Met", "Temp: OK").
3. **Batch Presentation (Limit 20)**:
   - If the scan flags more than 20 phrases, you **must** group them by component/theme.
   - Present them in batches containing **no more than 20 items per batch**.
   - Show only the first batch and request explicit feedback before showing subsequent batches. Do not write any code modifications.

---

## Common Rationalizations

| Rationalization | Reality |
| :--- | :--- |
| "This is just descriptive info, not active medical advice." | Passive text like "safe walk window" can still establish high-liability user expectations if weather or health conditions shift. |
| "The user set their own limits, so the safety call is on them." | Laypeople configure the thresholds, but the UI labeling is owned by the app; labeling it as "safe" implies professional verification. |
| "I should automatically replace the unsafe strings in the code." | Never modify files directly. Legal phrasings require human review and legal alignment first. |
| "I can't audit this language without a static translation file." | You must dynamically translate the keywords on-the-fly using your LLM multilingual knowledge. |
| "I can start scanning right away without confirming file types or keywords." | Skipping the confirmation leads to scanning unnecessary files or missing custom keywords the user is worried about. |

---

## Red Flags
* Modifying source files directly without user approval.
* Presenting more than 20 flagged items at once, overloading the user.
* Attempting to parse binary/PDF files instead of skipping them.
* Initiating the scan without listing the translated keywords and file types for user review first.

---

## Verification

After completing the process, confirm:
- [ ] Spoken and programming languages/file types were explicitly confirmed with the user (including OS-specific scripts like `.bat`, `.sh`).
- [ ] safety/health keywords (English and target language equivalents) were listed for user review.
- [ ] The exact file extensions to be analyzed were explicitly stated, and the user was given the chance to modify the scan scope.
- [ ] The scan excluded binary files (PDFs, images, executables).
- [ ] Flagged strings are grouped by component and restricted to batches of ≤ 20.
- [ ] Up to 5 subjective, comfort-based alternatives were suggested for each flagged phrase.
- [ ] Verification confirms no files were modified directly.
