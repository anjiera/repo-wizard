# API Contract & Schema Standards

This document serves as the repository's source of truth for API schemas, including OpenAPI/Swagger specifications, gRPC Protocol Buffers definitions, and GraphQL schemas, as well as their corresponding build-time linter and contract verification setups.

---

## 1. OpenAPI / Swagger (REST)

REST APIs should be documented using OpenAPI 3.0 or 3.1 specifications in YAML or JSON format. These schemas must be linted at build-time using `Spectral` to ensure naming conventions and design best practices are enforced.

### 1.1 OpenAPI 3.0/3.1 Specification Template (`openapi.yaml`)
```yaml
openapi: 3.1.0
info:
  title: Core Service API
  version: 1.0.0
  description: API specifications for the user management and core service layer.
paths:
  /users/{id}:
    get:
      summary: Retrieve a user profile
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          description: Unique user ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: User profile details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/400BadRequest'
        '404':
          $ref: '#/components/responses/404NotFound'
        '500':
          $ref: '#/components/responses/500ServerError'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - role
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, member, guest]

  responses:
    400BadRequest:
      description: The provided request parameters were invalid.
    404NotFound:
      description: The requested resource could not be found.
    500ServerError:
      description: Internal server error.
```

### 1.2 Spectral Linter Configuration (`.spectral.yaml`)
Enforce REST guidelines using Spectral:
```yaml
extends: [[spectral:oas, recommended]]
rules:
  # Enforce operation IDs on all paths for code generator compatibility
  operation-operationId: error
  # Enforce camelCase or kebab-case parameter naming conventions
  parameter-names-style:
    given: "$..parameters[*].name"
    then:
      function: pattern
      functionOptions:
        match: "^[a-z]+([A-Z][a-z]+)*$|^[a-z]+(-[a-z]+)*$"
```

---

## 2. gRPC / Protocol Buffers (RPC)

For high-performance, contract-first service-to-service communication, use gRPC and Protocol Buffers v3. Linters like `Buf` must be used to ensure backwards compatibility and schema validity.

### 2.1 Proto3 Schema Specification Template (`service.proto`)
```protobuf
syntax = "proto3";

package mycompany.v1;

option go_package = "github.com/mycompany/api/v1;apiv1";
option java_multiple_files = true;
option java_package = "com.mycompany.api.v1";

// UserProfileService provides RPC methods to manage user profiles.
service UserProfileService {
  // Retrieves a user profile by their unique ID.
  rpc GetUserProfile(GetUserProfileRequest) returns (GetUserProfileResponse);
}

// Request parameters to look up a user.
message GetUserProfileRequest {
  // The unique UUID string of the user.
  string user_id = 1;
}

// Response containing the user information.
message GetUserProfileResponse {
  string user_id = 1;
  string email = 2;
  
  enum Role {
    ROLE_UNSPECIFIED = 0;
    ROLE_ADMIN = 1;
    ROLE_MEMBER = 2;
    ROLE_GUEST = 3;
  }
  Role role = 3;
}
```

### 2.2 Buf Configuration (`buf.yaml`)
Integrate Buf for linting and breaking-change checks:
```yaml
version: v1
name: buf.build/mycompany/api
lint:
  use:
    - DEFAULT
  except:
    - FIELD_NAMES_LOWER_SNAKE_CASE
breaking:
  use:
    - FILE
```

---

## 3. GraphQL Schemas (SDL)

GraphQL implementations require strict validation of Schema Definition Language (SDL) schemas to prevent backward-incompatible modifications and verify query structures.

### 3.1 GraphQL SDL Specification Template (`schema.graphql`)
```graphql
type Query {
  # Retrieve a user profile by their ID
  user(id: ID!): User
}

type Mutation {
  # Update user registration details
  updateUser(id: ID!, input: UpdateUserInput!): User!
}

# The user registration object representation
type User {
  id: ID!
  email: String!
  role: UserRole!
}

enum UserRole {
  ADMIN
  MEMBER
  GUEST
}

# Input data contract for updating a user
input UpdateUserInput {
  email: String
  role: UserRole
}
```

### 3.2 GraphQL Inspector CI Script (`scripts/check-graphql-schema.js`)
Use `@graphql-inspector/core` to validate schemas against local references and catch breaking changes in build scripts:
```javascript
const { diff } = require('@graphql-inspector/core');
const { buildSchema } = require('graphql');
const fs = require('fs');

const oldSchemaContent = fs.readFileSync('schema.graphql', 'utf8');
const newSchemaContent = fs.readFileSync('schema.graphql.temp', 'utf8'); // temporary schema to test

const oldSchema = buildSchema(oldSchemaContent);
const newSchema = buildSchema(newSchemaContent);

const changes = diff(oldSchema, newSchema);

const breakingChanges = changes.filter(c => c.criticality.level === 'BREAKING');

if (breakingChanges.length > 0) {
  console.error('ERROR: Backward-incompatible breaking changes detected in GraphQL schema!');
  breakingChanges.forEach(bc => console.error(`  - ${bc.message}`));
  process.exit(1);
} else {
  console.log('GraphQL Schema validation check: SUCCESS.');
}
```
