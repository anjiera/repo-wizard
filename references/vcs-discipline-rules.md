# VCS Hook & Commit Discipline Reference Checklist

This checklist defines standard rules for commit messages, pre-commit/submission hooks, code styling/formatting automation, and automatic copyright header injection across different Version Control Systems (VCS).

---

## 1. Commit Message Discipline (Conventional Commits)

Enforce structured commit messages to enable automated versioning, changelog generation, and linting.

### 1.1 Structural Pattern
Commit messages must follow the format:
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 1.2 Approved Commit Types
- `feat`: A new feature.
- `fix`: A bug fix.
- `docs`: Documentation-only changes.
- `style`: Changes that do not affect the meaning of the code (formatting, white-space, missing semi-colons).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `build`: Changes that affect the build system or external dependencies (e.g. npm, cargo, gradle).
- `ci`: Changes to CI configuration files and scripts.
- `chore`: Other changes that don't modify src or test files.
- `revert`: Reverts a previous commit.

### 1.3 Commit Length & Limits
- **Header Limit:** Keep the subject line to 50 characters or less, capitalized, and written in the imperative mood. No trailing period.
- **Body Limit:** Wrap the body at 72 characters if present. Explain the *what* and *why* rather than the *how*.

---

## 2. Pre-Commit & Submission Hooks

Automate checks locally before code is committed or shared.

### 2.1 Git Hook Scaffolding (Husky & lint-staged)
- [ ] Configure `husky` to manage local Git hooks.
- [ ] Set up a `pre-commit` hook to run `lint-staged` on modified files.
- [ ] Set up a `commit-msg` hook to run `commitlint` validating Conventional Commits.
- [ ] Configure `lint-staged` to run formatters (e.g., Prettier, gofmt, rustfmt) and linters (e.g. ESLint, Clippy) on staged files.

### 2.2 Mercurial Hook Scaffolding (hgrc)
- [ ] Configure pre-commit hooks in `.hg/hgrc` under the `[hooks]` section:
  ```ini
  [hooks]
  # Reject commit if code style checks fail
  precommit.style = npm run lint
  # Reject commit if test suite fails
  precommit.test = npm test
  # Validate commit message format
  pre-txncommit.msg = node scripts/validate-commit-msg.js
  ```

### 2.3 Perforce Submit Triggers (Server & Client side)
- [ ] Document client-side submit scripts or server-side submit triggers (`change-submit` triggers).
- [ ] Enforce trigger script that checks description syntax for conventional prefixes before submit is finalized.
- [ ] Run automated syntax and format validation scripts on opened files in the changelist.

---

## 3. License & Copyright Headers

Ensure intellectual property protection and license clarity by scanning and validating files.

### 3.1 Copyright Header Validation Rules
- [ ] Source code files (e.g., `.js`, `.ts`, `.rs`, `.go`, `.py`, `.kt`) must include a standard copyright block at the top of the file:
  ```
  Copyright (c) [Year] [Owner]. All rights reserved.
  Licensed under the [License Name] License.
  ```
- [ ] Automatically detect if a new file is missing a header and prompt the developer or inject the header template.
- [ ] Parse existing headers to update the copyright year dynamically during major updates if necessary.

### 3.2 Pre-Commit Injection
- [ ] Configure pre-commit hook scripts to scan staged/modified source files for copyright notices.
- [ ] Block commit (or offer auto-injection with developer consent) if required copyright or license notices are missing from source code files.
