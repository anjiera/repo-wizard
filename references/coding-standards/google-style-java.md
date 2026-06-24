# Google Java Style Guide & Formatting Standards

This document defines standard formatting and style guidelines for Java based on the official Google Java Style Guide, along with configurations to automate enforcement.

---

## 1. Java Google Style (`google-java-format`)

## 3. Java Google Style (`google-java-format`)

For Java repositories, formatting is enforced using the `google-java-format` plugin or command-line tool.
*   **Indentation:** 2 spaces.
*   **Imports:** No wildcard imports (`import static` is permitted).
*   **Column Limit:** 100 columns (instead of the standard 80).
*   **Braces:** K&R style (non-empty blocks do not have a line break before the opening brace).


---

## 2. Enforcement Strategy

When onboarding Java repositories, agents should:
1. Verify if a formatting tool configuration exists.
2. If the developer requests Google Style enforcement, verify style guidelines or automate checks.
3. Configure pre-commit hooks (Husky or lint-staged) to run formatters automatically before commits.
