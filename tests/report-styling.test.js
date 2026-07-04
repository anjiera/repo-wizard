'use strict';

const { assert } = require('./test-utils');
const { convertMdToHtml } = require('../solo-dev-toolkit/scripts/md-to-html');

function run() {
  console.log('Testing md-to-html.js report styling options...');

  // Test 1: Compile with default (whitepaper)
  const defaultHtml = convertMdToHtml('# Title', 'Title', 'whitepaper');
  assert(defaultHtml.includes('--bg-primary: #ffffff'), 'Default (whitepaper) background should be white');
  assert(defaultHtml.includes('--text-primary: #1f2937'), 'Default (whitepaper) text should be dark gray');

  // Test 2: Compile with dark-blue
  const darkBlueHtml = convertMdToHtml('# Title', 'Title', 'dark-blue');
  assert(darkBlueHtml.includes('--bg-primary: #fafafa'), 'dark-blue light-mode background should be #fafafa');
  assert(darkBlueHtml.includes('--bg-primary: #0f172a'), 'dark-blue dark-mode background should be #0f172a');

  // Test 3: Malformed style falls back to whitepaper without crashing
  const originalConsoleError = console.error;
  let loggedError = false;
  console.error = () => { loggedError = true; };

  try {
    const invalidHtml = convertMdToHtml('# Title', 'Title', 'some-nonexistent-style');
    assert(invalidHtml.includes('--bg-primary: #ffffff'), 'Invalid style fallback should use whitepaper bg color');
    assert(loggedError, 'A warning/error log should have been recorded for the invalid style name');
  } finally {
    console.error = originalConsoleError;
  }
}

module.exports = { run };
