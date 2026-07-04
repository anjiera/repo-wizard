'use strict';

const fs = require('fs');
const path = require('path');
const { writeLog } = require('../utils');
const { fileExists, getFileETagAsync } = require('../static-server');
const sessionStore = require('../session-store');
const { getSafeRepoName } = require('../../reports-compiler-engine');

const ROOT = sessionStore.ROOT;

// Constants from dashboard-server.js or reportRoot defaults
const LAST_SESSION_POINTER = sessionStore.getLastSessionPointer();

// We need a helper to read/write config if needed, let's keep it simple
function handleGetSession(req, res, correlationId) {
  (async () => {
    const currentSessionFile = sessionStore.getCurrentSessionFile();
    const exists = await fileExists(currentSessionFile);
    if (!exists) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'not_found', message: 'No active session exists.' }));
      return;
    }

    const etag = await getFileETagAsync(currentSessionFile);
    const clientEtag = req.headers['if-none-match'];

    if (clientEtag && clientEtag === etag) {
      writeLog('info', 'Session ETag matched. Returning 304 Not Modified', correlationId);
      res.writeHead(304);
      res.end();
      return;
    }

    try {
      const data = await fs.promises.readFile(currentSessionFile, 'utf8');
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
  })();
}

function handlePostSession(req, res, correlationId, cliReportStyle, reportRoot, cliReportStyleVal) {
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

    sessionStore.sessionPromiseChain = sessionStore.sessionPromiseChain.then(async () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (jsonErr) {
        writeLog('error', 'Malformed payload in session update', correlationId, { error: jsonErr.message });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
        return;
      }

      try {
        let currentSessionFile = sessionStore.getCurrentSessionFile();
        let sessionState = sessionStore.getSessionState();

        // Reload from disk to prevent concurrency race conditions
        const exists = await fileExists(currentSessionFile);
        if (exists) {
          try {
            sessionState = JSON.parse(await fs.promises.readFile(currentSessionFile, 'utf8'));
          } catch (e) { /* ignore */ }
        }

        let repoName = 'project';
        let activeReportRoot = sessionState.reportPath ? path.resolve(sessionState.reportPath) : reportRoot;
        if (payload.reportPath !== undefined && typeof payload.reportPath === 'string') {
          activeReportRoot = payload.reportPath ? path.resolve(payload.reportPath) : reportRoot;
        }
        const activeReportsRootDir = path.join(activeReportRoot, '.repo-wizard', 'reports');

        if (payload.targetPath !== undefined && typeof payload.targetPath === 'string') {
          const oldPath = sessionState.targetPath;
          if (payload.targetPath !== oldPath) {
            repoName = getSafeRepoName(payload.targetPath);
            const targetSessionFile = path.join(activeReportsRootDir, repoName, 'session.json');
            const targetExists = await fileExists(targetSessionFile);
            if (targetExists) {
              try {
                sessionState = JSON.parse(await fs.promises.readFile(targetSessionFile, 'utf8'));
              } catch (e) {
                sessionState = {};
              }
            } else {
              sessionState = {};
            }
            sessionState.targetPath = payload.targetPath;
          }
          sessionState.targetPath = payload.targetPath;
          repoName = getSafeRepoName(payload.targetPath);
        } else if (sessionState.targetPath) {
          repoName = getSafeRepoName(sessionState.targetPath);
        }

        if (payload.status !== undefined && typeof payload.status === 'string') sessionState.status = payload.status;
        if (payload.currentStep !== undefined && typeof payload.currentStep === 'number') sessionState.currentStep = payload.currentStep;
        if (payload.mode !== undefined && typeof payload.mode === 'string') sessionState.mode = payload.mode;
        if (payload.redact !== undefined) sessionState.redact = !!payload.redact;
        if (payload.reportPath !== undefined && typeof payload.reportPath === 'string') sessionState.reportPath = payload.reportPath;
        if (payload.tosPath !== undefined && typeof payload.tosPath === 'string') sessionState.tosPath = payload.tosPath;
        if (!sessionState.reportStyle) {
          sessionState.reportStyle = cliReportStyleVal || 'whitepaper';
        }

        // Nested validation for answers
        if (payload.answers !== undefined && typeof payload.answers === 'object' && payload.answers !== null) {
          const cleanAnswers = sessionState.answers || {};
          const pAnswers = payload.answers;
          
          if (pAnswers.goals !== undefined && typeof pAnswers.goals === 'string') cleanAnswers.goals = pAnswers.goals;
          if (pAnswers.team !== undefined && typeof pAnswers.team === 'string') cleanAnswers.team = pAnswers.team;
          if (pAnswers.budget !== undefined && typeof pAnswers.budget === 'string') cleanAnswers.budget = pAnswers.budget;
          if (pAnswers.projectGoal !== undefined && typeof pAnswers.projectGoal === 'string') cleanAnswers.projectGoal = pAnswers.projectGoal;
          if (pAnswers.expertiseLevel !== undefined && typeof pAnswers.expertiseLevel === 'string') cleanAnswers.expertiseLevel = pAnswers.expertiseLevel;
          
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
          let validSections = ['context', 'stack', 'gates', 'compliance'];
          try {
            const configPath = path.resolve(ROOT, 'dashboard', 'src', 'config', 'stepper-config.json');
            if (fs.existsSync(configPath)) {
              const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              if (config && Array.isArray(config.steps)) {
                validSections = config.steps.map(s => s.id);
              }
            }
          } catch (err) {
            // fallback
          }
          
          for (const key of validSections) {
            if (pSections[key] !== undefined && typeof pSections[key] === 'object' && pSections[key] !== null) {
              if (pSections[key].status !== undefined && typeof pSections[key].status === 'string') {
                cleanSections[key] = { status: pSections[key].status };
              }
            }
          }
          sessionState.sections = cleanSections;
        }

        // Select the correct output session file
        const activeReportRootFinal = sessionState.reportPath ? path.resolve(sessionState.reportPath) : reportRoot;
        const activeReportsRootDirFinal = path.join(activeReportRootFinal, '.repo-wizard', 'reports');
        const newSessionFile = path.join(activeReportsRootDirFinal, repoName, 'session.json');
        await fs.promises.mkdir(path.dirname(newSessionFile), { recursive: true });
        
        sessionStore.setCurrentSessionFile(newSessionFile);
        sessionStore.setSessionState(sessionState);

        // Save pointer atomically
        const tempPointer = LAST_SESSION_POINTER + '.tmp';
        await fs.promises.writeFile(tempPointer, JSON.stringify({ lastSessionPath: newSessionFile }, null, 2), 'utf8');
        await fs.promises.rename(tempPointer, LAST_SESSION_POINTER);

        // Write session file atomically
        const tempSession = newSessionFile + '.tmp';
        await fs.promises.writeFile(tempSession, JSON.stringify(sessionState, null, 2), 'utf8');
        await fs.promises.rename(tempSession, newSessionFile);

        writeLog('info', 'Successfully updated session state', correlationId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Session updated.' }));
      } catch (fsErr) {
        writeLog('error', 'Failed to update session file on disk', correlationId, { error: fsErr.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error updating session state.' }));
      }
    }).catch(err => {
      writeLog('error', 'Critical queue exception during session update', correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server queue error.' }));
    });
  });
}

module.exports = {
  handleGetSession,
  handlePostSession
};
