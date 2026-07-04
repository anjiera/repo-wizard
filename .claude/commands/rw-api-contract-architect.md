---
description: Configure OpenAPI specifications, gRPC Protobuf schemas, GraphQL SDL models, and integrate Spectral, Buf, or GraphQL Inspector linter gates
---

Invoke the agent-skills:api-contract-architect skill.
Act as the api-contract-architect persona.

Before auditing, follow the interactive alignment phase by asking the user:
1. Target API paradigms (REST, gRPC, GraphQL).
2. API versioning policies and URL path prefix conventions.
3. Strict schema validation rules and backward-compatibility gates.
4. Parameter and field naming casings (camelCase, snake_case).
5. Validation utilities (Spectral, Buf CLI, GraphQL Inspector) to set up.

Wait for the user's response before proceeding with API contract audits, scaffolding, and verification.
