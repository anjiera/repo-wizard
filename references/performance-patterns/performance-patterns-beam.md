# BEAM (Erlang/Elixir) Performance Patterns

This document defines performance optimization patterns and standards for BEAM VM applications.

---

## 1. Tail-Recursion Optimization (TCO)
* **Tail Calls**: Ensure loops and recursive calls place the recursive function invocation as the final operation, allowing the BEAM compiler to optimize register frames without stack memory expansion.
  ```elixir
  # Tail recursive
  def loop([head | tail], acc) do
      loop(tail, process(head) + acc)
  end
  def loop([], acc), do: acc
  ```

---

## 2. Process Message Mailbox Sizing & Backpressure
* **Mailbox Flooding**: Do not send high-frequency messages to a single GenServer process. If a GenServer's message queue gets flooded, the process will consume memory and slow down.
* **GenStage / Broadway**: Implement backpressure stages to regulate flow when pulling data from high-throughput streams (e.g. RabbitMQ, Kafka).

---

## 3. Memory & GC Optimization
* **Process Hibernation**: Call `erlang:hibernate/3` or `:proc_lib.hibernate/3` for processes that will go idle for long periods. This immediately triggers a process-specific garbage collection sweep and reduces memory footprints.
  ```elixir
  def handle_info(:idle, state) do
      {:noreply, state, :hibernate}
  end
  ```
* **Binary Heap Offloading**: Large binaries (>64 bytes) are stored on a shared binary heap rather than inside process heaps. Ensure process references to these binaries are released quickly to let the binary GC sweep them.
