# Design Document: Remote Checkout Management & Storage Mitigation

This document details the design and parameter specifications for managing checked-out repositories in Remote Mode (`MODE=HEADLESS_REMOTE`).

---

## 1. Objectives

To mitigate local storage depletion and manage files during remote repository scans:
1. **Customizable Target Directory**: Allow the operator to configure where remote checkouts are saved. If not specified via command-line arguments, the operator must be explicitly prompted to provide one.
2. **Post-Scan Cleanup Mitigation**: Support automated removal of checked-out repositories once report compilation is complete.
3. **Space Utilization Estimation & Offline Warnings**: Inform the operator of potential download size requirements prior to executing clone operations, and verify connectivity, warning the operator if the GitHub API is offline or unreachable.

---

## 2. Command Line Parameters

Two new command-line parameters are added to the orchestrator:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--checkout-path <path>` | String | (Required via prompt if omitted) | Specifies the target directory for the repository clone. |
| `--keep-checkout` | Boolean | `false` | If specified, the tool bypasses post-scan directory deletion. By default, the temporary checkout path is deleted after report compilation. This flag is evaluated only by the lead orchestrator; specialized subagents do not receive it. |

---

## 3. Remote Checkout Process Flow

The remote scanning workflow is defined as follows:

```
                  +-----------------------------------+
                  |      Launch Remote Scan URL       |
                  +-----------------+-----------------+
                                    |
                                    v
            +-----------------------+-----------------------+
            |                                               |
      [--checkout-path passed]                   [Path omitted]
            |                                               |
            v                                               v
            |                                     +---------+---------+
            |                                     | Prompt operator to|
            |                                     | enter checkout path|
            |                                     +---------+---------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  | Query API / Estimator for size    |
                  | Display warning if offline/error  |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  | Perform Shallow Clone to target   |
                  | directory                         |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  | Run Specialist Sweeps             |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  | Compile Reports & Deliverables    |
                  +-----------------+-----------------+
                                    |
                      +-------------+-------------+
                      |                           |
             [--keep-checkout]            [Default Action]
                      |                           |
                      v                           v
            +---------+---------+       +---------+---------+
            | Retain folder     |       | Delete temporary  |
            | for verification  |       | checkout folder   |
            +-------------------+       +-------------------+
```

---

## 4. Storage Estimator & Offline Warnings

Before cloning the target URL, the tool queries public API endpoints (e.g., GitHub API `/repos/{owner}/{repo}`) to read the metadata property `size` (reported in kilobytes).

* **Offline Connectivity Warning**: If the request fails, timeout occurs, or the GitHub API is offline, the tool prints a warning indicating that the API is unreachable, which may indicate that the subsequent clone operation will also fail.
* **Threshold Warning**: If the target size exceeds a predefined threshold (e.g., `100,000 KB` or 100MB), the tool outputs a verification warning requesting explicit confirmation from the operator before proceeding with Approach A.
* **Fallback**: If API queries fail, the tool notifies the operator that size verification was skipped and proceeds with a standard warning message.

---

## 5. Deletion & Cleanup Protocol

When `--keep-checkout` is not configured, the orchestrator invokes a recursive deletion routine:
* **Target Isolation**: Only the folder under `--checkout-path` is deleted to restrict modification of parent directories.
* **Error Handling**: If a file lock prevents complete folder deletion, a warning is printed to the console detailing the remaining files.

