# .NET Core C# Performance Patterns

This document defines performance optimization patterns and standards for .NET applications.

---

## 1. Zero-Allocation Span & Memory Slices
* **Span<T> & ReadOnlySpan<T>**: Parse strings, slices, or byte arrays using `Span` or `ReadOnlySpan` to avoid heap allocations.
  ```csharp
  ReadOnlySpan<char> source = "key=value".AsSpan();
  ReadOnlySpan<char> val = source.Slice(4); // zero allocation
  ```
* **String Allocation Avoidance**: Use `String.Create` or custom interpolation handlers instead of concatenating strings.

---

## 2. Task Allocation & ValueTask
* **ValueTask / ValueTask<T>**: For asynchronous methods that are likely to complete synchronously, use `ValueTask` to avoid GC allocations of standard `Task` wrapper objects.
  ```csharp
  public async ValueTask<int> ReadAsync() {
      if (dataAvailable) return cachedValue;
      return await ReadFromNetworkAsync();
  }
  ```

---

## 3. Buffer Pooling
* **ArrayPool<T>**: Allocate transient working arrays from `System.Buffers.ArrayPool<T>` instead of constructing new arrays on the heap.
  ```csharp
  int[] buffer = ArrayPool<int>.Shared.Rent(1024);
  try {
      Process(buffer);
  } finally {
      ArrayPool<int>.Shared.Return(buffer);
  }
  ```

---

## 4. Garbage Collection (GC) Optimization
* **GC Modes**: Configure Server GC (`ServerGarbageCollection = true`) for multi-threaded backend servers, and Workstation GC for responsive desktop applications.
* **Large Object Heap (LOH)**: Compact the LOH when dealing with large arrays to prevent memory fragmentation.
