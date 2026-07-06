#!/usr/bin/env node
/**
 * scan-maintainability.js
 *
 * Scans JavaScript/Node.js files in the active workspace directory (process.cwd())
 * for maintainability metrics (Nesting Depth, Line Count, and Function Parameters count).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const targetDir = process.cwd();
const excludeDirs = ['.git', 'node_modules', '.gemini', '.repo-wizard'];

function walk(dir) {
  let results = [];
  let list;
  try {
    list = fs.readdirSync(dir);
  } catch (err) {
    return results;
  }
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (err) {
      return;
    }
    
    if (stat && stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (file.endsWith('.js')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(targetDir);
console.log(`Found ${files.length} JavaScript files to scan.\n`);

files.forEach(file => {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return;
  }
  
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Simple heuristic for nesting: check consecutive nesting of brackets
  let maxNesting = 0;
  let currentNesting = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      currentNesting++;
      if (currentNesting > maxNesting) maxNesting = currentNesting;
    } else if (content[i] === '}') {
      currentNesting--;
    }
  }

  // Find long parameters
  const complexFuncRegex = /(?:function\s*\w*\s*\(([^)]*)\)|\(([^)]*)\)\s*=>)/g;
  let match;
  let longParamCount = 0;
  while ((match = complexFuncRegex.exec(content)) !== null) {
    const paramsStr = match[1] || match[2] || '';
    const params = paramsStr.split(',').map(p => p.trim()).filter(Boolean);
    if (params.length >= 5) {
      longParamCount++;
    }
  }

  if (lineCount > 150 || maxNesting > 4 || longParamCount > 0) {
    const relativePath = path.relative(targetDir, file);
    console.log(`File: ${relativePath}`);
    console.log(`  Lines: ${lineCount}`);
    console.log(`  Max Nesting: ${maxNesting}`);
    console.log(`  Functions with 5+ parameters: ${longParamCount}`);
    console.log(`-----------------------------------`);
  }
});
