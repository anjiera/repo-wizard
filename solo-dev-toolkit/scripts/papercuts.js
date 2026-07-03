#!/usr/bin/env node
/**
 * solo-dev-toolkit/scripts/papercuts.js
 *
 * Zero-dependency CLI manager for papercuts.csv registry.
 * - Logs new papercuts with deduplication and frequency increments
 * - Lists active papercuts with status tags and 10x elevation warnings
 * - Runs interactive or automated checkups to prune solved or missing items
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { RESET, BOLD, GREEN, RED, YELLOW, BLUE, CYAN } = require('./cli-helpers');
const { parseCSVToObjects } = require('./csv-parser-helper');

const ROOT = path.resolve(__dirname, '..', '..');
const CSV_FILE = path.join(ROOT, 'papercuts.csv');
const HEADERS = ['DateFirstSeen', 'DateLastSeen', 'File', 'Line', 'Scope', 'Severity', 'Description', 'Frequency'];

function showHelp() {
  console.log(`
${BOLD}${CYAN}Solo-Dev-Toolkit Papercuts Manager${RESET}
Usage:
  node solo-dev-toolkit/scripts/papercuts.js --list
  node solo-dev-toolkit/scripts/papercuts.js --add --file <path> --scope <scope> --desc <description> [--severity <Nit|FYI>] [--line <line>]
  node solo-dev-toolkit/scripts/papercuts.js --triage [--force]

Options:
  --list         List all active papercuts, highlighting elevated ones (freq >= 10)
  --add          Programmatically record or increment a papercut
  --triage       Verify file existence, auto-prune missing files, and run interactive resolution checks
  --force        Prune all checked files automatically without prompting in triage mode
`);
}

function writeCSV(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map(h => {
      let val = String(row[h] || '');
      // Escape commas, quotes, and newlines
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(line.join(','));
  }
  return lines.join('\n') + '\n';
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function readRegistry() {
  if (!fs.existsSync(CSV_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(CSV_FILE, 'utf8');
    return parseCSVToObjects(content);
  } catch (err) {
    console.error(`${RED}Failed to read papercuts registry:${RESET}`, err.message);
    return [];
  }
}

function writeRegistry(rows) {
  try {
    const content = writeCSV(HEADERS, rows);
    fs.writeFileSync(CSV_FILE, content, 'utf8');
    return true;
  } catch (err) {
    console.error(`${RED}Failed to write papercuts registry:${RESET}`, err.message);
    return false;
  }
}

async function handleList() {
  const rows = readRegistry();
  if (rows.length === 0) {
    console.log(`${GREEN}No active papercuts found. Clean registry!${RESET}`);
    return;
  }

  console.log(`\n${BOLD}${CYAN}--- Active Developer Papercuts List (${rows.length} items) ---${RESET}\n`);

  let elevatedCount = 0;
  
  rows.forEach((row, index) => {
    const freq = parseInt(row.Frequency || '1', 10);
    const lineStr = row.Line && row.Line !== '0' ? `:${row.Line}` : '';
    const isElevated = freq >= 10;
    
    if (isElevated) elevatedCount++;

    const prefix = isElevated 
      ? `${RED}${BOLD}[ELEVATED SIGHTING x${freq}]${RESET}` 
      : `${YELLOW}[x${freq}]${RESET}`;
      
    const severityTag = row.Severity ? `${BOLD}${row.Severity}${RESET} ` : '';

    console.log(`${prefix} ${severityTag}${CYAN}${row.File}${lineStr}${RESET} @ ${BOLD}${row.Scope}${RESET}`);
    console.log(`    "${row.Description}" (First seen: ${row.DateFirstSeen}, Last seen: ${row.DateLastSeen})`);
    console.log('');
  });

  if (elevatedCount > 0) {
    console.log(`${RED}${BOLD}⚠ WARNING: There are ${elevatedCount} elevated papercut(s) (seen 10+ times). Please consider fixing them soon.${RESET}`);
  }

  if (rows.length >= 100) {
    console.log(`\n${RED}${BOLD}===================================================================`);
    console.log(`WARNING: The registry currently contains ${rows.length} active papercuts.`);
    console.log(`Consider scheduling a "Papercut Day" cleanup session.`);
    console.log(`===================================================================${RESET}\n`);
  }
}

async function handleAdd(args) {
  const fileIndex = args.indexOf('--file');
  const scopeIndex = args.indexOf('--scope');
  const descIndex = args.indexOf('--desc');
  const sevIndex = args.indexOf('--severity');
  const lineIndex = args.indexOf('--line');

  if (fileIndex === -1 || scopeIndex === -1 || descIndex === -1) {
    console.error(`${RED}Error: --file, --scope, and --desc are required for --add.${RESET}`);
    showHelp();
    process.exit(1);
  }

  const rawFile = args[fileIndex + 1];
  const scope = args[scopeIndex + 1];
  const desc = args[descIndex + 1];
  const severity = sevIndex !== -1 ? args[sevIndex + 1] : 'Nit';
  const line = lineIndex !== -1 ? args[lineIndex + 1] : '0';

  if (!rawFile || !scope || !desc) {
    console.error(`${RED}Error: Values cannot be empty for --file, --scope, or --desc.${RESET}`);
    process.exit(1);
  }

  // Normalize path relative to repository ROOT using forward slashes
  const absPath = path.resolve(ROOT, rawFile);
  const rootResolved = path.resolve(ROOT);
  if (!absPath.startsWith(rootResolved + path.sep) && absPath !== rootResolved) {
    console.error(`${RED}Error: Path traversal detected. --file must point to a file inside the repository boundary.${RESET}`);
    process.exit(1);
  }
  const normalizedFile = path.relative(ROOT, absPath).replace(/\\/g, '/');

  const rows = readRegistry();
  const today = new Date().toISOString().slice(0, 10);

  // Check for duplicates
  const duplicate = rows.find(r => 
    r.File.toLowerCase() === normalizedFile.toLowerCase() &&
    r.Scope.toLowerCase() === scope.toLowerCase() &&
    r.Description.toLowerCase() === desc.toLowerCase()
  );

  if (duplicate) {
    const oldFreq = parseInt(duplicate.Frequency || '1', 10);
    duplicate.Frequency = String(oldFreq + 1);
    duplicate.Line = line;
    duplicate.DateLastSeen = today;
    console.log(`${YELLOW}Papercut matched duplicate. Frequency elevated to x${duplicate.Frequency}.${RESET}`);
  } else {
    rows.push({
      DateFirstSeen: today,
      DateLastSeen: today,
      File: normalizedFile,
      Line: line,
      Scope: scope,
      Severity: severity.startsWith('[') ? severity : `[${severity}]`,
      Description: desc,
      Frequency: '1'
    });
    console.log(`${GREEN}New papercut added to registry: ${normalizedFile} @ ${scope}.${RESET}`);
  }

  writeRegistry(rows);
}

async function handleTriage(args) {
  const isForce = args.includes('--force');
  const rows = readRegistry();
  if (rows.length === 0) {
    console.log(`${GREEN}Registry is empty. No triage needed.${RESET}`);
    return;
  }

  const updatedRows = [];
  let prunedCount = 0;
  const isTTY = process.stdin.isTTY;

  for (const row of rows) {
    const absPath = path.join(ROOT, row.File);
    
    // Auto-prune missing files
    if (!fs.existsSync(absPath)) {
      console.log(`${RED}[AUTO-PRUNED] File no longer exists: ${row.File}${RESET}`);
      prunedCount++;
      continue;
    }

    if (isForce) {
      updatedRows.push(row);
      continue;
    }

    // Interactive check if TTY
    if (isTTY) {
      console.log(`\nActive Papercut: ${CYAN}${row.File}${RESET} @ ${BOLD}${row.Scope}${RESET}`);
      console.log(`Description:     "${row.Description}" (Freq: x${row.Frequency})`);
      
      const answer = await askQuestion('Is this issue resolved? [y/N/Skip]: ');
      if (answer === 'y') {
        console.log(`${GREEN}[RESOLVED] Pruned from registry.${RESET}`);
        prunedCount++;
      } else {
        updatedRows.push(row);
      }
    } else {
      updatedRows.push(row);
    }
  }

  if (prunedCount > 0) {
    writeRegistry(updatedRows);
    console.log(`\n${GREEN}Triage complete. Pruned ${prunedCount} items. Active count: ${updatedRows.length}.${RESET}`);
  } else {
    console.log(`\n${GREEN}Triage complete. No changes made. Active count: ${rows.length}.${RESET}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--list')) {
    await handleList();
  } else if (args.includes('--add')) {
    await handleAdd(args);
  } else if (args.includes('--triage')) {
    await handleTriage(args);
  } else {
    console.error(`${RED}Unknown options: ${args.join(' ')}${RESET}`);
    showHelp();
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${RED}Fatal error:${RESET}`, err.message);
  process.exit(1);
});
