#!/usr/bin/env node
/**
 * scripts/dashboard-server.js
 *
 * Lightweight, zero-dependency Node.js backend for the Repo Wizard interactive dashboard.
 * Refactored to delegate API endpoints to modular controllers.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = require('./root-resolver');
const { writeLog, findOpenPort } = require('./server/utils');
const { serveStaticFile } = require('./server/static-server');
const sessionStore = require('./server/session-store');
const { compileRealReports, getSafeRepoName } = require('./reports-compiler-engine');

// Controllers
const consentController = require('./server/controllers/consent');
const sessionController = require('./server/controllers/session');
const scanController = require('./server/controllers/scan');
const reportsController = require('./server/controllers/reports');

// Parse --report-path from startup arguments
const cliReportPathIdx = process.argv.indexOf('--report-path');
let cliReportPath = null;
if (cliReportPathIdx !== -1 && process.argv[cliReportPathIdx + 1] && !process.argv[cliReportPathIdx + 1].startsWith('-')) {
  cliReportPath = process.argv[cliReportPathIdx + 1];
}
const reportRoot = cliReportPath ? path.resolve(cliReportPath) : ROOT;
const REPORTS_ROOT_DIR = path.join(reportRoot, '.repo-wizard', 'reports');

// Parse --tos-path from startup arguments
const cliTosPathIdx = process.argv.indexOf('--tos-path');
let cliTosPath = null;
if (cliTosPathIdx !== -1 && process.argv[cliTosPathIdx + 1] && !process.argv[cliTosPathIdx + 1].startsWith('-')) {
  cliTosPath = process.argv[cliTosPathIdx + 1];
}
const tosRoot = cliTosPath ? path.resolve(cliTosPath) : path.join(reportRoot, '.repo-wizard');

// Parse --report-style from startup arguments
const cliReportStyleIdx = process.argv.indexOf('--report-style');
let cliReportStyle = 'whitepaper';
if (cliReportStyleIdx !== -1 && process.argv[cliReportStyleIdx + 1] && !process.argv[cliReportStyleIdx + 1].startsWith('-')) {
  cliReportStyle = process.argv[cliReportStyleIdx + 1];
}

if (!fs.existsSync(tosRoot)) {
  fs.mkdirSync(tosRoot, { recursive: true });
}
if (!fs.existsSync(REPORTS_ROOT_DIR)) {
  fs.mkdirSync(REPORTS_ROOT_DIR, { recursive: true });
}

let currentPort = 3000;

const server = http.createServer((req, res) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  // Set standard security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;");

  // Validate Host Header to prevent DNS Rebinding
  const host = req.headers.host || '';
  const isLocalhost = /^localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1(:\d+)?$/i.test(host) || /^\[::1\](:\d+)?$/i.test(host);
  if (!isLocalhost) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Invalid Host header.');
    return;
  }

  // Prevent crash via null byte injection
  if (req.url.includes('\0') || req.url.includes('%00')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  // CSRF Protection for mutating POST requests
  if (req.method === 'POST') {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    if (!origin && !referer) {
      writeLog('warning', 'CSRF validation failed: both Origin and Referer headers are missing', correlationId);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: CSRF validation failed.' }));
      return;
    }

    const isLocalOrigin = !origin || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
    const isLocalReferer = !referer || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/.test(referer);
    
    if (!isLocalOrigin || !isLocalReferer) {
      writeLog('warning', 'CSRF validation failed for POST request', correlationId, { origin, referer });
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: CSRF validation failed.' }));
      return;
    }
  }

  // Secure CORS Headers
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  writeLog('info', `Received request: ${req.method} ${url.pathname}`, correlationId);

  // Router delegation
  if (url.pathname === '/api/consent') {
    if (req.method === 'GET') {
      consentController.handleGetConsent(req, res, correlationId);
    } else if (req.method === 'POST') {
      consentController.handlePostConsent(req, res, correlationId);
    }
    return;
  }

  if (url.pathname === '/api/tos' && req.method === 'GET') {
    consentController.handleGetTos(req, res, correlationId);
    return;
  }

  if (url.pathname === '/api/session') {
    if (req.method === 'GET') {
      sessionController.handleGetSession(req, res, correlationId);
    } else if (req.method === 'POST') {
      sessionController.handlePostSession(req, res, correlationId, cliReportStyle, reportRoot, cliReportStyle);
    }
    return;
  }

  if (url.pathname === '/api/scan' && req.method === 'POST') {
    scanController.handlePostScan(req, res, correlationId, reportRoot, cliReportStyle);
    return;
  }

  if (url.pathname === '/api/scan-logs' && req.method === 'GET') {
    scanController.handleGetScanLogs(req, res);
    return;
  }

  if ((url.pathname === '/api/stop-scan' || url.pathname === '/api/cancel-scan') && req.method === 'POST') {
    scanController.handlePostStopScan(req, res, correlationId);
    return;
  }

  if (url.pathname === '/api/reports' && req.method === 'GET') {
    reportsController.handleGetReports(req, res, correlationId);
    return;
  }

  if (url.pathname === '/api/analyze-target' && req.method === 'POST') {
    reportsController.handlePostAnalyzeTarget(req, res, correlationId, reportRoot);
    return;
  }

  if (url.pathname === '/api/compile-html' && req.method === 'POST') {
    reportsController.handlePostCompileHtml(req, res, correlationId, cliReportStyle);
    return;
  }

  if (url.pathname === '/api/report-content' && req.method === 'GET') {
    reportsController.handleGetReportContent(req, res, url, correlationId);
    return;
  }

  if (url.pathname === '/api/browse-directory' && req.method === 'POST') {
    reportsController.handlePostBrowseDirectory(req, res, correlationId);
    return;
  }

  // Fallback to static SPA asset server
  if (req.method === 'GET') {
    serveStaticFile(res, url.pathname, correlationId);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

function startServer(port) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`\n\x1b[1m\x1b[32m==================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   ^   \x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   R   \x1b[0m  \x1b[1m\x1b[36mRepo Wizard Interactive Dashboard is Live!\x1b[0m`);
    console.log(`\x1b[1m\x1b[34m  Access URL:\x1b[0m \x1b[4mhttp://localhost:${port}\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m==================================================\x1b[0m\n`);
    writeLog('info', `Dashboard server started successfully on port ${port}`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    writeLog('info', `Port ${currentPort} in use, trying next port...`);
    currentPort++;
    if (currentPort > 65535) {
      writeLog('error', 'No open ports found in range 3000-65535');
      process.exit(1);
    }
    startServer(currentPort);
  } else {
    writeLog('error', `Server error: ${err.message}`);
    process.exit(1);
  }
});

if (require.main === module) {
  startServer(currentPort);
}

module.exports = {
  compileRealReports,
  getSafeRepoName
};

function killProcessTree(proc) {
  if (!proc) return;
  const pid = proc.pid;
  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } catch (e) {
      writeLog('error', `Exception running taskkill for pid ${pid}`, '', { error: e.message });
    }
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (err) {
      try {
        proc.kill('SIGKILL');
      } catch (e) {
        // Ignore
      }
    }
  }
}

function cleanupActiveScan() {
  const activeProc = scanController.getActiveScanProcess();
  if (activeProc) {
    try {
      killProcessTree(activeProc);
      writeLog('info', 'Successfully terminated active scan process tree on server exit.');
    } catch (err) {
      console.error('Failed to terminate active scan process on exit:', err.message);
    }
  }
}

process.on('exit', cleanupActiveScan);
process.on('SIGINT', () => {
  cleanupActiveScan();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupActiveScan();
  process.exit(0);
});
process.on('SIGHUP', () => {
  cleanupActiveScan();
  process.exit(0);
});
