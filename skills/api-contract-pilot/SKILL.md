---
name: api-contract-pilot
description: Guides agents through auditing API boundaries, scaffolding OpenAPI/Swagger yaml files, writing gRPC Protobuf schemas, designing GraphQL SDL structures, and integrating Spectral, Buf, or GraphQL Inspector linters. Use when configuring API schemas, Protobufs, GraphQL, or api validation tooling.
---

# API Contract & Schema Governance (`api-contract-pilot`)

## Overview
A specialized API design and governance workflow designed to audit application route handlers and controllers, scaffold strict schemas (OpenAPI/Swagger, gRPC/Protobuf, GraphQL SDL), configure schema validators and backwards-compatibility checkers (Spectral, Buf, GraphQL Inspector), and write integration/contract tests.

## When to Use
Use this skill when:
- Designing new external API boundaries or refactoring client-server communication channels.
- Building REST API specifications (OpenAPI YAML/JSON) to align frontend and backend teams.
- Designing gRPC service structures and Protocol Buffer definition files.
- Modeling GraphQL Schema Definition Language (SDL) schemas.
- Configuring automated contract linters (Spectral rules, Buf check, schema breaking-change validation).
- Invoking the slash command: `/rw-api-contract`.

## Core Process

### Phase 1: Interactive Alignment & Design Choices
Before scaffolding schema files or installing linters, align with the developer on API designs:
1. **Target Protocols:** Identify the active interface paradigms (REST, gRPC/Protobuf, GraphQL).
2. **Contract Versioning:** Determine the API versioning strategy (e.g. URI prefixes like `/v1`, HTTP headers, package version subfolders for protobufs).
3. **Validation Enforcements:** Agree on strict lint rules and backward-compatibility rules (e.g., blocking builds on breaking changes).
4. **Naming Conventions:** Establish naming profiles (e.g. camelCase parameters for REST, lower_snake_case fields for Protobuf, UPPERCASE enum values).
5. **Tool Preference:** Review candidate validation tools (Spectral, Buf CLI, GraphQL Inspector) matching project capabilities and developer workflows.

### Phase 2: Codebase API Scan
Audit the repository to locate active endpoint declarations and contract parameters:
1. **Route Sweeps:** Scan controllers, route definition files, and HTTP handlers to map current REST path configurations.
2. **Schema & Model Check:** Search for existing database tables, validation models (e.g. Zod, Pydantic, struct definitions), or model declarations.
3. **Proto & SDL Scan:** Look for existing `.proto` or `.graphql` files currently in the workspace.
4. **Linter Config Scan:** Search for existing Spectral, Buf, or GraphQL linter configurations.

### Phase 3: Interactive Scaffolding Guidance
Draft all specifications, validator files, and scripts in coordination with `tool-scaffolder.agent`, following these rules:
1. **Explicit Permission:** You must *always* ask the user for permission before recommending or executing package installations, creating spec files, or modifying configuration scripts.
2. **Interactive Code Review:** Display generated OpenAPI YAML templates, Protobuf service schemas, or GraphQL Inspector configurations to the developer, prompting them for review and confirmation.
3. **Decoupled Reference Use:** Use [API Contract & Schema Standards](../../references/api-contract-standards.md) as the source of truth for schema syntax rules, linter options, and breaking-change configurations.
4. **README & Setup Integration:** Once verified, add spec generation and schema linting commands (e.g. `buf lint` or `spectral lint`) to the project's onboarding files (`README.md` or setup guides) for developer review.

### Phase 4: Verification & Validation
1. **Syntax Linting Check:** Run the validation tools on the newly scaffolded specs to confirm that no schema-definition errors are present.
2. **Build Verification:** Run the codebase compilation command to verify that any generated type bindings or compilation steps execute with 0 failures.
3. **Safe Rollback:** If validation tests break after scaffolding, notify the developer of the exact errors. Attempt to debug/resolve the failure, explaining what was tried. Request the developer's explicit consent before instructing the scaffolder to execute a rollback (e.g. `git checkout -- .` and `git clean -fd` for Git, or `hg revert` for Mercurial). Give the developer the opportunity to resolve it manually first.

## Common Rationalizations
- *"We don't need automated schema checks if we have good communication."* - Manual reviews miss subtle schema deviations. Automated linter checks (like Spectral or Buf) guarantee that API guidelines are respected in every pull request.
- *"We can update the API contract directly in production and patch clients later."* - Deploying breaking API changes without deprecation cycles crashes client applications. Strict breaking-change checkers prevent accidental runtime failures.

## Red Flags
- Scaffolding a REST API specification where path parameters (e.g. user ID lookup) are completely missing parameter types, validation rules, or format rules (like UUID).
- Creating Protobuf definitions that reuse active field index tags (e.g., changing field types on tag 1 instead of deprecating or allocating a new tag index).
- Scaffolding schema files that use absolute folder paths or references, causing validation failures in foreign CI workspaces.

## Verification
To verify the API contract setup:
1. Validate that the OpenAPI/Protobuf/GraphQL files lint cleanly under Spectral/Buf/GraphQL Inspector tools.
2. Verify that testing generators produce correct server/client types from the spec file without typescript or compilation failures.
3. Run the validation suite (`validate-skills.js`, etc.) to confirm everything is consistent.
