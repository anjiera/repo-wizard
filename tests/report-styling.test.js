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

  // Test 4: Nested Lists rendering
  const nestedListMd = `- Parent\n  - Child\n    - Grandchild`;
  const nestedListHtml = convertMdToHtml(nestedListMd);
  assert(nestedListHtml.includes('<ul>\n  <li>Parent<ul>\n  <li>Child<ul>\n  <li>Grandchild</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>'), 'Nested lists should be wrapped in nested <ul> blocks inside <li>');

  // Test 5: Collapsible sections details wrapping
  const h2Md = `## Section Title\nSome content`;
  const h2Html = convertMdToHtml(h2Md);
  assert(h2Html.includes('<details class="section-details" id="details-section-title">'), 'h2 sections should be wrapped in details tag');
  assert(h2Html.includes('<summary class="section-summary"><h2 id="section-title" style="display: inline-block; margin: 0;">Section Title</h2></summary>'), 'h2 section header should be inside summary');
  assert(h2Html.includes('<div class="section-content">'), 'h2 content should be wrapped in section-content div');
  assert(h2Html.includes('</details>'), 'h2 details tag should be closed');
}

module.exports = { run };
