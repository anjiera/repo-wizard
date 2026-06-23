# COBOL Performance Patterns

This document defines performance optimization patterns and standards for COBOL mainframe applications.

---

## 1. Math & Packed Decimal Optimizations
* **COMP-3 (Packed Decimal)**: Use `USAGE IS COMP-3` for numeric fields that are frequently used in arithmetic calculations. It packs two digits per byte and processes mathematical operations directly in CPU registers without costly conversion.
  ```cobol
  01  WS-BALANCE        PIC S9(7)V99 USAGE IS COMP-3.
  ```
* **Sign Usage**: Always declare numeric fields with sign variables (`S9` instead of `9`) if they are used in arithmetic operations to prevent the compiler from generating instructions to validate/strip signs.

---

## 2. Procedure Call Prevention
* **Recursive Calls**: COBOL compiler design is optimized for flat execution. Avoid recursive procedure calls to prevent call stack memory overflow.
* **PERFORM loop structures**: Keep `PERFORM UNTIL` iterations tight and index loops using binary integer data types (`USAGE IS COMP` or `USAGE IS BINARY`).

---

## 3. Data File Read Caching
* **Data Buffers**: Read files in blocks rather than single records (`BLOCK CONTAINS` in file definitions) to minimize disk sector I/O request rates.
* **Binary Search**: Use `SEARCH ALL` (binary search) instead of standard linear `SEARCH` for large tables.
  ```cobol
  SEARCH ALL EMPLOYEE-TABLE
      WHEN EMP-ID(EMP-INDEX) = WS-TARGET-ID
          PERFORM PROCESS-EMPLOYEE
  ```
