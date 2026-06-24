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
const TOS_FILE = path.join(ROOT, '.repo-wizard', '.tos_agreed');

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
  if (startPort > 65535) {
    callback(new Error('No open ports found in range 3000-65535'));
    return;
  }
  const server = net.createServer();
  server.listen(startPort, () => {
    server.once('close', () => callback(null, startPort));
    server.close();
  });
  server.on('error', () => {
    findOpenPort(startPort + 1, callback);
  });
}

// Initialize in-memory sessionState cache from disk on startup
let sessionState = {};
if (fs.existsSync(SESSION_FILE)) {
  try {
    sessionState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  } catch (e) {
    sessionState = {};
  }
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
  if (reqPath.includes('\0') || reqPath.includes('%00')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }
  const distDir = path.resolve(ROOT, 'dashboard', 'dist');
  const safePrefix = distDir + path.sep;
  const relativePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  let filePath = path.resolve(distDir, relativePath);
  
  // Clean path to prevent directory traversal securely
  if (filePath !== distDir && !filePath.startsWith(safePrefix)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Fallback to index.html for SPA router only for non-asset requests
  const isAsset = reqPath.startsWith('/assets/') || reqPath.startsWith('/vite.svg') || path.extname(reqPath) !== '';
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (isAsset) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    filePath = path.join(ROOT, 'dashboard', 'dist', 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json'
  };
  const contentType = MIME_TYPES[ext] || (ext === '' ? 'text/html' : 'application/octet-stream');

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
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

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
    
    // Require at least one local verification header to be present
    if (!origin && !referer) {
      writeLog('warning', 'CSRF validation failed: both Origin and Referer headers are missing', correlationId);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: CSRF validation failed.' }));
      return;
    }

    const isLocalOrigin = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isLocalReferer = !referer || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/.test(referer);
    
    if (!isLocalOrigin || !isLocalReferer) {
      writeLog('warning', 'CSRF validation failed for POST request', correlationId, { origin, referer });
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: CSRF validation failed.' }));
      return;
    }
  }

  // Secure CORS Headers: only allow requests from localhost/127.0.0.1
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
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

  // 0a. GET /api/consent - Check TOS consent status
  if (req.method === 'GET' && url.pathname === '/api/consent') {
    if (!fs.existsSync(TOS_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ consented: false }));
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(TOS_FILE, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ consented: true, data }));
    } catch (err) {
      writeLog('error', 'Failed to read TOS consent file', correlationId, { error: err.message });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ consented: false }));
    }
    return;
  }

  // 0b. POST /api/consent - Save or revoke TOS consent
  if (req.method === 'POST' && url.pathname === '/api/consent') {
    let body = '';
    let tooLarge = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2048) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const payload = JSON.parse(body);
        if (payload.agreed === true) {
          const consentData = {
            agreed: true,
            agreed_by: typeof payload.agreed_by === 'string' ? payload.agreed_by : 'dev-user',
            timestamp: new Date().toISOString()
          };
          fs.writeFileSync(TOS_FILE, JSON.stringify(consentData, null, 2), 'utf8');
          writeLog('info', 'TOS Consent saved successfully', correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'TOS accepted.' }));
        } else {
          if (fs.existsSync(TOS_FILE)) {
            fs.unlinkSync(TOS_FILE);
          }
          writeLog('info', 'TOS Consent declined / revoked', correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'declined', message: 'TOS declined.' }));
        }
      } catch (err) {
        writeLog('error', 'Malformed payload in consent update', correlationId, { error: err.message });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

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

    try {
      const data = fs.readFileSync(SESSION_FILE, 'utf8');
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'ETag': etag
      });
      res.end(data);
    } catch (err) {
      writeLog('error', 'Failed to read session file', correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read session file.' }));
    }
    return;
  }

  // 2. POST /api/session - Create or update alignment state
  if (req.method === 'POST' && url.pathname === '/api/session') {
    let body = '';
    let tooLarge = false;
    const MAX_SIZE = 100 * 1024; // 100KB limit
    req.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_SIZE) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const payload = JSON.parse(body);
        
        // Merge into global sessionState to prevent write race conditions
        if (payload.targetPath !== undefined && typeof payload.targetPath === 'string') sessionState.targetPath = payload.targetPath;
        if (payload.status !== undefined && typeof payload.status === 'string') sessionState.status = payload.status;
        if (payload.currentStep !== undefined && typeof payload.currentStep === 'number') sessionState.currentStep = payload.currentStep;
        if (payload.mode !== undefined && typeof payload.mode === 'string') sessionState.mode = payload.mode;

        // Nested validation for answers
        if (payload.answers !== undefined && typeof payload.answers === 'object' && payload.answers !== null) {
          const cleanAnswers = sessionState.answers || {};
          const pAnswers = payload.answers;
          
          if (pAnswers.goals !== undefined && typeof pAnswers.goals === 'string') cleanAnswers.goals = pAnswers.goals;
          if (pAnswers.team !== undefined && typeof pAnswers.team === 'string') cleanAnswers.team = pAnswers.team;
          if (pAnswers.budget !== undefined && typeof pAnswers.budget === 'string') cleanAnswers.budget = pAnswers.budget;
          
          if (pAnswers.platforms !== undefined && Array.isArray(pAnswers.platforms)) {
            cleanAnswers.platforms = pAnswers.platforms.filter(x => typeof x === 'string');
          }
          if (pAnswers.frameworks !== undefined && Array.isArray(pAnswers.frameworks)) {
            cleanAnswers.frameworks = pAnswers.frameworks.filter(x => typeof x === 'string');
          }
          if (pAnswers.testing !== undefined && typeof pAnswers.testing === 'boolean') cleanAnswers.testing = pAnswers.testing;
          if (pAnswers.coverageThreshold !== undefined && typeof pAnswers.coverageThreshold === 'number') {
            cleanAnswers.coverageThreshold = pAnswers.coverageThreshold;
          }
          if (pAnswers.compliance !== undefined && Array.isArray(pAnswers.compliance)) {
            cleanAnswers.compliance = pAnswers.compliance.filter(x => typeof x === 'string');
          }
          sessionState.answers = cleanAnswers;
        }

        // Nested validation for sections
        if (payload.sections !== undefined && typeof payload.sections === 'object' && payload.sections !== null) {
          const cleanSections = sessionState.sections || {};
          const pSections = payload.sections;
          const validSections = ['context', 'stack', 'gates', 'compliance'];
          
          for (const key of validSections) {
            if (pSections[key] !== undefined && typeof pSections[key] === 'object' && pSections[key] !== null) {
              if (pSections[key].status !== undefined && typeof pSections[key].status === 'string') {
                cleanSections[key] = { status: pSections[key].status };
              }
            }
          }
          sessionState.sections = cleanSections;
        }

        // Write atomic updates to disk
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionState, null, 2), 'utf8');
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
    let tooLarge = false;
    const MAX_SIZE = 10 * 1024; // 10KB limit
    req.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_SIZE) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
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

  // 4b. GET /api/report-content - Fetch specific report content securely
  if (req.method === 'GET' && url.pathname === '/api/report-content') {
    try {
      const fileName = url.searchParams.get('file');
      if (!fileName || !fileName.startsWith('repo-wizard-') || (!fileName.endsWith('.md') && !fileName.endsWith('.html'))) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing file name.' }));
        return;
      }

      const filePath = path.resolve(REPORTS_DIR, fileName);

      // Enforce boundary check to prevent Directory Traversal
      if (!filePath.startsWith(REPORTS_DIR + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access denied.' }));
        return;
      }

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
    } catch (err) {
      writeLog('error', 'Exception in report-content handler', correlationId, { error: err.message });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request' }));
    }
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
findOpenPort(PORT_START, (err, openPort) => {
  if (err) {
    writeLog('error', `Failed to find open port: ${err.message}`);
    process.exit(1);
  }
  server.listen(openPort, () => {
    console.log(`\n\x1b[1m\x1b[32m==================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   ^   \x1b[0m`);
    console.log(`\x1b[1m\x1b[35m   R   \x1b[0m  \x1b[1m\x1b[36mRepo Wizard Interactive Dashboard is Live!\x1b[0m`);
    console.log(`\x1b[1m\x1b[34m  Access URL:\x1b[0m \x1b[4mhttp://localhost:${openPort}\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m==================================================\x1b[0m\n`);
    
    writeLog('info', `Dashboard server started successfully on port ${openPort}`);
  });
});
