# Design Specification: Specialist Agent Sandbox Permissions & Verification

This document specifies the permissions architecture and tool injection model for specialist subagents within `repo-wizard`, describing how access boundaries differ between Native Chat and Fallback CLI execution modes.

---

## 1. Permission Architecture

To mitigate risk and respect security boundaries, the orchestration model restricts agent capabilities depending on the runtime context. The system defines two distinct executing pathways.

### 1.1 Native Chat Mode (IDE / GUI)
When executing inside the Antigravity Chat sandbox, subagents are run via the `LlmAgent` tool. 

* **Default Behavior**: The platform defaults to a restricted ("zero-trust") sandbox for newly invoked subagents, stripping all file-system read/write tools to isolate execution.
* **Dynamic JIT Registration**: To provide access without requiring persistent global permissions, `repo-wizard` dynamically calls `define_subagent` for each specialist prior to invocation.
* **Tool Injection**: By referencing metadata from [agent-registry.json](../../agents/agent-registry.json), the Lead Agent specifies the requested permission level (e.g., `"enable_write_tools": true`).
* **Sandbox Verification**: This dynamic definition directs the platform runtime to inject the complete file toolset (`view_file`, `list_dir`, `write_to_file`, `replace_file_content`, `multi_replace_file_content`) into the subagent's active context, enabling direct workspace inspection.


## 2. Technical Capabilities

| Capability | Native Chat Mode & ADK Runner (JIT Sandbox) |
| :--- | :--- |
| **Workspace Reading** | Active via `view_file` and `list_dir` |
| **Workspace Writing** | Active via `write_to_file` and `replace_file_content` |
| **Tool Capabilities** | Dynamic injection based on registry metadata |
| **Token Utilization** | Low (audits targets on-demand via file tools) |

---

## 3. Verification & Testing Methodology

To verify that the subagents receive the correct permissions and run with direct file-system tools in Native Chat mode, the following test protocol is established.

### 3.1 Diagnostic Injection Test
A temporary verification rule is inserted at the top of the specialist skill file (e.g., `skills/performance-auditor/SKILL.md`):

```markdown
### Temporary Verification Rule (Diagnose Sandbox Tools)
At the very top of your observations report, write a section titled `## Verification: Tool Diagnostics` and print the exact names of all tools available to you in your current toolset to verify sandbox permissions.
```

### 3.2 Test Results and Observations

* **Native Chat Execution Output**:
  Running the scan natively inside the Antigravity chat session generates an observations report displaying the fully injected toolset:
  ```markdown
  ## Verification: Tool Diagnostics
  - call_mcp_tool
  - define_subagent
  - find_by_name
  - grep_search
  - LlmAgent
  - list_dir
  - manage_subagents
  - manage_task
  - multi_replace_file_content
  - read_url_content
  - replace_file_content
  - run_command
  - schedule
  - search_web
  - send_message
  - view_file
  - write_to_file
  ```
  *Verdict*: Verifies that JIT dynamic registration successfully injects read/write tools into the subagent's chat sandbox.
