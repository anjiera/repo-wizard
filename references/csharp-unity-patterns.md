# C# Unity Game Engine Performance Patterns

This document defines performance optimization patterns and standards for Unity game development.

---

## 1. Garbage Collection (GC) Avoidance in Hot Paths
* **Zero Allocations in Update**: Never allocate memory (using `new`, string operations, or Linq queries) inside `Update()`, `FixedUpdate()`, or `LateUpdate()`.
* **String Caching**: Avoid string concatenation inside frame updates. Cache all dynamic labels.
* **Avoid Boxing**: Do not pass value types (structs, enums) into parameters expecting objects or interfaces, which triggers GC boxing.

---

## 2. API Caching & Reference Lookups
* **Cache GetComponent**: Never run `GetComponent()` inside `Update()`. Cache references in `Start()` or `Awake()`.
  ```csharp
  private Rigidbody rb;
  void Awake() {
      rb = GetComponent<Rigidbody>();
  }
  ```
* **Tag Comparisons**: Use `CompareTag()` instead of `.tag == "Player"` to avoid string allocation.
  ```csharp
  if (other.CompareTag("Player")) { /* ... */ }
  ```

---

## 3. Memory & Object Pooling
* **Object Pooling**: Cache and reuse frequently created and destroyed game objects (bullets, particles) instead of constantly calling `Instantiate` and `Destroy`.
* **NonAlloc Physics API**: Use non-allocating physics checks to prevent array allocation.
  ```csharp
  int hitCount = Physics.OverlapSphereNonAlloc(position, radius, results);
  ```
