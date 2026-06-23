# Turbo Pascal Performance Patterns

This document defines performance optimization patterns and standards for Turbo Pascal (16-bit real mode) applications.

---

## 1. Real Mode Segmentation Bounds
* **64KB Heap Segments**: Real mode processes are bounded by 64KB segments. Always check pointer boundaries and minimize dynamic allocation sizing.
* **Stack Sizing**: Set explicit stack heap allocation directives to prevent stack overflow errors.
  ```pascal
  {$M 16384,0,655360} { Stack, min heap, max heap }
  ```

---

## 2. Inline Assembly
* **asm blocks**: For time-critical algorithms, write assembly code directly inside Turbo Pascal using the `asm` block. This bypasses compiler generated overheads.
  ```pascal
  procedure FastFill(Dest: Pointer; Value: Byte; Count: Word); assembler;
  asm
    les di, Dest
    mov al, Value
    mov cx, Count
    rep stosb
  end;
  ```

---

## 3. Compiler Directives & Hardware Support
* **Target Instructions**: Enable target CPU instructions (like `{$G+}` to leverage 80286 instructions) to generate faster assembly loops.
* **Range Checking**: Disable Range and Overflow checking (`{$R-}`, `{$Q-}`) in production builds to strip validation overheads.
  ```pascal
  {$R-,Q-,S-} { Disable range, overflow, and stack checks }
  ```
