# Cross-Compilation & Toolchain Standards

This document serves as the repository's source of truth for configuring cross-compilation toolchains, sysroots, CMake toolchain configurations, and target compiler warning overrides for multiple architecture targets (e.g. ARM Cortex, RISC-V, WebAssembly).

---

## 1. GCC Cross-Compiler CMake Toolchain File Template

To compile C/C++ applications for raw metal microcontrollers or custom hardware architectures, compile using a CMake toolchain configuration file that overrides default compiler detection.

### 1.1 Toolchain File Setup (`cmake/riscv.cmake`)

Create a toolchain configuration file mapping system target architectures:

```cmake
# CMake Toolchain configuration for RISC-V 32-bit Bare-Metal
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR riscv32)

# Specify cross-compiler target paths
set(CMAKE_C_COMPILER riscv-none-elf-gcc)
set(CMAKE_CXX_COMPILER riscv-none-elf-g++)

# Force compiler testing to bypass OS checks
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

# Architecture compilation and linker flags
set(RISCV_ARCH_FLAGS "-march=rv32imac -mabi=ilp32 -mcmodel=medany")
set(CMAKE_C_FLAGS "${RISCV_ARCH_FLAGS} -fdata-sections -ffunction-sections" CACHE STRING "C Flags")
set(CMAKE_CXX_FLAGS "${RISCV_ARCH_FLAGS} -fdata-sections -ffunction-sections" CACHE STRING "C++ Flags")

# Linker flags for stripping and GC sections
set(CMAKE_EXE_LINKER_FLAGS "-Wl,--gc-sections" CACHE STRING "Linker Flags")
```

To run CMake with this toolchain overlay:
```bash
cmake -DCMAKE_TOOLCHAIN_FILE=cmake/riscv.cmake -B build
cmake --build build
```

---

## 2. Rust Cargo Multi-Platform Config (`.cargo/config.toml`)

For Rust firmware codebases, targets are defined in `.cargo/config.toml` to map compilation targets to cross-linkers.

```toml
# Configuration for RISC-V 32-bit target (bare metal)
[target.riscv32imac-unknown-none-elf]
linker = "riscv-none-elf-ld"
rustflags = [
  "-C", "link-arg=-Tlink.x",         # use specific linker script
  "-C", "link-arg=--gc-sections",    # dead code elimination
  "-C", "force-frame-pointers=yes"   # stack trace preservation
]

# Build profiles configuration
[build]
target = "riscv32imac-unknown-none-elf"
```

---

## 3. WebAssembly Target Toolchain configuration

WebAssembly (WASM) compiler toolchains map high-level code to browser-runnable assemblies.

### 3.1 Emscripten CMake Toolchain Config (`cmake/wasm.cmake`)

```cmake
set(CMAKE_SYSTEM_NAME Emscripten)

# Emscripten SDK target compilation flags
set(CMAKE_C_FLAGS "-O3 -s WASM=1 -s SIDE_MODULE=1" CACHE STRING "C Flags")
set(CMAKE_CXX_FLAGS "-O3 -s WASM=1 -s SIDE_MODULE=1" CACHE STRING "C++ Flags")

# Disable default executable file extensions
set(CMAKE_EXECUTABLE_SUFFIX ".wasm")
```
To run the Emscripten build:
```bash
emcmake cmake -B build
cmake --build build
```
