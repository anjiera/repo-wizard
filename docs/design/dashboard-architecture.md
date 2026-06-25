# Design Document: Interactive SPA Dashboard & Dynamic API Server

This document outlines the architecture, port allocation, and state synchronization patterns of the **Repo Wizard Interactive Dashboard**.

---

## 1. System Architecture

The Repo Wizard dashboard provides a visual, web-based alternative to the terminal CLI onboarding interview. It consists of:
1. **React Single Page Application (SPA)**: Frontend built using React and TailwindCSS.
2. **Node.js API Server**: A local Express backend that handles filesystem auditing, scans local directories, saves session updates, and serves files.

```
       +------------------------------------+
       |          React SPA client          |
       |  (Workspace Picker / Questionnaire)|
       +-----------------+------------------+
                         |
                         | REST HTTP API (Dynamic Port)
                         v
       +-----------------+------------------+
       |         Express API Server         |
       |     (scripts/dashboard-server.js)  |
       +-----------------+------------------+
                         |
                         +-----------------------------+
                         |                             |
                         v                             v
               +---------+---------+         +---------+---------+
               |    Local Workspace  |         |   Session Store   |
               | (Filesystem Audit)|         | (session.json)    |
               +-------------------+         +-------------------+
```

---

## 2. Dynamic Port Allocation

To avoid port conflicts (such as running the server on a port already used by another local development app), the backend server implements **Dynamic Port Scanning**:
* The server has a primary default port (e.g., `3000`).
* Upon startup, the script attempts to bind to the port. If a bind failure (`EADDRINUSE`) occurs, the server increments the port number and tries again until it finds an open port.
* The script prints the active URL to the console so the developer can click it.

### Port Scanner Algorithm
```javascript
const net = require('net');

function findOpenPort(startPort, callback) {
  const server = net.createServer();
  server.unref();
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      findOpenPort(startPort + 1, callback);
    } else {
      callback(err);
    }
  });

  server.listen(startPort, () => {
    const { port } = server.address();
    server.close(() => {
      callback(null, port);
    });
  });
}
```

---

## 3. State Synchronization

A key challenge is coordinating changes between the CLI, the local filesystem, and the web browser. The system uses a **JSON-first session state model**:

### The Session Schema (`session.json`)
All choices made in the React SPA are sent as JSON payloads to the Express server, which validates and writes them to `.repo-wizard/session.json`.

```json
{
  "repo_path": "/absolute/path/to/my-app",
  "onboarding_completed": false,
  "answers": {
    "context": "enterprise",
    "compliance_standards": ["SOC2", "GDPR"],
    "tech_stack": "React",
    "friction_level": "strict"
  },
  "selections": {
    "scanners": ["semgrep", "fossa"],
    "linters": ["eslint"]
  }
}
```

### Flow of Updates
1. **Mounting**: When the React SPA loads, it calls `/api/session` to fetch current settings.
2. **Interactive Selection**: As the developer clicks options in the UI, the frontend modifies its local React state.
3. **Persisting**: On step transitions or clicking "Save", the frontend makes a `POST /api/session` request, writing the changes to disk.
4. **Execution**: When the user clicks "Start Scaffolding", the server triggers `run-orchestration.js` on the saved session state.
