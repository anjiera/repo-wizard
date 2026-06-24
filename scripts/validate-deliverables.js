#!/usr/bin/env node
/**
 * validate-deliverables.js
 *
 * Validates generated deliverables (Full Technical Reports, Executive Summaries,
 * Observations Summaries, and backlog.csv) for compliance with layout, structure,
 * disclaimers, word counts, and formatting constraints.
 *
 * Usage:
 *   node scripts/validate-deliverables.js [--dir <path>] [--test]
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ANSI escape codes for premium console styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

// Expected CSV Columns
const CSV_COLUMNS = [
  'Summary',
  'Description',
  'Issue Type',
  'Epic Name / Parent',
  'Labels',
  'Recommended By (Sub-Agent)',
  'Frameworks/Goals'
];

/**
 * Simple CSV parser that handles quotes and newlines
 */
function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          field += '"';
          i++;
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r' || char === '\n') {
        row.push(field);
        field = '';
        if (row.length > 1 || row[0] !== '') {
          rows.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        field += char;
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Helper to count words in a string
 */
function countWords(str) {
  const clean = str.replace(/[#\-\*\`\[\]\(\)\<\>\/]/g, ' ').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

/**
 * Validates a single markdown or HTML file
 */
function validateFile(filePath) {
  const errors = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  const isHtml = filePath.endsWith('.html');

  // 1. Check Developer Empowerment Disclaimer
  if (!content.includes(DISCLAIMER_TEXT)) {
    errors.push(`Missing Developer Empowerment Disclaimer.`);
  }

  // 2. Check for "upgrade" keyword violation in mismatch hook
  // The mismatch hook shouldn't suggest "upgrading" via a command, but rather "improving"
  const lowercaseContent = content.toLowerCase();
  if (lowercaseContent.includes('mismatch') || lowercaseContent.includes('weekend vibe')) {
    // If the mismatch hook is present, check if it contains 'upgrade' or 'upgrade command'
    const hookIndex = lowercaseContent.indexOf('mismatch') !== -1 
      ? lowercaseContent.indexOf('mismatch') 
      : lowercaseContent.indexOf('weekend vibe');
    const hookContext = lowercaseContent.slice(hookIndex, hookIndex + 300);
    if (hookContext.includes('upgrade')) {
      errors.push(`Mismatch hook contains banned word 'upgrade'. Use 'improve' instead.`);
    }
  }

  // 3. Special checks for Executive Summary
  if (filename.includes('executive-summary')) {
    if (isHtml) {
      // Basic HTML structural validation for 3 sections and paragraph counts
      // In HTML, sections are typically separated by headings (<h2> or <h3>)
      const hRegex = /<(h[2-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
      const headings = [];
      let match;
      while ((match = hRegex.exec(content)) !== null) {
        headings.push({ tag: match[1], title: match[2].trim(), index: match.index });
      }

      if (headings.length !== 3) {
        errors.push(`Executive Summary HTML must have exactly 3 headings/sections, found ${headings.length}.`);
      } else {
        // Evaluate paragraphs and word counts within each section
        for (let i = 0; i < headings.length; i++) {
          const start = headings[i].index;
          const end = i < headings.length - 1 ? headings[i + 1].index : content.length;
          const sectionContent = content.slice(start, end);
          
          // Match paragraphs <p>...</p>
          const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
          const paragraphs = [];
          let pMatch;
          while ((pMatch = pRegex.exec(sectionContent)) !== null) {
            paragraphs.push(pMatch[1].trim());
          }

          if (paragraphs.length === 0) {
            errors.push(`HTML Section "${headings[i].title}" has no paragraphs.`);
          } else if (paragraphs.length > 3) {
            errors.push(`HTML Section "${headings[i].title}" has ${paragraphs.length} paragraphs (limit is 3).`);
          }

          // Total word count for section
          const textOnly = sectionContent.replace(/<[^>]*>/g, ' ');
          const words = countWords(textOnly);
          if (words > 450) {
            errors.push(`HTML Section "${headings[i].title}" word count is ${words} (limit is 450).`);
          }
        }
      }
    } else {
      // Markdown Validation
      const lines = content.split('\n');
      const sections = [];
      let currentSection = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('## ') || line.startsWith('### ')) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = { heading: line, paragraphs: [], text: '' };
        } else if (currentSection) {
          if (line === '') {
            // Empty line marks end of a paragraph if the next lines have content
            if (currentSection.text.trim() !== '') {
              currentSection.paragraphs.push(currentSection.text.trim());
              currentSection.text = '';
            }
          } else {
            currentSection.text += ' ' + line;
          }
        }
      }
      if (currentSection) {
        if (currentSection.text.trim() !== '') {
          currentSection.paragraphs.push(currentSection.text.trim());
        }
        sections.push(currentSection);
      }

      if (sections.length !== 3) {
        errors.push(`Executive Summary Markdown must have exactly 3 headings/sections, found ${sections.length}.`);
      } else {
        for (const sec of sections) {
          if (sec.paragraphs.length === 0) {
            errors.push(`Section "${sec.heading}" has no paragraphs.`);
          } else if (sec.paragraphs.length > 3) {
            errors.push(`Section "${sec.heading}" has ${sec.paragraphs.length} paragraphs (limit is 3).`);
          }

          // Enforce word limits
          const totalText = sec.paragraphs.join(' ');
          const words = countWords(totalText);
          if (words > 450) {
            errors.push(`Section "${sec.heading}" word count is ${words} (limit is 450).`);
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Validates a backlog CSV file
 */
function validateCSV(filePath) {
  const errors = [];
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return [`Failed to read CSV file: ${err.message}`];
  }

  const rows = parseCSV(content);
  if (rows.length === 0) {
    return ['CSV file is empty.'];
  }

  const headers = rows[0].map(h => h.trim());
  
  // Verify columns match exactly
  for (let i = 0; i < CSV_COLUMNS.length; i++) {
    if (headers[i] !== CSV_COLUMNS[i]) {
      errors.push(`CSV Header mismatch at index ${i}: expected "${CSV_COLUMNS[i]}", found "${headers[i] || 'missing'}"`);
    }
  }

  const descIdx = headers.indexOf('Description');
  if (descIdx === -1) {
    errors.push('CSV is missing the "Description" column.');
    return errors;
  }

  // Check data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < CSV_COLUMNS.length) {
      errors.push(`Row ${i} has insufficient columns (${row.length} found, expected ${CSV_COLUMNS.length})`);
      continue;
    }
    const description = row[descIdx];
    if (!description.includes(DISCLAIMER_TEXT)) {
      errors.push(`Row ${i} description is missing the Developer Empowerment Disclaimer.`);
    }
  }

  return errors;
}

/**
 * Runs validation on all deliverables in a directory
 */
function runValidation(targetDir) {
  if (!fs.existsSync(targetDir)) {
    console.log(`Directory does not exist: ${targetDir}`);
    return 0;
  }

  const files = fs.readdirSync(targetDir);
  let totalErrors = 0;

  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Auditing deliverables in directory: ${targetDir}${RESET}`);

  for (const file of files) {
    const fullPath = path.join(targetDir, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) continue;

    if (file === 'backlog.csv') {
      console.log(`  Auditing CSV: ${file}`);
      const csvErrors = validateCSV(fullPath);
      if (csvErrors.length === 0) {
        console.log(`    ${GREEN}✓ Passed${RESET}`);
      } else {
        csvErrors.forEach(err => console.log(`    ${RED}✗ Error:${RESET} ${err}`));
        totalErrors += csvErrors.length;
      }
    } else if (file.endsWith('.md') || file.endsWith('.html')) {
      // Check if it's a report file
      if (file.includes('report') || file.includes('executive-summary') || file.includes('observations')) {
        console.log(`  Auditing report: ${file}`);
        const reportErrors = validateFile(fullPath);
        if (reportErrors.length === 0) {
          console.log(`    ${GREEN}✓ Passed${RESET}`);
        } else {
          reportErrors.forEach(err => console.log(`    ${RED}✗ Error:${RESET} ${err}`));
          totalErrors += reportErrors.length;
        }
      }
    }
  }

  return totalErrors;
}

/**
 * Runs a self-test of the validator using temporary mock files
 */
function runSelfTest() {
  console.log('Running validate-deliverables self-test...');
  const tempDir = path.join(__dirname, 'temp_test_deliverables');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let testFailures = 0;

  // 1. Valid Executive Summary (Markdown)
  const validExecMd = `
# Executive Summary

## Section 1: Codebase Health & Strengths
Paragraph 1 of strengths. It is very healthy.
Paragraph 2 of strengths. Yes indeed.
Paragraph 3 of strengths. Outstanding code quality.

## Section 2: Tooling & Compliance Opportunities
Opportunity paragraph 1.
Opportunity paragraph 2.

## Section 3: Rollout Roadmap
Roadmap paragraph 1.
Roadmap paragraph 2.

${DISCLAIMER_TEXT}
`;
  fs.writeFileSync(path.join(tempDir, 'repo-wizard-executive-summary-myrepo.md'), validExecMd);

  // 2. Invalid Executive Summary (too many paragraphs, missing disclaimer)
  const invalidExecMd = `
# Executive Summary

## Section 1: Strengths
Para 1.
Para 2.
Para 3.
Para 4. (Violates limit of 3)

## Section 2: Opportunities
Para 1.

## Section 3: Roadmap
Para 1.
`;
  fs.writeFileSync(path.join(tempDir, 'repo-wizard-executive-summary-bad.md'), invalidExecMd);

  // 3. Valid Backlog CSV
  const validCsv = `Summary,Description,Issue Type,Epic Name / Parent,Labels,Recommended By (Sub-Agent),Frameworks/Goals
"Task 1","This is the issue description. ${DISCLAIMER_TEXT}","Story","Epic1","label1","test-agent","GDPR"
`;
  fs.writeFileSync(path.join(tempDir, 'backlog.csv'), validCsv);

  // 4. Invalid Backlog CSV (missing disclaimer in row)
  const invalidCsv = `Summary,Description,Issue Type,Epic Name / Parent,Labels,Recommended By (Sub-Agent),Frameworks/Goals
"Task 1","This is a bad description.","Story","Epic1","label1","test-agent","GDPR"
`;
  // Temporarily swap files to test
  fs.writeFileSync(path.join(tempDir, 'backlog.csv'), validCsv);
  let errors = validateCSV(path.join(tempDir, 'backlog.csv'));
  if (errors.length > 0) {
    console.error('Self-test failed: Valid CSV was rejected.');
    testFailures++;
  }

  fs.writeFileSync(path.join(tempDir, 'backlog.csv'), invalidCsv);
  errors = validateCSV(path.join(tempDir, 'backlog.csv'));
  if (errors.length === 0) {
    console.error('Self-test failed: Invalid CSV (missing disclaimer) was accepted.');
    testFailures++;
  }

  // Run the full validation loop on temp files
  const errorsCount = runValidation(tempDir);
  console.log(`Self-test reports check: found ${errorsCount} expected errors in bad mock files.`);

  // Cleanup
  fs.readdirSync(tempDir).forEach(f => fs.unlinkSync(path.join(tempDir, f)));
  fs.rmdirSync(tempDir);

  if (testFailures > 0) {
    console.error(`\n${BOLD}${RED}Self-test completed with failures.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}Self-test PASSED.${RESET}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    runSelfTest();
    process.exit(0);
  }

  let targetDir = path.join(process.cwd(), '.repo-wizard');
  const dirIdx = args.indexOf('--dir');
  if (dirIdx !== -1 && args[dirIdx + 1]) {
    targetDir = path.resolve(args[dirIdx + 1]);
  }

  const errorsCount = runValidation(targetDir);
  
  if (errorsCount > 0) {
    console.log(`\n${BOLD}${RED}Deliverables check complete: ${errorsCount} error(s) found.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}Deliverables check complete: ${errorsCount} error(s) found.${RESET}`);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
