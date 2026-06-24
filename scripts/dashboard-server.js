#!/usr/bin/env node
/**
 * scripts/dashboard-server.js
 *
 * Lightweight, zero-dependency Node.js backend for the Repo Wizard interactive dashboard.
 * - Dynamic port scanning (starts at 3000, increments until free)
 * - JSON logging schema with correlation ID propagation
 * - API endpoints to manage sessions, trigger scans, and compile HTML
 * - Static file serving for Vite built SPA assets
 */

'use strict';

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { convertMdToHtml } = require('./md-to-html');

const ROOT = path.resolve(__dirname, '..');
const PORT_START = 3000;
const SESSION_FILE = path.join(ROOT, '.repo-wizard', 'session.json');

// Ensure reports directory exists
const REPORTS_DIR = path.join(ROOT, '.repo-wizard');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function writeLog(level, message, correlationId = '', extra = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlation_id: correlationId,
    message,
    ...extra
  };
  console.log(JSON.stringify(logEntry));
}

/**
 * Searches for an open port using the native net package
 */
function findOpenPort(startPort, callback) {
  const server = net.createServer();
  server.listen(startPort, () => {
    server.once('close', () => callback(startPort));
    server.close();
  });
  server.on('error', () => {
    findOpenPort(startPort + 1, callback);
  });
}

/**
 * Generates ETag for cache validation
 */
function getFileETag(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return `W/"${stats.size}-${stats.mtimeMs}"`;
  } catch (err) {
    return '';
  }
}

/**
 * Serves static files from dashboard/dist directory
 */
function serveStaticFile(res, reqPath, correlationId) {
  let filePath = path.join(ROOT, 'dashboard', 'dist', reqPath === '/' ? 'index.html' : reqPath);
  
  // Clean path to prevent directory traversal
  if (!filePath.startsWith(path.join(ROOT, 'dashboard', 'dist'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Fallback to index.html for SPA router
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'dashboard', 'dist', 'index.html');
  }

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'application/javascript';
  if (ext === '.css') contentType = 'text/css';
  if (ext === '.json') contentType = 'application/json';
  if (ext === '.png') contentType = 'image/png';
  if (ext === '.ico') contentType = 'image/x-icon';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      writeLog('error', `Failed to read static file: ${filePath}`, correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  // CORS Headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  writeLog('info', `Received request: ${req.method} ${url.pathname}`, correlationId);

  // 1. GET /api/session - Read alignment questionnaire state
  if (req.method === 'GET' && url.pathname === '/api/session') {
    if (!fs.existsSync(SESSION_FILE)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'not_found', message: 'No active session exists.' }));
      return;
    }

    const etag = getFileETag(SESSION_FILE);
    const clientEtag = req.headers['if-none-match'];

    if (clientEtag && clientEtag === etag) {
      writeLog('info', 'Session ETag matched. Returning 304 Not Modified', correlationId);
      res.writeHead(304);
      res.end();
      return;
    }

    fs.readFile(SESSION_FILE, 'utf8', (err, data) => {
      if (err) {
        writeLog('error', 'Failed to read session file', correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read session file.' }));
      } else {
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'ETag': etag
        });
        res.end(data);
      }
    });
    return;
  }

  // 2. POST /api/session - Create or update alignment state
  if (req.method === 'POST' && url.pathname === '/api/session') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        fs.writeFileSync(SESSION_FILE, JSON.stringify(payload, null, 2), 'utf8');
        writeLog('info', 'Successfully updated session state', correlationId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Session updated.' }));
      } catch (err) {
        writeLog('error', 'Malformed payload in session update', correlationId, { error: err.message });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // 3. GET /api/reports - Fetch compiled reports list
  if (req.method === 'GET' && url.pathname === '/api/reports') {
    try {
      const files = fs.readdirSync(REPORTS_DIR);
      const reports = files.filter(f => f.startsWith('repo-wizard-') && (f.endsWith('.md') || f.endsWith('.html')));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reports }));
    } catch (err) {
      writeLog('error', 'Failed to read reports directory', correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to retrieve reports.' }));
    }
    return;
  }

  // 4. POST /api/compile-html - Run md-to-html compiler securely in-process
  if (req.method === 'POST' && url.pathname === '/api/compile-html') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { markdownFile } = JSON.parse(body);
        if (typeof markdownFile !== 'string' || !markdownFile.endsWith('.md')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid markdownFile path. Must end with .md.' }));
          return;
        }

        const inputPath = path.resolve(ROOT, '.repo-wizard', markdownFile);
        const reportsDir = path.resolve(ROOT, '.repo-wizard');

        // Enforce boundary check to prevent Directory Traversal
        if (!inputPath.startsWith(reportsDir + path.sep)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied.' }));
          return;
        }

        const outputPath = inputPath.replace(/\.md$/, '.html');

        if (!fs.existsSync(inputPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `File not found: ${markdownFile}` }));
          return;
        }

        writeLog('info', `Compiling markdown to HTML: ${markdownFile}`, correlationId);

        try {
          const mdContent = fs.readFileSync(inputPath, 'utf8');
          const title = path.basename(inputPath, '.md');
          const htmlContent = convertMdToHtml(mdContent, title);
          fs.writeFileSync(outputPath, htmlContent, 'utf8');

          writeLog('info', `Successfully compiled HTML: ${path.basename(outputPath)}`, correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', htmlFile: path.basename(outputPath) }));
        } catch (err) {
          writeLog('error', 'Failed to run md-to-html compilation in-process', correlationId, { error: err.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'HTML compilation failed.' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // 4b. GET /api/report-content - Fetch specific report content
  if (req.method === 'GET' && url.pathname === '/api/report-content') {
    const fileName = url.searchParams.get('file');
    if (!fileName || !fileName.startsWith('repo-wizard-') || (!fileName.endsWith('.md') && !fileName.endsWith('.html'))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing file name.' }));
      return;
    }

    const filePath = path.join(REPORTS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Report not found.' }));
      return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        writeLog('error', `Failed to read report content: ${fileName}`, correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read report file.' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content: data }));
      }
    });
    return;
  }

  // 5. Serve Static SPA files (default)
  if (req.method === 'GET') {
    serveStaticFile(res, url.pathname, correlationId);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Run port scan
findOpenPort(PORT_START, (openPort) => {
  server.listen(openPort, () => {
    console.log(`\n\x1b[1m\x1b[32m==================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m  Repo Wizard Interactive Dashboard is Live!\x1b[0m`);
    console.log(`\x1b[1m\x1b[34m  Access URL:\x1b[0m \x1b[4mhttp://localhost:${openPort}\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m==================================================\x1b[0m\n`);
    
    writeLog('info', `Dashboard server started successfully on port ${openPort}`);
  });
});
