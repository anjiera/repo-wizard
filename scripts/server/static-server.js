'use strict';

const fs = require('fs');
const path = require('path');
const { writeLog } = require('./utils');

// We need to resolve the ROOT folder (parent of scripts/)
const ROOT = path.resolve(__dirname, '..', '..');

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

function formatETag(stats) {
  return `W/"${stats.size}-${stats.mtimeMs}"`;
}

/**
 * Generates ETag for cache validation (asynchronous version)
 */
async function getFileETagAsync(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return formatETag(stats);
  } catch (err) {
    return '';
  }
}

/**
 * Generates ETag for cache validation
 */
function getFileETag(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return formatETag(stats);
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

module.exports = {
  fileExists,
  getFileETag,
  getFileETagAsync,
  serveStaticFile
};
