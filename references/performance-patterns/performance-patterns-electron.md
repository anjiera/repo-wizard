# Electron Desktop Framework Performance Patterns

This document defines performance optimization patterns and standards for Electron applications.

---

## 1. Inter-Process Communication (IPC) Optimization
* **Payload Minimization**: Optimize IPC channel messaging (IPC renderer to main). Large objects transferred across the bridge must be serialized, which blocks the main thread. Send minimal IDs or small segments instead of full datasets.
* **Avoid Sync IPC**: Never use `ipcRenderer.sendSync()` as it freezes the renderer window until the main process responds.

---

## 2. Render Process Isolation & Security
* **Node Integration**: Always set `nodeIntegration: false` and `contextIsolation: true` in BrowserWindow options. Offload system tasks to the main process and expose them via safe `preload.js` context bridges.
* **Process Sandboxing**: Enable sandboxing (`sandbox: true`) to isolate Chromium render processes.

---

## 3. Window & Memory Lifecycle Management
* **Closed Windows cleanup**: Release references to window objects when they are closed to prevent memory leaks in the main process.
  ```javascript
  win.on('closed', () => {
      win = null; // release reference
  });
  ```
* **Background Suspensions**: Pause animations, WebGL renderings, and database reads when the window is minimized or hidden.
  ```javascript
  win.on('minimize', () => {
      win.webContents.send('suspend-ui');
  });
  ```
