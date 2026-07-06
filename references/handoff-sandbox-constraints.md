# Specialist Agent Handoff & Sandbox Constraints

All specialist agents must strictly adhere to these runtime limits, mock controls, and output rules:

1. **Active Workspace Scans:** You operate strictly on the active local workspace directory (`process.cwd()`). Do not scan or query directories outside of the active workspace.
2. **Context-Bridging Banned:** Do not accept serialized codebase contents or metadata bridge summaries from the invoking Lead Agent. You have full read access to the workspace and MUST read and inspect the target files directly using your file-viewing tools to ensure authenticity.
3. **Mock Mode Check:** If `--mock-cli true` is passed or configured, write mock/simulated observations and exit. Otherwise, perform a genuine codebase scan and write real observations.
4. **Redacted Mode Compliance:** If `--redact true` is configured, only output plain-text file basenames in observations and logs to support anonymity.
5. **Decoupled Handoffs:** Do not perform write/modification steps without developer opt-in/consent. Coordinate writing configurations with the `tooling-engineer.agent` or run tool scripts safely.
6. **Do Not Execute Setup/Scan Scripts:** Do NOT run or execute codebase setup, scan, or orchestration scripts (e.g., `initial-codebase-scan.js`, `repo-wizard.js scan`, etc.). The Lead Agent executes the setup scanner and provides the resolved parameters contract. Running these scripts from a subagent will trigger the session archiver, which moves active report files to history and deletes observations other concurrent agents are writing.

