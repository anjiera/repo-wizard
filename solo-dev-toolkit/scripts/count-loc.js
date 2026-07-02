#!/usr/bin/env node
/**
 * count-loc.js
 *
 * A reusable, zero-dependency helper utility designed to estimate first-party
 * lines of code (LOC) and file counts while excluding dependencies, build outputs,
 * VCS directories, lock files, and binary/media assets.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Colors for terminal formatting
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

let INCREMENTAL_ADOPTION_THRESHOLD_LOC = 30000;
try {
  const constants = require(path.join(__dirname, '..', '..', 'scripts', 'report-constants.js'));
  if (constants && constants.INCREMENTAL_ADOPTION_THRESHOLD_LOC !== undefined) {
    INCREMENTAL_ADOPTION_THRESHOLD_LOC = constants.INCREMENTAL_ADOPTION_THRESHOLD_LOC;
  }
} catch (e) {
  // Fallback if imported externally
}

// Configuration for exclusions
const EXCLUDED_DIRS = new Set([
  'node_modules', 'vendor', 'bower_components', // Dependency Directories
  'dist', 'build', 'out', 'target', 'bin', 'obj', // Build & Dist Outputs
  'coverage'                                     // Test Coverage
]);

const EXCLUDED_FILES = new Set([
  'package-lock.json', 'go.sum', 'Cargo.lock', 'yarn.lock', 'pnpm-lock.yaml' // Lock files
]);

const EXCLUDED_EXTENSIONS = new Set([
  // Compiled Binaries
  '.exe', '.dll', '.so', '.dylib', '.bin', '.out', '.keystore', '.jar',
  // Media and Design Assets
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp3', '.mp4', '.pdf', '.zip', '.tar.gz',
  // Font Files
  '.ttf', '.woff', '.woff2', '.eot', '.otf'
]);

// Map extensions to language names
const EXTENSION_MAP = {
  '.js': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.jsx': 'JavaScript',
  '.go': 'Go',
  '.py': 'Python',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.rs': 'Rust',
  '.swift': 'Swift',
  '.sh': 'Shell',
  '.bat': 'Batch',
  '.ps1': 'PowerShell',
  '.html': 'HTML',
  '.css': 'CSS',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.xml': 'XML',
  '.gradle': 'Gradle',
  '.toml': 'TOML'
};

function printUsageAndExit() {
  console.error(`${RED}✗ Error: Missing parameter${RESET}`);
  console.error(`Usage: node solo-dev-toolkit/scripts/count-loc.js --target-path <directory_path> [--json]`);
  process.exit(1);
}

// Parse arguments
let targetPath = null;
let outputJson = false;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target-path') {
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      targetPath = args[i + 1];
      i++;
    }
  } else if (args[i] === '--json') {
    outputJson = true;
  }
}

if (!targetPath) {
  printUsageAndExit();
}

const resolvedTarget = path.resolve(targetPath);
if (!fs.existsSync(resolvedTarget)) {
  if (outputJson) {
    console.log(JSON.stringify({ error: `Target path does not exist: ${resolvedTarget}` }));
  } else {
    console.error(`${RED}✗ Error: Target path does not exist: ${resolvedTarget}${RESET}`);
  }
  process.exit(1);
}

// Stats tracking
const stats = {
  totalFiles: 0,
  totalLOC: 0,
  languages: {},
  exceedsAdoptionThreshold: false
};

function walk(dir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return;
  }

  for (const file of files) {
    const fullPath = path.join(dir, file);
    let fileStat;
    try {
      fileStat = fs.statSync(fullPath);
    } catch (err) {
      continue;
    }

    if (fileStat.isDirectory()) {
      if (file.startsWith('.') || EXCLUDED_DIRS.has(file)) {
        continue;
      }
      walk(fullPath);
    } else if (fileStat.isFile()) {
      if (EXCLUDED_FILES.has(file)) {
        continue;
      }
      
      const ext = path.extname(file).toLowerCase();
      if (EXCLUDED_EXTENSIONS.has(ext)) {
        continue;
      }

      const langName = EXTENSION_MAP[ext] || 'Other/Unknown';

      // Count lines
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Simple line count by matching newlines
        const loc = content.split(/\r?\n/).length;

        stats.totalFiles++;
        stats.totalLOC += loc;

        if (!stats.languages[langName]) {
          stats.languages[langName] = { files: 0, loc: 0 };
        }
        stats.languages[langName].files++;
        stats.languages[langName].loc += loc;
      } catch (err) {
        // Skip unreadable files
      }
    }
  }
}

walk(resolvedTarget);

stats.exceedsAdoptionThreshold = stats.totalLOC > INCREMENTAL_ADOPTION_THRESHOLD_LOC;

if (outputJson) {
  console.log(JSON.stringify(stats, null, 2));
} else {
  console.log(`\n${BLUE}==>${RESET} ${BOLD}Sizing Codebase Metrics for: ${path.basename(resolvedTarget)}${RESET}`);
  console.log(`--------------------------------------------------`);
  console.log(`Total Files:   ${GREEN}${stats.totalFiles}${RESET}`);
  console.log(`Total LOC:     ${GREEN}${stats.totalLOC}${RESET}`);
  console.log(`--------------------------------------------------`);
  if (stats.exceedsAdoptionThreshold) {
    console.log(`${YELLOW}⚠ WARNING: Codebase size exceeds the incremental adoption threshold (${INCREMENTAL_ADOPTION_THRESHOLD_LOC} LOC).${RESET}`);
    console.log(`--------------------------------------------------`);
  }
  console.log(`${BOLD}Language Distribution:${RESET}`);
  
  const sortedLangs = Object.entries(stats.languages).sort((a, b) => b[1].loc - a[1].loc);
  for (const [lang, langStats] of sortedLangs) {
    const percentage = stats.totalLOC > 0 ? ((langStats.loc / stats.totalLOC) * 100).toFixed(1) : '0.0';
    console.log(`  - ${BOLD}${lang.padEnd(18)}${RESET} Files: ${langStats.files.toString().padEnd(6)} LOC: ${langStats.loc.toString().padEnd(8)} (${percentage}%)`);
  }
  console.log();
}
