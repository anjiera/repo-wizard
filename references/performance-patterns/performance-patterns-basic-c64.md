# Commodore 64 BASIC Performance Patterns

This document defines performance optimization patterns and standards for C64 BASIC V2 applications.

---

## 1. Variable Allocation Caching
* **Declare Hot Variables First**: C64 BASIC scans variables sequentially from the start of the variable memory table. Declare your most frequently used variables (like loop counters, coordinates) on line 1 of the program to minimize search time during loops.
  ```basic
  10 X=0:Y=0:A=0:REM DECLARE HOT VARIABLES FIRST
  ```

---

## 2. Line Number Scanning & GOTO Control
* **Short Branch Offsets**: `GOTO` and `GOSUB` scan the program sequentially from line 1. Keep targets close or put hot subroutines at the very beginning of the program to minimize parsing latency.
* **Remove Comments (REM)**: Delete unnecessary remarks (`REM` statements) inside loop loops because BASIC parses them as characters on every pass.

---

## 3. Machine Code Execution
* **SYS & USR Triggers**: Do not perform heavy arithmetic or memory operations in BASIC. Use `POKE` to load machine code assembly into unused memory (e.g. `$c000`) and call it via `SYS`.
  ```basic
  100 SYS 49152:REM EXECUTE ASSEMBLY BLOCK AT $C000
  ```

---

## 4. Loop Optimization
* **Variable-Free NEXT**: Omit the variable name in `NEXT` statements (e.g. `NEXT` instead of `NEXT I`). This skips variable-table matching and saves CPU cycles.
  ```basic
  200 FOR I=1 TO 100:POKE 1024+I,1:NEXT
  ```
