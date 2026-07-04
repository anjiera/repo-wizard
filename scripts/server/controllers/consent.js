'use strict';

const fs = require('fs');
const path = require('path');
const { writeLog } = require('../utils');
const { fileExists, convertMdToHtml } = require('../static-server'); // wait, convertMdToHtml is in md-to-html but we can require it
const { getSessionState, getCurrentSessionFile } = require('../session-store');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const mdToHtml = require(path.join(ROOT, 'solo-dev-toolkit', 'scripts', 'md-to-html'));

// TOS file location
const TOS_FILE = path.join(ROOT, '.repo-wizard', '.tos_agreed');

async function handleGetConsent(req, res, correlationId) {
  let activeTosFile = TOS_FILE;
  const currentSessionFile = getCurrentSessionFile();
  if (fs.existsSync(currentSessionFile)) {
    try {
      const sess = JSON.parse(await fs.promises.readFile(currentSessionFile, 'utf8'));
      if (sess.tosPath) {
        activeTosFile = path.join(path.resolve(sess.tosPath), '.tos_agreed');
      }
    } catch (e) {}
  }
  const exists = await fileExists(activeTosFile);
  if (!exists) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ consented: false }));
    return;
  }
  try {
    const data = JSON.parse(await fs.promises.readFile(activeTosFile, 'utf8'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ consented: true, data }));
  } catch (err) {
    writeLog('error', 'Failed to read TOS consent file', correlationId, { error: err.message });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ consented: false }));
  }
}

async function handleGetTos(req, res, correlationId) {
  try {
    const tosMdPath = path.join(ROOT, 'references', 'terms-of-service.md');
    const mdContent = await fs.promises.readFile(tosMdPath, 'utf8');
    const html = mdToHtml.convertMdToHtml(mdContent, 'Terms of Service & Developer Consent');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ html }));
  } catch (err) {
    writeLog('error', 'Failed to read or convert TOS markdown file', correlationId, { error: err.message });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve Terms of Service' }));
  }
}

function handlePostConsent(req, res, correlationId) {
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
    (async () => {
      try {
        const payload = JSON.parse(body);
        if (payload.agreed === true) {
          const consentData = {
            agreed: true,
            agreed_by: typeof payload.agreed_by === 'string' ? payload.agreed_by : 'dev-user',
            timestamp: new Date().toISOString()
          };
          let activeTosFile = TOS_FILE;
          const currentSessionFile = getCurrentSessionFile();
          if (fs.existsSync(currentSessionFile)) {
            try {
              const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
              if (sess.tosPath) {
                activeTosFile = path.join(path.resolve(sess.tosPath), '.tos_agreed');
              }
            } catch (e) {}
          }
          await fs.promises.mkdir(path.dirname(activeTosFile), { recursive: true });
          await fs.promises.writeFile(activeTosFile, JSON.stringify(consentData, null, 2), 'utf8');
          writeLog('info', 'TOS Consent saved successfully', correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'TOS accepted.' }));
        } else {
          let activeTosFile = TOS_FILE;
          const currentSessionFile = getCurrentSessionFile();
          if (fs.existsSync(currentSessionFile)) {
            try {
              const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
              if (sess.tosPath) {
                activeTosFile = path.join(path.resolve(sess.tosPath), '.tos_agreed');
              }
            } catch (e) {}
          }
          const exists = await fileExists(activeTosFile);
          if (exists) {
            await fs.promises.unlink(activeTosFile);
          }
          writeLog('info', 'TOS Consent declined / revoked', correlationId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'declined', message: 'TOS declined.' }));
        }
      } catch (err) {
        if (err instanceof SyntaxError) {
          writeLog('error', 'Malformed payload in consent update', correlationId, { error: err.message });
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
        } else {
          writeLog('error', 'Filesystem error during consent update', correlationId, { error: err.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Internal server error: ${err.message}` }));
        }
      }
    })();
  });
}

module.exports = {
  handleGetConsent,
  handleGetTos,
  handlePostConsent,
  TOS_FILE
};
