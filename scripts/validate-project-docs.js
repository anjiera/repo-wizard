#!/usr/bin/env node
/**
 * scripts/validate-project-docs.js
 *
 * Enforces documentation upkeep checks in the pre-commit hook:
 * 1. References Directory: Every file in references/ (excluding README) must be cataloged in references/README.md.
 * 2. Agent Matrix Coverage: Every agent in agents/ must be listed in docs/AGENT_MATRIX.md.
 * 3. Skill Matrix Coverage: Every skill directory in skills/ must be listed in docs/AGENT_MATRIX.md.
 * 4. Main Navigation Coverage: Every guide in docs/ (excluding generated HTML files) must be referenced in the root README.md.
 * 5. Markdown Duplication: Detects intra-file and inter-file text repetitions.
 *
 * Exit codes: 0 = all clear, 1 = validation errors
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { ROOT_DIR, COLORS, scanDir } = require('./validation-helpers');
const { RESET, BOLD, GREEN, RED, BLUE } = COLORS;
const YELLOW = '\x1b[33m';

const ROOT = ROOT_DIR;
const REFS_DIR = path.join(ROOT, 'references');
const REFS_INDEX = path.join(REFS_DIR, 'README.md');
const AGENTS_DIR = path.join(ROOT, 'agents');
const MATRIX_FILE = path.join(ROOT, 'docs', 'AGENT_MATRIX.md');
const SKILLS_DIR = path.join(ROOT, 'skills');
const DOCS_DIR = path.join(ROOT, 'docs');
const README_FILE = path.join(ROOT, 'README.md');
const AGENTS_MD_FILE = path.join(ROOT, 'AGENTS.md');
const MAX_AGENTS_MD_LINES = 300;

let totalErrors = 0;

function reportError(msg) {
  totalErrors++;
  console.log(`  ${RED}✗ ERROR:${RESET} ${msg}`);
}

function validateReferencesIndex() {
  console.log('Checking References catalog coverage (references/README.md)...');
  if (!fs.existsSync(REFS_INDEX)) {
    reportError('references/README.md is missing.');
    return;
  }

  const indexContent = fs.readFileSync(REFS_INDEX, 'utf8');
  const files = fs.readdirSync(REFS_DIR)
    .filter(f => fs.statSync(path.join(REFS_DIR, f)).isFile() && f !== 'README.md' && f !== 'README.html' && !f.startsWith('.') && !f.endsWith('.swp'));

  for (const file of files) {
    if (!indexContent.includes(file)) {
      reportError(`Reference file '${file}' is not indexed in references/README.md. Please add it to the catalog.`);
    }
  }
}

function validateAgentMatrix() {
  console.log('Checking Agent Matrix coverage (docs/AGENT_MATRIX.md)...');
  if (!fs.existsSync(MATRIX_FILE)) {
    reportError('docs/AGENT_MATRIX.md is missing.');
    return;
  }

  const registryFile = path.join(ROOT, 'agents', 'agent-registry.json');
  if (!fs.existsSync(registryFile)) {
    reportError('agents/agent-registry.json is missing.');
    return;
  }

  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  } catch (err) {
    reportError(`Failed to parse agent-registry.json: ${err.message}`);
    return;
  }

  const matrixContent = fs.readFileSync(MATRIX_FILE, 'utf8');
  const matrixLines = matrixContent.split('\n');

  const agentFiles = fs.readdirSync(AGENTS_DIR)
    .filter(f => fs.statSync(path.join(AGENTS_DIR, f)).isFile() && f.endsWith('.md') && !f.startsWith('.') && !f.endsWith('.swp'));

  for (const file of agentFiles) {
    const agentName = path.basename(file, '.md');
    
    // Find the row in AGENT_MATRIX.md containing this agent persona key
    const matchingRow = matrixLines.find(line => {
      const parts = line.split('|').map(s => s.trim());
      return parts.length > 2 && parts[2] === `\`${agentName}\``;
    });

    if (!matchingRow) {
      reportError(`Agent persona '${agentName}' is not listed in docs/AGENT_MATRIX.md. Please add it to the taxonomy matrix.`);
      continue;
    }

    const registryEntry = registry[agentName];
    if (registryEntry) {
      const parts = matchingRow.split('|').map(s => s.trim());
      // Description is in column index 7
      const matrixDescription = parts[7];
      if (matrixDescription !== registryEntry.description) {
        reportError(`Description for agent '${agentName}' in docs/AGENT_MATRIX.md does not match agents/agent-registry.json.\n` +
                    `    Expected: "${registryEntry.description}"\n` +
                    `    Found:    "${matrixDescription}"`);
      }
    }
  }
}

function validateSkillMatrix() {
  console.log('Checking Skills Matrix coverage (docs/AGENT_MATRIX.md)...');
  if (!fs.existsSync(MATRIX_FILE)) return;

  const matrixContent = fs.readFileSync(MATRIX_FILE, 'utf8');
  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory() && !d.startsWith('.'));

  for (const dir of skillDirs) {
    if (!matrixContent.includes(dir)) {
      reportError(`Skill directory '${dir}' is not listed in docs/AGENT_MATRIX.md. Please add it to the taxonomy matrix.`);
    }
  }
}

function validateReadmeNavigation() {
  console.log('Checking Main README navigation map (README.md)...');
  if (!fs.existsSync(README_FILE)) {
    reportError('Root README.md is missing.');
    return;
  }

  const readmeContent = fs.readFileSync(README_FILE, 'utf8');
  const docsFiles = fs.readdirSync(DOCS_DIR)
    .filter(f => fs.statSync(path.join(DOCS_DIR, f)).isFile() && f.endsWith('.md') && f !== 'README.md' && !f.startsWith('.') && !f.endsWith('.swp'));

  for (const file of docsFiles) {
    if (!readmeContent.includes(file)) {
      reportError(`Documentation file 'docs/${file}' is not mapped in root README.md. Please add it to the Documentation & Navigation Map section.`);
    }
  }
}

// Whitelisted paragraphs/lines to ignore
const COMMON_WHITELIST = [
  // No Advice Provided Disclaimer
  "no advice provided the reference standards checklists and documentation catalogs in this directory are educational and informational resources they do not constitute legal financial compliance regulatory or safety advice developers must perform their own review of recommendations configurations and licenses to ensure compatibility with their organizational standards and local laws",
  // Developer Empowerment Disclaimer
  "developer empowerment disclaimer repo wizard provides automated observations analysis and educational suggestions regarding your codebase and toolchain the user retains final engineering accountability and sole responsibility for tool choices configuration testing compliance adoption and long-term maintenance this report does not constitute legal advice compliance certification or formal audit results",
  // Agent prompt rules and delegator boilerplates
  "you must strictly follow the styling formatting and behavior guidelines defined in agent execution rules",
  "for the stepbystep auditing checklist alignment phases scaffolding rules verification tasks and standard guidelines you must load and follow the paired skill workflow do not duplicate or deviate from the skill instructions",
  "you must load and strictly adhere to the unified safety rules mock constraints redacted mode compliance and tool execution boundaries defined in handoff sandbox constraints do not duplicate or deviate from those constraints"
];

function validateDuplication() {
  console.log('Checking documentation for duplicate paragraphs/sections...');

  const scanDirs = [
    path.join(ROOT, 'skills'),
    path.join(ROOT, 'agents'),
    path.join(ROOT, 'references'),
    path.join(ROOT, 'docs')
  ];

  const files = [];
  for (const dir of scanDirs) {
    scanDir(dir, '.md', files);
  }

  // Track occurrences: normalized_text -> { count: number, files: Set<string>, rawText: string }
  const globalParagraphs = new Map();

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');

    // Split content by blank lines (collapsing multiple newlines)
    const paragraphs = content.split(/\r?\n\s*\r?\n/);
    const localParagraphs = new Set();

    for (let p of paragraphs) {
      p = p.trim();
      if (!p) continue;

      // 1. Remove code blocks
      const noCodeBlocks = p.replace(/```[\s\S]*?```/g, '').trim();
      if (!noCodeBlocks) continue;

      // 2. Remove blockquotes and alerts
      const noBlockquotes = noCodeBlocks.replace(/^>\s*(?:\[![A-Z]+\])?/gim, '').trim();
      if (!noBlockquotes) continue;

      const lines = noBlockquotes.split(/\r?\n/);
      const filteredLines = [];

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Skip headers (starting with #)
        if (line.startsWith('#')) continue;
        // Skip table formatting lines (starting with |)
        if (line.startsWith('|')) continue;
        // Skip horizontal rules
        if (/^[-*_]{3,}$/.test(line)) continue;

        filteredLines.push(line);
      }

      if (filteredLines.length === 0) continue;

      const cleanedParagraph = filteredLines.join(' ').trim();

      // Normalize string: strip markdown links, bold markers, bullet symbols, convert to lowercase, collapse whitespace, strip punctuation
      const normalized = cleanedParagraph
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // replace [text](url) with text
        .replace(/\*\*|__|\*|_/g, '')             // remove bold/italic formatting
        .replace(/^[-*+]\s+/, '')                 // remove single bullet markers at start
        .replace(/^\d+\.\s+/, '')                 // remove ordered list prefix at start
        .replace(/`/g, '')                        // remove backticks
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "") // strip punctuation
        .replace(/\s+/g, ' ')                     // collapse whitespaces
        .trim();

      // Ignore short sentences/paragraphs
      if (normalized.length < 60 || normalized.split(' ').length < 10) continue;

      // Ignore whitelisted common disclaimers
      if (COMMON_WHITELIST.some(w => normalized.includes(w))) continue;

      // Check intra-file duplication
      const relativePath = path.relative(ROOT, file);
      if (localParagraphs.has(normalized)) {
        reportError(`Intra-file duplication: The paragraph starting with "${cleanedParagraph.substring(0, 60)}..." is repeated within ${relativePath}.`);
      } else {
        localParagraphs.add(normalized);
      }

      // Track globally for inter-file duplication
      if (!globalParagraphs.has(normalized)) {
        globalParagraphs.set(normalized, {
          files: new Set(),
          rawText: cleanedParagraph
        });
      }
      globalParagraphs.get(normalized).files.add(relativePath);
    }
  }

  // Check inter-file duplication: if a paragraph appears in more than 2 files (i.e. >= 3 files), report it
  for (const [normalized, data] of globalParagraphs.entries()) {
    if (data.files.size >= 3) {
      const fileList = Array.from(data.files).join(', ');
      reportError(`Inter-file duplication: Identical text is duplicated across ${data.files.size} files (${fileList}):\n       "${data.rawText.substring(0, 100)}..."\n       Please extract this block into a shared reference file under references/.`);
    }
  }
}

const { execSync } = require('child_process');

function runGenericValidateDocs() {
  try {
    execSync('node solo-dev-toolkit/scripts/validate-docs.js', { stdio: 'inherit', cwd: ROOT });
  } catch (err) {
    totalErrors++;
  }
}

function main() {
  validateReferencesIndex();
  validateAgentMatrix();
  validateSkillMatrix();
  validateReadmeNavigation();
  validateDuplication();
  runGenericValidateDocs();

  if (totalErrors > 0) {
    console.log(`\n${BOLD}${RED}Documentation check complete: ${totalErrors} error(s) found.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}✓ All documentation upkeep audits passed successfully.${RESET}`);
    process.exit(0);
  }
}

main();
