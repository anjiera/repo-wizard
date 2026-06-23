# Python PEP 8 Coding Standards & Ruff Configuration

This document defines coding style standards for Python repositories based on the official PEP 8 style guide, utilizing `Ruff` for lightning-fast automated linting and formatting.

---

## 1. Core PEP 8 Conventions

Python codebases must follow these standard readability guidelines:

*   **Indentation:** Use 4 spaces per indentation level. Never use tabs.
*   **Line Length:** Limit all lines to a maximum of 79 characters for code, and 72 characters for docstrings and comments. (Alternatively, 88 characters is acceptable if configured consistently).
*   **Imports:**
    *   Imports should be on separate lines (e.g. import `os` and `sys` separately).
    *   Imports should be grouped in the following order, with a blank line between groups:
        1.  Standard library imports.
        2.  Related third-party imports.
        3.  Local application/library-specific imports.
*   **Whitespace:** Avoid extraneous whitespace inside parentheses, brackets, or before commas and colons.
*   **Naming Conventions:**
    *   Functions, variables, and attributes: `snake_case`.
    *   Classes: `PascalCase`.
    *   Constants: `UPPER_CASE_SNAKE_CASE`.
    *   Non-public methods/variables: `_leading_underscore`.

---

## 2. Automated Ruff Configuration

We use `Ruff` for linting and formatting. It replaces `Flake8`, `black`, `isort`, and `yesqa` with a single, highly performant tool.

### 2.1 Ruff configuration (`pyproject.toml`)
Include this in the root of Python projects:

```toml
[tool.ruff]
# Target Python version
target-version = "py310"

# Line length limit (defaulting to 88 per black guidelines, or 79 for strict PEP 8)
line-length = 88

# Rules enabled
select = [
    "E",   # pycodestyle errors (PEP 8)
    "W",   # pycodestyle warnings (PEP 8)
    "F",   # Pyflakes (syntax/logical errors)
    "I",   # isort (import sorting)
    "N",   # pep8-naming (naming conventions)
    "UP",  # pyupgrade (modern Python syntax)
    "PL",  # Pylint code-smell checks
    "RUF"  # Ruff-specific rules
]

# Rules to ignore (e.g. line-length warnings if black handles it)
ignore = [
    "E501" # Line too long (handled by formatter)
]

[tool.ruff.mccabe]
# Max cyclomatic complexity budget
max-complexity = 10

[tool.ruff.isort]
# Ensure imports are grouped correctly
combine-as-imports = true
force-single-line = false
```

---

## 3. Pre-Commit Integration

To prevent styling errors from reaching version control, configure a pre-commit hook in `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      # Run the linter
      - id: ruff
        args: [ --fix ]
      # Run the formatter
      - id: ruff-format
```

---

## 4. Enforcement Strategy

When onboarding a Python repository:
1.  Check for existing configuration files (`setup.cfg`, `tox.ini`, `pyproject.toml`).
2.  Suggest transitioning from legacy tools (`flake8`, `black`) to `Ruff` for speed and consolidated config.
3.  Scaffold the `pyproject.toml` file with the configuration rules above.
4.  Configure the local pre-commit hook to run `ruff check --fix` and `ruff format`.
