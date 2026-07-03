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
const { RESET, BOLD, GREEN, RED, BLUE } = require('../solo-dev-toolkit/scripts/cli-helpers');
const { parseCSV } = require('../solo-dev-toolkit/scripts/csv-parser-helper');

const { DISCLAIMER_TEXT, SECTION_WORD_COUNT_MIN, SECTION_WORD_COUNT_MAX } = require('./report-constants');

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
 * Helper to get a list of clean sentences from a string
 */
function getSentencesList(str) {
  if (!str) return [];
  let clean = str;
  // Strip style blocks, scripts, comments, and tags
  clean = clean.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  clean = clean.replace(/<!--[\s\S]*?-->/g, ' ');
  clean = clean.replace(/<[^>]*>/g, ' ');

  // Replace common abbreviations to avoid false sentence splits
  clean = clean.replace(/e\.g\./gi, 'eg');
  clean = clean.replace(/i\.e\./gi, 'ie');
  clean = clean.replace(/vs\./gi, 'vs');
  clean = clean.replace(/approx\./gi, 'approx');
  clean = clean.replace(/etc\./gi, 'etc');

  // Split by sentence terminators: . ! ? followed by whitespace or string end
  return clean.split(/[.!?](?=\s|$)/).map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Helper to count sentences in a string, cleaning abbreviations
 */
function countSentences(str) {
  return getSentencesList(str).length;
}

/**
 * Helper to check for duplicate padded sentences in technical paragraphs
 */
function checkDuplicateSentences(paragraphs, errors, locationName, seenSentences) {
  for (let j = 2; j < paragraphs.length; j++) {
    const pText = paragraphs[j];
    if (cleanEndsWithColon(pText)) continue;
    
    const sentences = getSentencesList(pText);
    for (const s of sentences) {
      const cleanS = s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
      const words = cleanS.split(' ');
      if (words.length >= 6) { // check sentences with 6 or more words
        if (seenSentences.has(cleanS)) {
          errors.push(`[Critical] Honesty Violation: ${locationName} contains duplicate padded sentence: "${s}".`);
          return;
        }
        seenSentences.add(cleanS);
      }
    }
  }
}

/**
 * Helper to check if a paragraph ends with a colon, stripping trailing markdown or HTML tags
 */
function cleanEndsWithColon(text) {
  if (!text) return false;
  let clean = text.trim();
  // Strip trailing markdown bolding/italics/code block marks
  clean = clean.replace(/[\*_~`>]+$/, '').trim();
  // Strip trailing HTML tags
  clean = clean.replace(/<\/[^>]+>$/, '').trim();
  return clean.endsWith(':');
}

/**
 * Helper to count words in a string
 */
function countWords(str) {
  if (!str) return 0;
  let clean = str;
  // Strip style blocks
  clean = clean.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  // Strip script blocks
  clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  // Strip HTML comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, ' ');
  // Strip HTML tags
  clean = clean.replace(/<[^>]*>/g, ' ');
  // Replace markdown characters and punctuation with space
  clean = clean.replace(/[#\-\*\`\[\]\(\)\<\>\/]/g, ' ').trim();
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
  const seenSentences = new Set();

  // 1. Check Developer Empowerment Disclaimer
  if (!content.includes(DISCLAIMER_TEXT)) {
    errors.push(`Missing Developer Empowerment Disclaimer.`);
  }

  // 1b. Check for temporary tracking tags or bracketed placeholders (Proofreading Pass)
  const tempTagRegex = /\[(?:TODO|PLACEHOLDER|DRAFT|TEMP|MOCK|[^\]]*P\d+S\d+[^\]]*)\]/i;
  const tagMatch = content.match(tempTagRegex);
  if (tagMatch) {
    errors.push(`[Critical] Honesty Violation: File contains temporary tracking tag or bracketed placeholder "${tagMatch[0]}".`);
  }

  // 2. Check for "upgrade" keyword violation in mismatch hook
  // The mismatch hook shouldn't suggest "upgrading" via a command, but rather "improving"
  const lowercaseContent = content.toLowerCase();
  const hookIndices = [];
  let idx = lowercaseContent.indexOf('mismatch');
  while (idx !== -1) {
    hookIndices.push(idx);
    idx = lowercaseContent.indexOf('mismatch', idx + 1);
  }
  idx = lowercaseContent.indexOf('weekend vibe');
  while (idx !== -1) {
    hookIndices.push(idx);
    idx = lowercaseContent.indexOf('weekend vibe', idx + 1);
  }

  for (const startIdx of hookIndices) {
    const hookContext = lowercaseContent.slice(startIdx, startIdx + 300);
    if (hookContext.includes('upgrade')) {
      errors.push(`Mismatch hook contains banned word 'upgrade'. Use 'improve' instead.`);
      break;
    }
  }

  // 3. Special checks for Executive Summary
  if (filename.includes('executive-summary')) {
    if (isHtml) {
      // Basic HTML structural validation for 3 sections and paragraph counts
      // In HTML, sections are typically separated by headings (<h2> or <h3>)
      // Strip comments first to avoid matching headings in comments
      const cleanContent = content.replace(/<!--[\s\S]*?-->/g, ' ');
      const hRegex = /<(h2)\b[^>]*>([\s\S]*?)<\/h2>/gi;
      const headings = [];
      let match;
      while ((match = hRegex.exec(cleanContent)) !== null) {
        const title = match[2].trim();
        if (/^Section\b/i.test(title)) {
          headings.push({ tag: match[1], title, index: match.index });
        }
      }

      if (headings.length !== 4) {
        errors.push(`Executive Summary HTML must have exactly 4 headings/sections, found ${headings.length}.`);
      } else {
        // Evaluate paragraphs and word counts within each section
        for (let i = 0; i < headings.length; i++) {
          const start = headings[i].index;
          const end = i < headings.length - 1 ? headings[i + 1].index : cleanContent.length;
          const sectionContent = cleanContent.slice(start, end);
          
          // Match paragraphs <p>...</p>
          const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
          const paragraphs = [];
          let pMatch;
          while ((pMatch = pRegex.exec(sectionContent)) !== null) {
            paragraphs.push(pMatch[1].trim());
          }

          const isConclusions = headings[i].title.toLowerCase().includes('conclusions');

          if (isConclusions) {
            if (paragraphs.length === 0) {
              errors.push(`HTML Section "${headings[i].title}" must have at least 1 paragraph.`);
            }
          } else {
            if (paragraphs.length < 3) {
              errors.push(`HTML Section "${headings[i].title}" must have at least 3 paragraphs (found ${paragraphs.length}).`);
            } else {
              // Check BLUF
              const bluf = paragraphs[0];
              const isItalic = bluf.startsWith('<em>') && bluf.endsWith('</em>');
              if (!isItalic) {
                errors.push(`HTML Section "${headings[i].title}" first paragraph must be wrapped in italics (<em>...</em>).`);
              }
              if (bluf.includes('BLUF:')) {
                errors.push(`HTML Section "${headings[i].title}" first paragraph must not contain the literal prefix 'BLUF:'.`);
              }
              // Check Overview
              const overview = paragraphs[1];
              if (!overview.includes('Overview:')) {
                errors.push(`HTML Section "${headings[i].title}" second paragraph must contain 'Overview:'.`);
              }

              // Check Technical Overview paragraphs for 3-6 sentences count rule
              for (let j = 2; j < paragraphs.length; j++) {
                const pText = paragraphs[j];
                // Exempt list intros (paragraphs ending with a colon)
                if (cleanEndsWithColon(pText)) {
                  continue;
                }
                const sentences = countSentences(pText);
                if (sentences < 3 || sentences > 6) {
                  errors.push(`HTML Section "${headings[i].title}" Technical Overview paragraph ${j + 1} has ${sentences} sentences (must be between 3 and 6).`);
                }
              }
              checkDuplicateSentences(paragraphs, errors, `HTML Section "${headings[i].title}"`, seenSentences);

              // Word count of the remaining text (excluding the first two paragraphs)
              let technicalContent = sectionContent;
              let count = 0;
              let idx = 0;
              const pCloseRegex = /<\/p>/gi;
              let pCloseMatch;
              while ((pCloseMatch = pCloseRegex.exec(sectionContent)) !== null) {
                count++;
                if (count === 2) {
                  idx = pCloseMatch.index + 5; // length of </p>
                  break;
                }
              }
              if (idx > 0) {
                technicalContent = sectionContent.slice(idx);
              }
              const words = countWords(technicalContent);
              if (words < SECTION_WORD_COUNT_MIN || words > SECTION_WORD_COUNT_MAX) {
                errors.push(`HTML Section "${headings[i].title}" Technical Overview word count is ${words} (must be between ${SECTION_WORD_COUNT_MIN} and ${SECTION_WORD_COUNT_MAX}).`);
              }
            }
          }
        }
      }
    } else {
      // Markdown Validation
      // Strip comments first to avoid matching headings in comments
      const cleanContent = content.replace(/<!--[\s\S]*?-->/g, ' ');
      const lines = cleanContent.split('\n');
      const sections = [];
      let currentSection = null;

      const flushText = () => {
        if (currentSection && currentSection.activeText.trim() !== '') {
          const trimmed = currentSection.activeText.trim();
          currentSection.paragraphs.push(trimmed);
          currentSection.activeText = '';
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('## Section ')) {
          flushText();
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = { heading: line, paragraphs: [], activeText: '' };
        } else if (currentSection) {
          if (line.startsWith('#')) {
            // Heading ends the active paragraph, and is ignored
            flushText();
          } else if (line.startsWith('* ') || line.startsWith('- ') || /^\d+\.\s+/.test(line)) {
            // List item ends the active paragraph, and is stored as a list item paragraph
            flushText();
            currentSection.paragraphs.push(line);
          } else if (line === '') {
            flushText();
          } else {
            // Check if the last paragraph in the list is a list item, and there was no empty line
            const lastParaIdx = currentSection.paragraphs.length - 1;
            if (lastParaIdx >= 0 && (
              currentSection.paragraphs[lastParaIdx].startsWith('* ') ||
              currentSection.paragraphs[lastParaIdx].startsWith('- ') ||
              /^\d+\.\s+/.test(currentSection.paragraphs[lastParaIdx])
            ) && currentSection.activeText === '') {
              // Append to the list item!
              currentSection.paragraphs[lastParaIdx] += ' ' + line;
            } else {
              currentSection.activeText += ' ' + line;
            }
          }
        }
      }
      flushText();
      if (currentSection) {
        sections.push(currentSection);
      }

      if (sections.length !== 4) {
        errors.push(`Executive Summary Markdown must have exactly 4 headings/sections, found ${sections.length}.`);
      } else {
        for (const sec of sections) {
          const isConclusions = sec.heading.toLowerCase().includes('conclusions');
          if (isConclusions) {
            if (sec.paragraphs.length === 0) {
              errors.push(`Section "${sec.heading}" must have at least 1 paragraph.`);
            }
          } else {
            if (sec.paragraphs.length < 3) {
              errors.push(`Section "${sec.heading}" must have at least 3 paragraphs (found ${sec.paragraphs.length}).`);
            } else {
              // Check BLUF
              const bluf = sec.paragraphs[0];
              const isItalic = (bluf.startsWith('*') && bluf.endsWith('*')) || (bluf.startsWith('_') && bluf.endsWith('_'));
              if (!isItalic) {
                errors.push(`Section "${sec.heading}" first paragraph must be wrapped in italics (starting with '*' or '_' and ending with '*' or '_').`);
              }
              if (bluf.includes('BLUF:')) {
                errors.push(`Section "${sec.heading}" first paragraph must not contain the literal prefix 'BLUF:'.`);
              }
              // Check Overview
              const overview = sec.paragraphs[1];
              if (!overview.includes('Overview:')) {
                errors.push(`Section "${sec.heading}" second paragraph must contain 'Overview:'.`);
              }

              // Check Technical Overview paragraphs for 3-6 sentences count rule
              for (let j = 2; j < sec.paragraphs.length; j++) {
                const pText = sec.paragraphs[j];
                const trimmed = pText.trim();
                 // Exempt list items starting with standard list marks (*, -, or digits followed by a period with space)
                 if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s+/.test(trimmed)) {
                   continue;
                 }
                // Exempt list intros ending with a colon
                if (cleanEndsWithColon(pText)) {
                  continue;
                }
                const sentences = countSentences(pText);
                if (sentences < 3 || sentences > 6) {
                  errors.push(`Section "${sec.heading}" Technical Overview paragraph ${j + 1} has ${sentences} sentences (must be between 3 and 6).`);
                }
              }
              checkDuplicateSentences(sec.paragraphs, errors, `Section "${sec.heading}"`, seenSentences);

              // Word count of the remaining paragraphs
              const technicalParagraphs = sec.paragraphs.slice(2);
              const totalText = technicalParagraphs.join(' ');
              const words = countWords(totalText);
              if (words < SECTION_WORD_COUNT_MIN || words > SECTION_WORD_COUNT_MAX) {
                errors.push(`Section "${sec.heading}" Technical Overview word count is ${words} (must be between ${SECTION_WORD_COUNT_MIN} and ${SECTION_WORD_COUNT_MAX}).`);
              }
            }
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

  let totalErrors = 0;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        if (file !== 'agents' && file !== 'history' && file !== 'node_modules' && file !== '.git') {
          scanDir(fullPath);
        }
        continue;
      }

      if (file === 'backlog.csv') {
        console.log(`  Auditing CSV: ${fullPath}`);
        const csvErrors = validateCSV(fullPath);
        if (csvErrors.length === 0) {
          console.log(`    ${GREEN}✓ Passed${RESET}`);
        } else {
          csvErrors.forEach(err => console.log(`    ${RED}✗ Error:${RESET} ${err}`));
          totalErrors += csvErrors.length;
        }
      } else if (file.endsWith('.md') || file.endsWith('.html')) {
        if (file.includes('report') || file.includes('executive-summary') || file.includes('observations')) {
          console.log(`  Auditing report: ${fullPath}`);
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
  }

  console.log(`\n${BOLD}${BLUE}==>${RESET} ${BOLD}Auditing deliverables in directory: ${targetDir}${RESET}`);
  scanDir(targetDir);

  return totalErrors;
}

/**
 * Runs a self-test of the validator using temporary mock files
 */
// mock-start
function runSelfTest() {
  console.log('Running validate-deliverables self-test...');
  const tempDir = path.join(__dirname, 'temp_test_deliverables');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let testFailures = 0;

  // 1. Valid Executive Summary (Markdown)
  const makeDummyPara = (id, sec) => `This is sentence number one in paragraph ${id} section ${sec}. This is sentence number two in paragraph ${id} section ${sec}. This is sentence number three in paragraph ${id} section ${sec}. This is sentence number four in paragraph ${id} section ${sec}. ${`Word${id}${sec} `.repeat(400)}`;
  const p1 = makeDummyPara(1, 1);
  const p2 = makeDummyPara(2, 1);
  const p3 = makeDummyPara(3, 1);

  const p4 = makeDummyPara(1, 2);
  const p5 = makeDummyPara(2, 2);
  const p6 = makeDummyPara(3, 2);

  const p7 = makeDummyPara(1, 3);
  const p8 = makeDummyPara(2, 3);
  const p9 = makeDummyPara(3, 3);

  const validExecMd = `
# Executive Summary

## Section 1: Codebase Health & Strengths
*A single sentence summary here.*

**Overview:** A CEO-level overview in three sentences or less.

### Technical Overview

${p1}

${p2}

${p3}

## Section 2: Tooling & Compliance Opportunities
*A single sentence summary here.*

**Overview:** A CEO-level overview in three sentences or less.

### Technical Overview

${p4}

${p5}

${p6}

## Section 3: Rollout Roadmap
*A single sentence summary here.*

**Overview:** A CEO-level overview in three sentences or less.

### Technical Overview

${p7}

${p8}

${p9}

## Section 4: Conclusions
Some final conclusion paragraphs go here.

${DISCLAIMER_TEXT}
`;
  fs.writeFileSync(path.join(tempDir, 'myrepo-executive-summary.md'), validExecMd);

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
  fs.writeFileSync(path.join(tempDir, 'bad-executive-summary.md'), invalidExecMd);

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
// mock-end

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
