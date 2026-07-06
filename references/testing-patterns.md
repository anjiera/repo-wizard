# Testing Patterns & Mocks Checklist

This reference checklist maps testing frameworks, test-driven development (TDD) methodologies, API/database mocking boundaries, code coverage thresholds, and safety-critical coverage rules (MC/DC) to codebase configurations.

> [!NOTE]
> **Verification Nuance:** Automated test suites verify code behavior against pre-defined assertions. Visual layouts, manual exploratory paths, and multi-user concurrency behavior often require manual validation or dedicated E2E tools.

> [!IMPORTANT]
> **Opt-In Policy:** Developers may choose to configure unit, integration, mocking, and coverage gates selectively. All tooling and test validation actions must only run for the specific capabilities the developer has opted to configure.

---

## 1. Testing Methodologies & Workflows

Developers can choose one or multiple testing methodologies. Audits and configurations must only enforce the selected workflow(s).

### 1.1 Test-Driven Development (TDD) Workflow
- [ ] *Process Rule (Optional):* Follow the Red-Green-Refactor cycle: write a failing test first, write minimal production code to pass, then refactor.
- [ ] *Process Rule (Optional):* Ensure no production code is written without a prior failing unit test.

### 1.2 Test-After-Development (TAD) Workflow
- [ ] *Process Rule (Optional):* Write tests immediately after implementing production code modules to capture edge cases and verify specifications.
- [ ] *Process Rule (Optional):* Prioritize unit coverage for all new public interfaces, ensuring structural correctness and behavior checks.

### 1.3 Behavior-Driven Development (BDD) Workflow
- [ ] *Process Rule (Optional):* Express test cases using domain-specific descriptive language mapping to user features (e.g. Given-When-Then syntax).
- [ ] *Process Rule (Optional):* Tool integration tests that validate user stories and business logic flow, focusing on behavior rather than implementation details.


---

## 2. Unit, Integration, and E2E Test Structures

### 2.1 Arrange-Act-Assert (AAA) Pattern
- [ ] *Design Rule:* Ensure all test cases are cleanly segmented into three logical sections:
  - **Arrange:** Set up the test inputs, environment, and dependencies (mocks, parameters).
  - **Act:** Execute the target function, route, or logic under test.
  - **Assert:** Verify that the output, side-effect, or state matches expectations.

### 2.2 Scope Isolation
- [ ] *Design Rule:* Unit tests must be completely isolated and mock all external network, database, or filesystem modules.
- [ ] *Design Rule:* Integration tests must mock external network/service boundaries (e.g. using MSW) but verify the interaction between multiple internal components or databases.

---

## 3. API and Database Mocking Patterns

### 3.1 Mock Service Worker (MSW) Integration
- [ ] *Conditional Check:* Centralize API mocking via Mock Service Worker (MSW) handlers rather than hardcoding inline overrides in test files.
- [ ] *Conditional Check:* Ensure MSW handlers (`msw/handlers.js`) use strict request matching and return mock JSON payloads mimicking the production API schema.
- [ ] *Conditional Check:* Configure test runner setup scripts (e.g., `vitest.setup.ts`) to start the MSW server before all tests and reset handlers after each test.

### 3.2 Database & Container Mocking
- [ ] *Conditional Check:* Use in-memory database mocks (e.g., SQLite in-memory mode) or Testcontainers for integration tests requiring a database.

---

## 4. Code Coverage Gates

### 4.1 Coverage Thresholds
- [ ] *Conditional Check:* Enforce local coverage gates in test config files (e.g., `vitest.config.ts` coverage section):
  - Line Coverage threshold (e.g., `lines: 80`)
  - Branch Coverage threshold (e.g., `branches: 80`)
  - Function Coverage threshold (e.g., `functions: 80`)
  - Statement Coverage threshold (e.g., `statements: 80`)

### 4.2 Coverage Exclusions
- [ ] *Conditional Check:* Explicitly exclude non-logic files from coverage collection (e.g. `*.config.js`, stylesheets, types, folders like `dist/` or `coverage/`).

---

## 5. Modified Condition/Decision Coverage (MC/DC)

### 5.1 Safety-Critical Coverage Rules
- [ ] *Conditional Check:* For safety-critical software modules (e.g. ISO 26262 or DO-178C targets), design test cases to verify Modified Condition/Decision Coverage:
  - Every decision has taken all possible outcomes at least once.
  - Every condition in a decision has taken all possible outcomes at least once.
  - Every condition in a decision has been shown to independently affect that decision's outcome.

---

## 6. Manual/Out-of-Scope QA Items

### 6.1 Visual & Usability Reviews
- [ ] *Manual Verification:* Perform manual visual regression reviews of UI layouts to check for styling, element overlap, or responsive design issues.
- [ ] *Manual Verification:* Conduct exploratory testing to verify user workflows, accessibility keyboard traps, and multi-user real-time interaction.
