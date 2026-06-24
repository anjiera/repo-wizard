# Embedded Systems & Firmware Robustness Standards

This document serves as the repository's source of truth for low-level embedded software, micro-controller firmware robustness, static analysis configurations, compiler stack protection warning gates, target emulator testing, and local logging utilities.

---

## 1. Static Code Analysis (MISRA Compliance)

For C/C++ micro-controller targets, static analysis must be integrated to catch undefined behavior, memory leaks, and static analysis violations before compiling.

### 1.1 Cppcheck MISRA Configuration

We use `cppcheck` with the MISRA C:2012 ruleset. To run `cppcheck` with MISRA validation:

1. Generate a MISRA rule-mapping text file (e.g. `misra.txt`) referencing official MISRA rules.
2. Create a `cppcheck-misra.json` configuration file:

```json
{
  "script": "misra.py",
  "args": [
    "--rule-texts=misra.txt"
  ]
}
```

3. Run the static analysis command:
```bash
cppcheck --addon=cppcheck-misra.json --enable=warning,style,performance,portability --error-exitcode=1 src/
```

### 1.2 Compiler Warning Flags

Firmware builds must enforce strict compiler diagnostic gates to block risky constructs. Configure your build system (Make, CMake, or Cargo) to enforce:

#### C/C++ GCC/Clang Flags
- `-Wall -Wextra`: Enable standard warnings.
- `-Werror`: Treat all warnings as compilation errors.
- `-Wdouble-promotion`: Warn when a `float` is implicitly promoted to a `double` (computationally expensive on single-precision FPU targets).
- `-Wshadow`: Warn when a local variable shadows another variable.
- `-Wconversion`: Warn on implicit type conversions that may lose data.
- `-Wundef`: Warn if an undefined macro is evaluated in an `#if` directive.

#### Rust Cargo Warnings (`.cargo/config.toml`)
```toml
[target.'cfg(all(target_arch = "arm", target_os = "none"))']
rustflags = [
  "-D", "warnings",
  "-C", "link-arg=-Tlink.x",
  "-C", "force-frame-pointers=yes"
]
```

---

## 2. Stack Robustness & Memory Limits

Embedded bare-metal systems lack dynamic operating system stack guards, making stack overflows silent and destructive.

### 2.1 Linker Script Stack Sizing (`link.ld`)

Linker scripts must explicitly declare and place the stack and heap spaces, ensuring they do not collide or overflow into global variables.

```ld
/* Section inside linker script mapping stack boundaries */
MEMORY
{
  FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 512K
  RAM  (xrw) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
  /* Reserve stack memory explicitly at the top of RAM */
  ._stack (NOLOAD) :
  {
    . = ALIGN(8);
    _sstack = .;
    . = . + 0x2000; /* 8KB Stack Size limit */
    _estack = .;
  } > RAM
}
```

### 2.2 Stack Usage Warnings

Configure the compiler to inspect static stack usage metrics:
- Use GCC's `-Wstack-usage=STACK_LIMIT_BYTES` (e.g. `-Wstack-usage=4096`) to trigger compilation errors if a single function call frame exceeds the specified stack allocation budget.
- Enable compiler flags to dump stack analysis files (`-fstack-usage`), which generate `.su` sidecar files specifying the stack frame footprint of each function.

---

## 3. Target Unit Testing (QEMU & HIL)

Embedded unit testing should run on the host system, on virtualized target hardware (QEMU), or directly on target Hardware-in-the-Loop (HIL).

### 3.1 C/C++ Unity Target Configuration

For C testing, use the Unity unit test framework. Create a test runner script targeting QEMU for ARM Cortex-M architecture:

```c
#include "unity.h"
#include "my_firmware_logic.h"

void setUp(void) {}
void tearDown(void) {}

void test_circular_buffer_init(void) {
    TEST_ASSERT_EQUAL(0, init_buffers());
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_circular_buffer_init);
    return UNITY_END();
}
```

To run this test under emulation:
```bash
# Compile test binary with arm-none-eabi-gcc
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -T link_test.ld test.c unity.c -o test.elf

# Run test elf inside QEMU target emulator
qemu-system-gnuarmeclipse --cpu cortex-m4 --machine STM32F4-Discovery --image test.elf --semihosting-config enable=on,target=native
```

### 3.2 Rust Target Testing (`defmt-test`)

For bare-metal Rust projects, execute unit and integration tests inside QEMU using `probe-run` or the `qemu-system` runner:

```rust
// tests/test_firmware.rs
#![no_std]
#![no_main]

use defmt_rtt as _; // global logger
use panic_probe as _;

#[defmt_test::tests]
mod tests {
    #[test]
    fn test_gpio_high() {
        assert!(true);
    }
}
```

Configure `cargo` to run tests on the custom QEMU target:
```toml
# .cargo/config.toml
[target.thumbv7m-none-eabi]
runner = "qemu-system-arm -cpu cortex-m3 -machine lm3s6965evb -nographic -semihosting-config enable=on,target=native -kernel"
```

---

## 4. Local Circular Ring Buffer Logging

Embedded devices operating in disconnected environments cannot rely on cloud-based APMs or real-time file logging. Local logging must be fast, non-blocking, and bounds-safe.

### 4.1 C/C++ Circular Buffer UART Log Skeleton

Implement a lock-free circular ring buffer to write debug messages asynchronously over a UART port or store them in non-volatile memory (EEPROM / Flash):

```c
#include <stdint.h>
#include <stdbool.h>

#define LOG_BUFFER_SIZE 1024

typedef struct {
    uint8_t buffer[LOG_BUFFER_SIZE];
    uint32_t head;
    uint32_t tail;
} RingBuffer_t;

static RingBuffer_t log_ring_buffer;

void Log_Init(void) {
    log_ring_buffer.head = 0;
    log_ring_buffer.tail = 0;
}

bool Log_Write(uint8_t data) {
    uint32_t next_head = (log_ring_buffer.head + 1) % LOG_BUFFER_SIZE;
    
    // Check if buffer is full (avoid overwriting unread telemetry)
    if (next_head == log_ring_buffer.tail) {
        return false; // Buffer full
    }
    
    log_ring_buffer.buffer[log_ring_buffer.head] = data;
    log_ring_buffer.head = next_head;
    return true;
}

bool Log_Read(uint8_t *data) {
    // Check if buffer is empty
    if (log_ring_buffer.head == log_ring_buffer.tail) {
        return false; // Buffer empty
    }
    
    *data = log_ring_buffer.buffer[log_ring_buffer.tail];
    log_ring_buffer.tail = (log_ring_buffer.tail + 1) % LOG_BUFFER_SIZE;
    return true;
}
```

---

## 5. Code Formatting (Google Style clang-format)

C/C++ firmware projects must maintain clear layout readability. Style validation should be integrated into pre-commit filters using `clang-format` configured according to the Google C++ Style Guide:

- Save the standard Google Style `.clang-format` configuration file at the repository root. See details in [google-style-cpp.md](google-style-cpp.md).
- Integrate formatting runs into your build process or pre-commit hooks to automate cleanup.

