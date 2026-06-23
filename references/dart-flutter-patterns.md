# Dart & Flutter Performance Patterns

This document defines performance optimization patterns and standards for Dart and Flutter applications.

---

## 1. Widget Rebuild Prevention (Flutter)
* **const Constructors**: Declare widgets with `const` constructors wherever possible. This allows Flutter to compile and cache the widget subtrees, preventing redundant rebuilds.
  ```dart
  const Text("Hello World")
  ```
* **Minimize State Scope**: Use scoped state containers (Provider, Riverpod, Bloc) rather than calling `setState` at high levels of the widget tree, which forces rebuilds of all children.

---

## 2. Async Isolates
* **Dart Isolates**: Dart executes code on a single thread (the main event loop). Offload CPU-bound calculations (JSON parsing of large payloads, encryption, image processing) to background `Isolates` to prevent blocking UI frame rates.
  ```dart
  final data = await Isolate.run(() => parseLargeJson(payload));
  ```

---

## 3. Memory & Stream Lifecycle
* **Stream Cleanup**: Always cancel stream subscriptions and close `StreamController` instances inside `dispose()` methods of StatefulWidgets to avoid memory leaks.
  ```dart
  @override
  void dispose() {
      subscription.cancel();
      controller.close();
      super.dispose();
  }
  ```
* **Image Caching**: Set custom dimensions on network images (`cacheWidth`, `cacheHeight`) to avoid loading large resolutions into memory.
