# Repo Wizard References Catalog

This directory contains high-density checklist, standard, and pattern files used by specialist agents to audit repositories and scaffold configurations.

---

## 1. Domain Grouping: Cybersecurity Color Wheel Roles

Specialist guidelines and checklists map directly to the industry-standard **Cybersecurity Color Wheel** roles to ensure complete coverage of defensive coding, system monitoring, audit compliance, and deployment automation.

### 🟢 Green Team (Defensive Coding & Build Hygiene)
Focuses on writing secure code, configuring correct dependencies, and setting up static linters to prevent vulnerabilities before deployment.
* **API Hardening:** [appsec-hardening-guide.md](appsec-hardening-guide.md)
* **API Contract Validation:** [api-contract-standards.md](api-contract-standards.md)
* **Google Style Guides:** [google-style-rules.md](google-style-rules.md)
* **Notebook Git Hygiene:** [notebook-standards.md](notebook-standards.md)
* **Python Coding Standards:** [python-standards.md](python-standards.md)
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
* **Digital Accessibility (WCAG):** [accessibility-checklist.md](accessibility-checklist.md)
* **Formal Methods & Proof Verification:** [formal-methods-patterns.md](formal-methods-patterns.md)
* **Legal Phrasing & UI Neutrality:** [legal-phrasing-dictionary.md](legal-phrasing-dictionary.md)
* **Regulatory Compliance Frameworks:** [security-hardening-checklist.md](security-hardening-checklist.md)
* **Scaffolding Robustness Protocol:** [scaffolding-robustness-protocol.md](scaffolding-robustness-protocol.md)

### 🟡 Yellow Team (System Builders & Deployment Lifecycle)
Focuses on build automation, container configurations, hardware limits, data workflows, and service resilience.
* **AI/ML Robustness & Bias Audits:** [ai-robustness-checklist.md](ai-robustness-checklist.md)
* **Container Orchestration & Probes:** [deployment-patterns.md](deployment-patterns.md)
* **Data Flow & Database Pool Safety:** [data-pipeline-standards.md](data-pipeline-standards.md)
* **Documentation Standards (ADRs):** [documentation-standards.md](documentation-standards.md)
* **Embedded Software & Safety:** [embedded-standards.md](embedded-standards.md)
* **Functional Safety (MISRA):** [functional-safety-checklist.md](functional-safety-checklist.md)
* **Performance Budgeting & Cross-Stack Language Targets:** [performance-patterns.md](performance-patterns.md), [go-performance-patterns.md](go-performance-patterns.md), [rust-performance-patterns.md](rust-performance-patterns.md), [cpp-performance-patterns.md](cpp-performance-patterns.md), [csharp-unity-patterns.md](csharp-unity-patterns.md), [gdscript-godot-patterns.md](gdscript-godot-patterns.md), [dotnet-performance-patterns.md](dotnet-performance-patterns.md), [swift-performance-patterns.md](swift-performance-patterns.md), [python-performance-patterns.md](python-performance-patterns.md), [jvm-performance-patterns.md](jvm-performance-patterns.md), [beam-performance-patterns.md](beam-performance-patterns.md), [php-performance-patterns.md](php-performance-patterns.md), [ruby-performance-patterns.md](ruby-performance-patterns.md), [dart-flutter-patterns.md](dart-flutter-patterns.md), [shell-performance-patterns.md](shell-performance-patterns.md), [cobol-performance-patterns.md](cobol-performance-patterns.md), [fortran-performance-patterns.md](fortran-performance-patterns.md), [basic-c64-performance-patterns.md](basic-c64-performance-patterns.md), [pascal-turbo-patterns.md](pascal-turbo-patterns.md), [electron-performance-patterns.md](electron-performance-patterns.md), [lisp-performance-patterns.md](lisp-performance-patterns.md)
* **Resilience, Retries, & Circuit Breakers:** [resilience-patterns.md](resilience-patterns.md)
* **Testing Philosophy & Runners:** [testing-patterns.md](testing-patterns.md)
* **Toolchain Cross-Compilation:** [toolchain-standards.md](toolchain-standards.md)

---

## 2. Alphabetical Index of References

Below is a complete index of all 45 reference files with descriptions of their target auditing focus.

1. **[accessibility-checklist.md](accessibility-checklist.md)**
   - UI elements, focus management, screen readers, WCAG 2.1/2.2 AA checklists.
2. **[ai-robustness-checklist.md](ai-robustness-checklist.md)**
   - Mitigation guidelines for model hallucination, adversarial bias, and prompt injection filters.
3. **[api-contract-standards.md](api-contract-standards.md)**
   - Schemas for OpenAPI, GraphQL, gRPC Protobufs, and API contract validations.
4. **[appsec-hardening-guide.md](appsec-hardening-guide.md)**
   - Secure HTTP headers (Helmet), CORS configuration, rate limits, and sanitizers.
5. **[basic-c64-performance-patterns.md](basic-c64-performance-patterns.md)**
   - Commodore 64 BASIC optimization details: variables ordering, GOTO scan offsets, and loop speeds.
6. **[beam-performance-patterns.md](beam-performance-patterns.md)**
   - BEAM VM concurrency, Tail-Recursion Optimization (TCO), mailbox backpressure, and supervision trees.
7. **[cobol-performance-patterns.md](cobol-performance-patterns.md)**
   - Mainframe optimization: COMP-3 (packed decimals), signed types, and caching disk sector reads.
8. **[cpp-performance-patterns.md](cpp-performance-patterns.md)**
   - C++ memory alignment, Structure-of-Arrays (SoA) layout, stack arrays, and constexpr.
9. **[csharp-unity-patterns.md](csharp-unity-patterns.md)**
   - Unity C# performance: zero-alloc updates, GC avoidance, object pooling, and GetComponent caching.
10. **[data-pipeline-standards.md](data-pipeline-standards.md)**
    - Schema validation rules, connection pool management, and pipeline retry structures.
11. **[data-privacy-checklist.md](data-privacy-checklist.md)**
    - GDPR/CCPA PII classification rules, audit logs scrubbing, and user data deletion workflows.
12. **[dart-flutter-patterns.md](dart-flutter-patterns.md)**
    - Flutter layout rebuilding prevention, const constructors, background Isolates, and stream disposals.
13. **[deployment-patterns.md](deployment-patterns.md)**
    - Kubernetes liveness/readiness probes, Docker Compose HA setups, and backup/restore validations.
14. **[documentation-standards.md](documentation-standards.md)**
    - Nygard-style ADR formatting templates, retroactive cycle reviews, and diagram configurations.
15. **[dotnet-performance-patterns.md](dotnet-performance-patterns.md)**
    - .NET Core C# patterns: Span/ReadOnlySpan stack slicing, ValueTask async wrappers, and ArrayPool reuse.
16. **[electron-performance-patterns.md](electron-performance-patterns.md)**
    - Electron architecture: IPC channel size reduction, window disposal memory, and renderer thread isolation.
17. **[embedded-standards.md](embedded-standards.md)**
    - Memory boundaries, stack limits, static analysis (cppcheck), and QEMU setup configurations.
18. **[formal-methods-patterns.md](formal-methods-patterns.md)**
    - Rust Kani proof designs, TLA+ model checking configurations, and loop execution invariants.
19. **[fortran-performance-patterns.md](fortran-performance-patterns.md)**
    - High-performance numeric computing: column-major array looping, vectorization directives, and slices.
20. **[functional-safety-checklist.md](functional-safety-checklist.md)**
    - MISRA C/C++ static compliance matrices and hardware failure safety metrics.
21. **[fuzzing-patterns.md](fuzzing-patterns.md)**
    - Atheris/Cargo fuzz harnesses, memory error tracking, and Sanitizers configuration.
22. **[gdscript-godot-patterns.md](gdscript-godot-patterns.md)**
    - Godot engine scripting: static typing compilation, node path caching, and preload structures.
23. **[go-performance-patterns.md](go-performance-patterns.md)**
    - Go runtime profiling, sync.Pool allocation pooling, slice/map size preallocations, and escape checks.
24. **[jvm-performance-patterns.md](jvm-performance-patterns.md)**
    - JVM GC tuning (G1GC/ZGC), escape checks, JIT compiler optimizations, and Kotlin inline functions.
25. **[google-style-rules.md](google-style-rules.md)**
    - Google Style formatting templates for C/C++, Java, and JavaScript/TypeScript.
26. **[legal-phrasing-dictionary.md](legal-phrasing-dictionary.md)**
    - Phrasing scanning databases mapping high-risk claims to legally neutral alternatives.
27. **[lisp-performance-patterns.md](lisp-performance-patterns.md)**
    - Tail-Call Optimization (TCO), Common Lisp compilation macros, static arrays, and type assertions.
28. **[notebook-standards.md](notebook-standards.md)**
    - Jupyter Notebook nbstripout pre-commit filters, virtual environments (Conda/Poetry), and nbqa linters.
29. **[observability-patterns.md](observability-patterns.md)**
    - OpenTelemetry SDK configuration, W3C tracecontext headers, RED/USE metrics, and PII filters.
30. **[react-performance-patterns.md](react-performance-patterns.md)**
    - INP yielding (scheduler.yield()), web font metric CLS overrides, and back/forward cache (bfcache) rules.
31. **[pascal-turbo-patterns.md](pascal-turbo-patterns.md)**
    - Turbo Pascal heap bounds, inline assembler blocks, CPU directives, and range checking bypass.
32. **[performance-patterns.md](performance-patterns.md)**
    - K6 performance budget metrics, Micro-benchmarks, and CI budget boundaries.
33. **[php-performance-patterns.md](php-performance-patterns.md)**
    - OPcache JIT compiler, file preloading, eager-loading relations, and strict typing optimizations.
34. **[python-performance-patterns.md](python-performance-patterns.md)**
    - Generator streams, object __slots__, compiled C libraries (NumPy), and GIL worker pools.
35. **[python-standards.md](python-standards.md)**
    - Python PEP 8 styling guidelines and automated Ruff config templates.
36. **[resilience-patterns.md](resilience-patterns.md)**
    - Retry policies with exponential backoff and jitter, fallback patterns, and circuit breaker setups.
37. **[ruby-performance-patterns.md](ruby-performance-patterns.md)**
    - Ruby GC parameters, frozen string literal optimizations, lazy enumerators, and ActiveRecord preloading.
38. **[rust-performance-patterns.md](rust-performance-patterns.md)**
    - Async spawn_blocking, zero-copy borrowing Serde lifetimes, and Cargo release configurations.
39. **[scaffolding-robustness-protocol.md](scaffolding-robustness-protocol.md)**
    - Safe package installation commands, rollback configurations, AST merge routines, and prompt injection defense.
40. **[security-hardening-checklist.md](security-hardening-checklist.md)**
    - Compliance mapping profiles (SOC 2, ISO 27001, HIPAA controls, FIPS algorithms).
41. **[shell-performance-patterns.md](shell-performance-patterns.md)**
    - Minimizing child process spawns, line-by-line streams, and command output variables caching.
42. **[state-sanitization-rules.md](state-sanitization-rules.md)**
    - Prevent race conditions and stale closures in React hooks, callback updates, and window event listeners.
43. **[supply-chain-audit-checklist.md](supply-chain-audit-checklist.md)**
    - License validation checkers (blocking viral copyleft packages) and lockfile integrity scanning.
44. **[swift-performance-patterns.md](swift-performance-patterns.md)**
    - Swift Copy-on-Write value structures, avoiding strong cycles (weak/unowned), and Actor concurrency.
45. **[testing-patterns.md](testing-patterns.md)**
    - Unit/integration mocking frameworks (Jest, Vitest, MSW), coverage budgets, and test setups.
46. **[toolchain-standards.md](toolchain-standards.md)**
    - Cross-compilation settings, linker parameters, Emscripten targets, and sysroot mappings.
47. **[vcs-discipline-rules.md](vcs-discipline-rules.md)**
    - Pre-commit/commit-msg hook schemas, conventional commits formatters, and copyright header checks.

---

## ⚠️ Disclaimer & Legal Safety

> [!IMPORTANT]
> **No Advice Provided:** The reference standards, checklists, and documentation catalogs in this directory are educational and informational resources. They do not constitute legal, financial, compliance, regulatory, or safety advice. Developers must perform their own review of recommendations, configurations, and licenses to ensure compatibility with their organizational standards and local laws.
