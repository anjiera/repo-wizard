'use strict';

const { assert } = require('./test-utils');
const { redactGitUrls, redactPaths, redactRepoName, redactReportText } = require('../scripts/redactor');

function run() {
  console.log('Testing redactor.js...');

  // Test Git URL Redaction
  const gitUrl1 = 'https://github.com/my-org/my-repo.git';
  const gitUrl2 = 'git@github.com:my-org/my-repo.git';
  assert(redactGitUrls(gitUrl1) === 'https://github.com/redacted-org/redacted-repo.git', 'redactGitUrls redacts https git url');
  assert(redactGitUrls(gitUrl2) === 'git@github.com:redacted-org/redacted-repo.git', 'redactGitUrls redacts ssh git url');

  // Test Paths Redaction
  const pathText = 'Error in D:\\DevSandbox\\agy-projects\\beat-the-heat\\src\\main.js';
  const targetPath = 'D:\\DevSandbox\\agy-projects\\beat-the-heat';
  assert(redactPaths(pathText, targetPath).includes('target-workspace-path'), 'redactPaths hides absolute target paths');

  // Test Repo Name Redaction
  const nameText = 'The project beat-the-heat is compiled.';
  assert(redactRepoName(nameText, 'beat-the-heat').includes('target-repository'), 'redactRepoName redacts the repo name');
  assert(redactRepoName('The project beat the heat is compiled.', 'beat-the-heat').includes('target-repository'), 'redactRepoName handles spaced repo name');

  // Test Combined redactReportText
  const fullText = 'Url: https://github.com/my-org/my-repo.git, Path: D:\\DevSandbox\\agy-projects\\beat-the-heat\\src\\main.js';
  const redacted = redactReportText(fullText, 'my-repo', 'D:\\DevSandbox\\agy-projects\\beat-the-heat');
  assert(redacted.includes('redacted-org/redacted-repo.git'), 'redactReportText redacts Git URLs');
  assert(redacted.includes('target-workspace-path'), 'redactReportText redacts Paths');
}

module.exports = { run };
