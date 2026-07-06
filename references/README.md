# Repo Wizard References Catalog

This directory contains high-density checklist, standard, and pattern files used by specialist agents to audit repositories and tool configurations.

---

## 1. Domain Grouping: Cybersecurity Color Wheel Roles

Specialist guidelines and checklists map directly to the industry-standard **Cybersecurity Color Wheel** roles to ensure complete coverage of defensive coding, system monitoring, audit compliance, and deployment automation.

### 🟢 Green Team (Defensive Coding & Build Hygiene)
Focuses on writing secure code, configuring correct dependencies, and setting up static linters to prevent vulnerabilities before deployment.
* **API Hardening:** [appsec-hardening-guide.md](appsec-hardening-guide.md)
* **API Contract Validation:** [api-contract-standards.md](coding-standards/api-contract-standards.md)
* **Google Style Guides:** [google-style-cpp.md](coding-standards/google-style-cpp.md), [google-style-js-ts.md](coding-standards/google-style-js-ts.md), [google-style-java.md](coding-standards/google-style-java.md)
* **Notebook Git Hygiene:** [notebook-standards.md](coding-standards/notebook-standards.md)
* **Python Coding Standards:** [python-standards.md](coding-standards/python-standards.md)
* **React State Sanitization:** [state-sanitization-rules.md](state-sanitization-rules.md)
* **Supply Chain Audits:** [supply-chain-audit-checklist.md](supply-chain-audit-checklist.md)
* **VCS Automation & Hook Discipline:** [vcs-discipline-rules.md](vcs-discipline-rules.md)

### 🔵 Blue Team (Active Defense & System Visibility)
Focuses on auditing runtime events, configuring system tracing, and setting up security boundaries to handle data safely.
* **Fuzzing & Parser Audits:** [fuzzing-patterns.md](fuzzing-patterns.md)
* **Observability & Tracing:** [observability-patterns.md](observability-patterns.md)
* **PII Log Sanitization & Privacy:** [data-privacy-checklist.md](data-privacy-checklist.md)

### ⚪ White Team (Governance & Audit Compliance)
Focuses on compliance profiles, accessibility standards, legal liability checks, and formal execution verification.
* **Agent Registry Schema Definition:** [agent-registry-schema.json](agent-registry-schema.json)
* **Agent Execution Rules:** [agent-rules.md](agent-rules.md)
* **Digital Accessibility (WCAG):** [accessibility-checklist.md](accessibility-checklist.md)
* **Formal Methods & Proof Verification:** [formal-methods-patterns.md](formal-methods-patterns.md)
* **Legal Phrasing & UI Neutrality:** [legal-phrasing-dictionary.md](legal-phrasing-dictionary.md)
* **Legally Dubious Wordlist Schema:** [legally-dubious-words-schema.json](legally-dubious-words-schema.json)
* **Legally Dubious Wordlist:** [legally-dubious-words.json](legally-dubious-words.json)
* **Regulatory Compliance Frameworks:** [security-hardening-checklist.md](security-hardening-checklist.md)
* **Tooling Robustness Protocol:** [tooling-robustness-protocol.md](tooling-robustness-protocol.md)
* **Terms of Service & Developer Consent:** [terms-of-service.md](terms-of-service.md)
* **Plugin Metadata Schema:** [plugin-schema.json](plugin-schema.json)
* **Interactive Questionnaire Schema:** [questionnaire-spec.json](questionnaire-spec.json)
* **Interactive Questionnaire Schema Definition:** [questionnaire-spec-schema.json](questionnaire-spec-schema.json)
* **Headless Mode Override Protocol:** [headless-override.md](headless-override.md)
* **Handoff & Sandbox Constraints:** [handoff-sandbox-constraints.md](handoff-sandbox-constraints.md)

### 🟡 Yellow Team (System Builders & Deployment Lifecycle)
Focuses on build automation, container configurations, hardware limits, data workflows, and service resilience.
* **AI/ML Robustness & Bias Audits:** [ai-robustness-checklist.md](ai-robustness-checklist.md)
* **Container Orchestration & Probes:** [deployment-patterns.md](deployment-patterns.md)
* **Data Flow & Database Pool Safety:** [data-pipeline-standards.md](coding-standards/data-pipeline-standards.md)
* **Documentation Standards (ADRs):** [documentation-standards.md](coding-standards/documentation-standards.md)
* **Embedded Software & Safety:** [embedded-standards.md](coding-standards/embedded-standards.md)
* **Functional Safety (MISRA):** [functional-safety-checklist.md](functional-safety-checklist.md)
* **Performance Budgeting & Cross-Stack Language Targets:** [performance-patterns.md](performance-patterns/performance-patterns.md), [performance-patterns-go.md](performance-patterns/performance-patterns-go.md), [performance-patterns-rust.md](performance-patterns/performance-patterns-rust.md), [performance-patterns-cpp.md](performance-patterns/performance-patterns-cpp.md), [performance-patterns-csharp-unity.md](performance-patterns/performance-patterns-csharp-unity.md), [performance-patterns-gdscript-godot.md](performance-patterns/performance-patterns-gdscript-godot.md), [performance-patterns-dotnet.md](performance-patterns/performance-patterns-dotnet.md), [performance-patterns-swift.md](performance-patterns/performance-patterns-swift.md), [performance-patterns-python.md](performance-patterns/performance-patterns-python.md), [performance-patterns-jvm.md](performance-patterns/performance-patterns-jvm.md), [performance-patterns-beam.md](performance-patterns/performance-patterns-beam.md), [performance-patterns-php.md](performance-patterns/performance-patterns-php.md), [performance-patterns-ruby.md](performance-patterns/performance-patterns-ruby.md), [performance-patterns-dart-flutter.md](performance-patterns/performance-patterns-dart-flutter.md), [performance-patterns-shell.md](performance-patterns/performance-patterns-shell.md), [performance-patterns-cobol.md](performance-patterns/performance-patterns-cobol.md), [performance-patterns-fortran.md](performance-patterns/performance-patterns-fortran.md), [performance-patterns-basic-c64.md](performance-patterns/performance-patterns-basic-c64.md), [performance-patterns-pascal-turbo.md](performance-patterns/performance-patterns-pascal-turbo.md), [performance-patterns-electron.md](performance-patterns/performance-patterns-electron.md), [performance-patterns-lisp.md](performance-patterns/performance-patterns-lisp.md)
* **Resilience, Retries, & Circuit Breakers:** [resilience-patterns.md](resilience-patterns.md)
* **Testing Philosophy & Runners:** [testing-patterns.md](testing-patterns.md)
* **Toolchain Cross-Compilation:** [toolchain-standards.md](coding-standards/toolchain-standards.md)

---

## 2. Alphabetical Index of References

Below is a complete index of all 45 reference files with descriptions of their target auditing focus.

1. **[accessibility-checklist.md](accessibility-checklist.md)**
   - UI elements, focus management, screen readers, WCAG 2.1/2.2 AA checklists.
2. **[ai-robustness-checklist.md](ai-robustness-checklist.md)**
   - Mitigation guidelines for model hallucination, adversarial bias, and prompt injection filters.
3. **[api-contract-standards.md](coding-standards/api-contract-standards.md)**
   - Schemas for OpenAPI, GraphQL, gRPC Protobufs, and API contract validations.
4. **[appsec-hardening-guide.md](appsec-hardening-guide.md)**
   - Secure HTTP headers (Helmet), CORS configuration, rate limits, and sanitizers.
5. **[performance-patterns-basic-c64.md](performance-patterns/performance-patterns-basic-c64.md)**
   - Commodore 64 BASIC optimization details: variables ordering, GOTO scan offsets, and loop speeds.
6. **[performance-patterns-beam.md](performance-patterns/performance-patterns-beam.md)**
   - BEAM VM concurrency, Tail-Recursion Optimization (TCO), mailbox backpressure, and supervision trees.
7. **[performance-patterns-cobol.md](performance-patterns/performance-patterns-cobol.md)**
   - Mainframe optimization: COMP-3 (packed decimals), signed types, and caching disk sector reads.
8. **[performance-patterns-cpp.md](performance-patterns/performance-patterns-cpp.md)**
   - C++ memory alignment, Structure-of-Arrays (SoA) layout, stack arrays, and constexpr.
9. **[performance-patterns-csharp-unity.md](performance-patterns/performance-patterns-csharp-unity.md)**
   - Unity C# performance: zero-alloc updates, GC avoidance, object pooling, and GetComponent caching.
10. **[data-pipeline-standards.md](coding-standards/data-pipeline-standards.md)**
    - Schema validation rules, connection pool management, and pipeline retry structures.
11. **[data-privacy-checklist.md](data-privacy-checklist.md)**
    - GDPR/CCPA PII classification rules, audit logs scrubbing, and user data deletion workflows.
12. **[performance-patterns-dart-flutter.md](performance-patterns/performance-patterns-dart-flutter.md)**
    - Flutter layout rebuilding prevention, const constructors, background Isolates, and stream disposals.
13. **[deployment-patterns.md](deployment-patterns.md)**
    - Kubernetes liveness/readiness probes, Docker Compose HA setups, and backup/restore validations.
14. **[documentation-standards.md](coding-standards/documentation-standards.md)**
    - Nygard-style ADR formatting templates, retroactive cycle reviews, and diagram configurations.
15. **[performance-patterns-dotnet.md](performance-patterns/performance-patterns-dotnet.md)**
    - .NET Core C# patterns: Span/ReadOnlySpan stack slicing, ValueTask async wrappers, and ArrayPool reuse.
16. **[performance-patterns-electron.md](performance-patterns/performance-patterns-electron.md)**
    - Electron architecture: IPC channel size reduction, window disposal memory, and renderer thread isolation.
17. **[embedded-standards.md](coding-standards/embedded-standards.md)**
    - Memory boundaries, stack limits, static analysis (cppcheck), and QEMU setup configurations.
18. **[formal-methods-patterns.md](formal-methods-patterns.md)**
    - Rust Kani proof designs, TLA+ model checking configurations, and loop execution invariants.
19. **[performance-patterns-fortran.md](performance-patterns/performance-patterns-fortran.md)**
    - High-performance numeric computing: column-major array looping, vectorization directives, and slices.
20. **[functional-safety-checklist.md](functional-safety-checklist.md)**
    - MISRA C/C++ static compliance matrices and hardware failure safety metrics.
21. **[fuzzing-patterns.md](fuzzing-patterns.md)**
    - Atheris/Cargo fuzz harnesses, memory error tracking, and Sanitizers configuration.
22. **[performance-patterns-gdscript-godot.md](performance-patterns/performance-patterns-gdscript-godot.md)**
    - Godot engine scripting: static typing compilation, node path caching, and preload structures.
23. **[performance-patterns-go.md](performance-patterns/performance-patterns-go.md)**
    - Go runtime profiling, sync.Pool allocation pooling, slice/map size preallocations, and escape checks.
24. **[performance-patterns-jvm.md](performance-patterns/performance-patterns-jvm.md)**
    - JVM GC tuning (G1GC/ZGC), escape checks, JIT compiler optimizations, and Kotlin inline functions.
25. **[google-style-cpp.md](coding-standards/google-style-cpp.md)**, **[google-style-js-ts.md](coding-standards/google-style-js-ts.md)**, **[google-style-java.md](coding-standards/google-style-java.md)**
    - Google Style formatting templates for C/C++, Java, and JavaScript/TypeScript.
26. **[legal-phrasing-dictionary.md](legal-phrasing-dictionary.md)**
    - Phrasing scanning databases mapping high-risk claims to legally neutral alternatives.
27. **[legally-dubious-words.json](legally-dubious-words.json)**
    - Shared catalog of legally dubious keywords used in both agent prompts and compiler validators.
28. **[performance-patterns-lisp.md](performance-patterns/performance-patterns-lisp.md)**
    - Tail-Call Optimization (TCO), Common Lisp compilation macros, static arrays, and type assertions.
29. **[notebook-standards.md](coding-standards/notebook-standards.md)**
    - Jupyter Notebook nbstripout pre-commit filters, virtual environments (Conda/Poetry), and nbqa linters.
30. **[observability-patterns.md](observability-patterns.md)**
    - OpenTelemetry SDK configuration, W3C tracecontext headers, RED/USE metrics, and PII filters.
31. **[performance-patterns-react.md](performance-patterns/performance-patterns-react.md)**
    - INP yielding (scheduler.yield()), web font metric CLS overrides, and back/forward cache (bfcache) rules.
32. **[performance-patterns-pascal-turbo.md](performance-patterns/performance-patterns-pascal-turbo.md)**
    - Turbo Pascal heap bounds, inline assembler blocks, CPU directives, and range checking bypass.
33. **[performance-patterns.md](performance-patterns/performance-patterns.md)**
    - K6 performance budget metrics, Micro-benchmarks, and CI budget boundaries.
34. **[performance-patterns-php.md](performance-patterns/performance-patterns-php.md)**
    - OPcache JIT compiler, file preloading, eager-loading relations, and strict typing optimizations.
35. **[performance-patterns-python.md](performance-patterns/performance-patterns-python.md)**
    - Generator streams, object __slots__, compiled C libraries (NumPy), and GIL worker pools.
36. **[python-standards.md](coding-standards/python-standards.md)**
    - Python PEP 8 styling guidelines and automated Ruff config templates.
37. **[resilience-patterns.md](resilience-patterns.md)**
    - Retry policies with exponential backoff and jitter, fallback patterns, and circuit breaker setups.
38. **[performance-patterns-ruby.md](performance-patterns/performance-patterns-ruby.md)**
    - Ruby GC parameters, frozen string literal optimizations, lazy enumerators, and ActiveRecord preloading.
39. **[performance-patterns-rust.md](performance-patterns/performance-patterns-rust.md)**
    - Async spawn_blocking, zero-copy borrowing Serde lifetimes, and Cargo release configurations.
40. **[tooling-robustness-protocol.md](tooling-robustness-protocol.md)**
    - Safe package installation commands, rollback configurations, AST merge routines, and prompt injection defense.
41. **[security-hardening-checklist.md](security-hardening-checklist.md)**
    - Compliance mapping profiles (SOC 2, ISO 27001, HIPAA controls, FIPS algorithms).
42. **[performance-patterns-shell.md](performance-patterns/performance-patterns-shell.md)**
    - Minimizing child process spawns, line-by-line streams, and command output variables caching.
43. **[state-sanitization-rules.md](state-sanitization-rules.md)**
    - Prevent race conditions and stale closures in React hooks, callback updates, and window event listeners.
44. **[supply-chain-audit-checklist.md](supply-chain-audit-checklist.md)**
    - License validation checkers (blocking viral copyleft packages) and lockfile integrity scanning.
45. **[performance-patterns-swift.md](performance-patterns/performance-patterns-swift.md)**
    - Swift Copy-on-Write value structures, avoiding strong cycles (weak/unowned), and Actor concurrency.
46. **[questionnaire-spec.json](questionnaire-spec.json)**
    - Declarative questionnaire specification, mapping questions to session values and subagent contracts.
47. **[questionnaire-spec-schema.json](questionnaire-spec-schema.json)**
    - Formal JSON Schema definition for validating the questionnaire specification structure.
48. **[testing-patterns.md](testing-patterns.md)**
    - Unit/integration mocking frameworks (Jest, Vitest, MSW), coverage budgets, and test setups.
49. **[terms-of-service.md](terms-of-service.md)**
    - Dynamic terms of service text, developer consent definitions, and data privacy clauses.
50. **[toolchain-standards.md](coding-standards/toolchain-standards.md)**
    - Cross-compilation settings, linker parameters, Emscripten targets, and sysroot mappings.
51. **[vcs-discipline-rules.md](vcs-discipline-rules.md)**
    - Pre-commit/commit-msg hook schemas, conventional commits formatters, and copyright header checks.
52. **[headless-override.md](headless-override.md)**
    - Canonical Headless Mode Override steps bypassing questionnaire/alignment and scanning consent prompts.
53. **[agent-rules.md](agent-rules.md)**
    - Common rules and formatting guidelines for specialist agents (Emoji Restrictions, Passive Data Boundaries, etc.).
54. **[handoff-sandbox-constraints.md](handoff-sandbox-constraints.md)**
    - Unified safety rules, mock constraints, redacted mode compliance, and tool execution boundaries for specialist agents.
55. **[agent-registry-schema.json](agent-registry-schema.json)**
    - Schema defining all available specialist agents and their metadata configuration structure.
56. **[legally-dubious-words-schema.json](legally-dubious-words-schema.json)**
    - Schema defining the shared reference wordlist structure utilized by the legal neutrality auditor.
57. **[plugin-schema.json](plugin-schema.json)**
    - Schema defining metadata describing the Repo Wizard plugin.


---

## ⚠️ Disclaimer & Legal Safety

> [!IMPORTANT]
> **No Advice Provided:** The reference standards, checklists, and documentation catalogs in this directory are educational and informational resources. They do not constitute legal, financial, compliance, regulatory, or safety advice. Developers must perform their own review of recommendations, configurations, and licenses to ensure compatibility with their organizational standards and local laws.
