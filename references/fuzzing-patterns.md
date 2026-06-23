# Fuzz Testing & Vulnerability Discovery Standards

This document serves as the repository's source of truth for configuring automated fuzz testing (fuzzing) setups to find memory safety bugs, crashes, and undefined behavior in critical parsers, deserializers, and security-sensitive boundaries.

---

## 1. Target Candidate Selection Guidelines

Fuzzing is highly effective for specific types of code but is a poor fit for general business logic.

### 1.1 When Fuzzing SHOULD Be Configured
- **Untrusted Input Boundaries:** Any module that accepts files, network packets, or strings from external, untrusted sources (e.g., HTTP header parsers, file format decoders, JSON/XML deserializers).
- **Complex Parsers & Lexers:** AST parsers, custom command line parser systems, query language builders.
- **State Machine Transitions:** Code handling sequence-sensitive network protocols (e.g., TLS handshakes, custom binary UART protocols).
- **Data Compression & Cryptography:** Libraries performing encryption, encoding (Base64, hex, ASN.1), hashing, or compression (ZIP, zlib).

### 1.2 When Fuzzing SHOULD NOT Be Configured
- **Simple Database CRUD Operations:** Standard SQL insert/select wrappers that do not parse inputs themselves (rely on database drivers instead).
- **Declarative UI Component Rendering:** HTML templates, CSS styling compilers, or visual rendering pipelines where input is already strictly typed.
- **Third-Party API Integrations:** Scripts calling remote REST/GraphQL services where network latency prevents high-throughput fuzz execution (fuzzing requires thousands of executions per second).
- **Static Configurations:** Packages containing only constant mappings, configurations, or static routing lists.

---

## 2. LLVM libFuzzer C/C++ Integration

For C/C++ libraries, LLVM's `libFuzzer` is the standard tool. It compiles fuzzer targets with coverage-guided instrumentation.

### 2.1 Harness Template (`fuzz_target.c`)
Write a target harness containing the entry point:

```c
#include <stdint.h>
#include <stddef.h>
#include <string.h>

// Function in the codebase to be fuzzed
extern int parse_untrusted_packet(const uint8_t *data, size_t size);

// libFuzzer entry point
int LLVMFuzzerTestOneInput(const uint8_t *Data, size_t Size) {
    // Avoid fuzzing extremely large buffers that cause timeouts
    if (Size < 4 || Size > 8192) {
        return 0;
    }
    
    // Call the function under test
    parse_untrusted_packet(Data, Size);
    
    return 0; // Non-zero return values are reserved
}
```

### 2.2 Compilation and Execution Commands
Compile using Clang with sanitizers enabled (AddressSanitizer and UndefinedBehaviorSanitizer):

```bash
# Compile target with fuzzer and sanitizers enabled
clang -fsanitize=fuzzer,address,undefined fuzz_target.c my_parser.c -o fuzzer_binary

# Run the fuzzer (will run indefinitely until a crash is found)
./fuzzer_binary -max_len=8192 -jobs=4 -workers=4
```

---

## 3. Rust cargo-fuzz Integration

In Rust, `cargo-fuzz` wraps `libFuzzer` and automatically manages target compilation.

### 3.1 Harness Setup (`fuzz/fuzz_targets/fuzz_target_1.rs`)
Initialize the fuzz target in your workspace:

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

// Function in library under test
extern crate my_crate;

fuzz_target!(|data: &[u8]| {
    if data.len() < 2 {
        return;
    }
    // Call library parser
    let _ = my_crate::parse_json_stream(data);
});
```

### 3.2 Running the Fuzzer
Run the fuzz target using cargo-fuzz:

```bash
# Install cargo-fuzz (once)
cargo install cargo-fuzz

# Run the specified fuzz target
cargo fuzz run fuzz_target_1
```

---

## 4. Python Atheris Integration

For Python programs, `Atheris` is a coverage-guided fuzzer that can fuzz native extensions and pure Python code.

### 4.1 Harness Template (`fuzz_target.py`)
```python
import sys
import atheris

# Import module under test
with atheris.instrument_imports():
    import my_python_parser

def TestOneInput(data):
    try:
        my_python_parser.decode_payload(data)
    except ValueError:
        # Expected exceptions should be caught to let the fuzzer proceed
        pass
    except Exception as e:
        # Unexpected exceptions, memory leaks, or crashes are reported
        raise e

def main():
    atheris.Setup(sys.argv, TestOneInput)
    atheris.Fuzz()

if __name__ == "__main__":
    main()
```
