---
description: Scan the codebase for user-facing phrasings that lack legal neutrality and suggest subjective, comfort-based alternatives
---

Invoke the agent-skills:legal-neutrality-auditor skill.
Act as the legal-neutrality-auditor persona.

Before scanning, follow the interactive alignment phase by asking the user:
1. Spoken and programming languages/file types to prioritize (specifically confirming script/UI extensions like .sh, .bat, .swift, .cs).
2. Any specific file extensions they want to include or ignore (clarifying that binary/PDF files are skipped).
3. Disclosing that keywords are dynamically translated from English, displaying both the English keywords and target language translations, and asking if they want to add/remove keywords.

Wait for the user's response before proceeding with codebase scanning, evaluation, and batching.
