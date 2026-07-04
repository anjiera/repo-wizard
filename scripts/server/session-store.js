'use strict';

const fs = require('fs');
const path = require('path');
const { fileExists } = require('./static-server');

// We need to resolve the ROOT folder (parent of scripts/)
const ROOT = path.resolve(__dirname, '..', '..');

// Defaults
const defaultReportRoot = ROOT;
const LAST_SESSION_POINTER = path.join(defaultReportRoot, '.repo-wizard', 'last_session_path.json');
let currentSessionFile = path.join(defaultReportRoot, '.repo-wizard', 'session.json');

// Initialize currentSessionFile from disk pointer on startup
if (fs.existsSync(LAST_SESSION_POINTER)) {
  try {
    const ptr = JSON.parse(fs.readFileSync(LAST_SESSION_POINTER, 'utf8'));
    if (ptr.lastSessionPath && fs.existsSync(ptr.lastSessionPath)) {
      currentSessionFile = ptr.lastSessionPath;
    }
  } catch (e) {
    // Ignore
  }
}

let sessionState = {};
if (fs.existsSync(currentSessionFile)) {
  try {
    sessionState = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
  } catch (e) {
    sessionState = {};
  }
}

// Concurrency queue to serialize session updates
let sessionPromiseChain = Promise.resolve();

function getSessionState() {
  return sessionState;
}

function setSessionState(state) {
  sessionState = state;
}

function getCurrentSessionFile() {
  return currentSessionFile;
}

function setCurrentSessionFile(file) {
  currentSessionFile = file;
}

function getLastSessionPointer() {
  return LAST_SESSION_POINTER;
}

module.exports = {
  ROOT,
  getSessionState,
  setSessionState,
  getCurrentSessionFile,
  setCurrentSessionFile,
  getLastSessionPointer,
  sessionPromiseChain
};
