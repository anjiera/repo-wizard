#!/usr/bin/env node
/**
 * validate-commands.js
 *
 * Checks that slash command configurations are synchronized across directories:
 *   .claude/commands/  (.md — Claude Code)
 *   .gemini/commands/  (.toml — Gemini CLI)
 *   commands/          (.toml — Antigravity CLI)
 *
 * Checks:
 *   - Every command present in one directory exists in all three
 *   - The 'description' field is identical across all three equivalents
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DIRS = {
  claude:      { dir: path.join(ROOT, '.claude', 'commands'), ext: '.md'   },
  gemini:      { dir: path.join(ROOT, '.gemini', 'commands'), ext: '.toml' },
  antigravity: { dir: path.join(ROOT, 'commands'),            ext: '.toml' },
};

function descriptionFromMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match   = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    if (line.slice(0, colonIdx).trim() === 'description') {
      return line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return null;
}

function descriptionFromToml(filePath) {
  const content     = fs.readFileSync(filePath, 'utf8');
  const doubleMatch = content.match(/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m);
  if (doubleMatch) return doubleMatch[1].replace(/\\"/g, '"');
  const singleMatch = content.match(/^description\s*=\s*'([^']*)'/m);
  return singleMatch ? singleMatch[1] : null;
}

function loadCommands({ dir, ext }) {
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(
    fs.readdirSync(dir)
      .filter(f => f.endsWith(ext))
      .map(f => {
        const stem = path.basename(f, ext);
        const full = path.join(dir, f);
        try {
          const desc = ext === '.md' ? descriptionFromMd(full) : descriptionFromToml(full);
          return [stem, desc];
        } catch (e) {
          console.error(`  ✗  ${stem} — cannot read file: ${e.message}`);
          return [stem, null];
        }
      })
  );
}

function main() {
  const byTool = {
    claude:      loadCommands(DIRS.claude),
    gemini:      loadCommands(DIRS.gemini),
    antigravity: loadCommands(DIRS.antigravity),
  };

  const claudeStems = Object.keys(byTool.claude).sort();
  const allTomlStems = new Set([
    ...Object.keys(byTool.gemini),
    ...Object.keys(byTool.antigravity),
  ]);
  const allCanonicalStems = new Set([
    ...claudeStems,
    ...[...allTomlStems],
  ]);

  let errors = 0;

  console.log('Checking command parity...');

  for (const stem of allCanonicalStems) {
    const missing = [];
    if (!(stem in byTool.claude))      missing.push('.claude/commands');
    if (!(stem in byTool.gemini))      missing.push('.gemini/commands');
    if (!(stem in byTool.antigravity)) missing.push('commands');

    if (missing.length) {
      console.log(`  ✗  ${stem} — missing in: ${missing.join(', ')}`);
      errors++;
    } else {
      // Check descriptions match
      const descClaude = byTool.claude[stem];
      const descGemini = byTool.gemini[stem];
      const descAgy    = byTool.antigravity[stem];

      const allMatch = descClaude === descGemini && descGemini === descAgy;
      if (allMatch) {
        console.log(`  ✓  ${stem}`);
      } else {
        console.log(`  ✗  ${stem} — descriptions do not match`);
        console.log(`       .claude:      ${descClaude}`);
        console.log(`       .gemini:      ${descGemini}`);
        console.log(`       commands/:    ${descAgy}`);
        errors++;
      }
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${allCanonicalStems.size} commands checked — ${errors} error(s) — ${status}`);

  if (errors > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (err) {
  console.error(`\nERROR: validate-commands failed unexpectedly: ${err.message}`);
  process.exit(1);
}
