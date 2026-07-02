---
name: tool-evaluator
description: Guides agents through screening recommended packages, libraries, and tools against security databases, commit activity indicators, and licensing rules, returning a structured verification verdict. Use when evaluating a third-party tool before recommending it.
---

# Package & Tool Evaluator (`tool-evaluator`)

## Overview
A specialized internal utility workflow designed to dynamically screen package dependencies, libraries, and CLI tools before they are suggested to the user, identifying active CVEs, package abandonment, licensing conflicts, or low reputation scores.

## When to Use
Use this skill when:
- Evaluating a candidate dependency (e.g. npm package, cargo crate, python wheel) for inclusion in the repository.
- Auditing the activity, maintainer health, and license type of a suggested security or testing linter.
- Running checks internally via `repo-wizard.agent`.

## Core Process

### Phase 1: Input Analysis
- **Headless Mode Override:** Refer to Phase 1 of [Headless Mode Override Protocol](../../references/headless-override.md).
Accept the parameters contract containing:
1. **Package Details:** The target package name and optional version.
2. **Project Profile:** The target project release environment (Commercial Closed-Source SaaS, Open Source, Regulated Enterprise).
3. **Tooling Budget:** Free-only vs paid or mixed.

### Phase 2: Metadata Verification
- **Headless Mode Override:** Refer to Phase 2 of [Headless Mode Override Protocol](../../references/headless-override.md).
Evaluate the target package:
1. **Security Scan:** Query public CVE and package vulnerability databases. Discourage tools containing unpatched critical or high severity CVEs.
2. **Maintenance Check:** Check repository commit activity. Flag a warning if no commits in >12 months, and discourage if no commits in >2 years (abandoned).
3. **Licensing Compliance:** Audit licenses (e.g., MIT, Apache 2.0 vs copyleft GPL/AGPL) against the commercial profile, flagging copyleft dependencies in closed-source SaaS targets.
4. **Reputation Assessment:** Confirm community trust via download volumes and GitHub stars.

### Phase 3: Verdict Formatting
- **Headless Mode Override:** Refer to Phase 3 of [Headless Mode Override Protocol](../../references/headless-override.md) (writing observations to `<reportRoot>/.repo-wizard/reports/<repo-name-here>/agents/<repo-name-here>-observations-tool-evaluator-agent.md`).
Construct and return a strict JSON output matching:
```json
{
  "tool_name": "example-package",
  "status": "suggested | warning | discouraged",
  "flags": [
    {
      "severity": "high | medium | low",
      "type": "security | abandonment | reputation | license",
      "message": "Reason details"
    }
  ]
}
```

## Common Rationalizations
- *"A minor CVE is fine if the library is popular."* - Popularity does not override security. Ensure even minor CVEs are documented as warnings.
- *"We can use AGPL packages in our backend since the source code isn't distributed."* - In B2B SaaS, AGPL can still trigger compliance concerns. Always flag viral copyleft as discouraged for commercial profiles.

## Red Flags
- Suggesting a package without running the evaluator first.
- Recommending a package that contains unpatched critical vulnerability flags.
- Returning the verdict as plain conversational text instead of the strict JSON format.

## Verification
Confirm that:
- [ ] Vulnerability databases (CVE, Snyk, package audits) were checked.
- [ ] Repository commit history and maintainer metrics were audited.
- [ ] License rules were validated against the project profile.
- [ ] Output conforms exactly to the JSON schema.
