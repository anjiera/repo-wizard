#!/usr/bin/env node
/**
 * md-to-html.js
 *
 * A zero-dependency Markdown-to-HTML converter. Injects modern, premium
 * typography, responsive structures, and dark-mode CSS styles.
 *
 * Usage:
 *   node scripts/md-to-html.js <input.md> <output.html>
 *
 * Or import as a module:
 *   const { convertMdToHtml } = require('./md-to-html');
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Escapes HTML characters to prevent rendering bugs
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Basic regex-based Markdown parser
 */
function parseMarkdown(md) {
  let html = '';
  const lines = md.split(/\r?\n/);
  
  let inList = false;
  let inCodeBlock = false;
  let inTable = false;
  let tableHeaderParsed = false;
  let codeBlockLang = '';
  let codeLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 1. Code Block Handler
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        html += `<pre><code class="language-${escapeHtml(codeBlockLang)}">${escapeHtml(codeLines.join('\n'))}</code></pre>\n`;
        codeLines = [];
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // 1b. Table Handler
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    if (isTableRow) {
      const rawCells = line.split(/(?<!\\)\|/);
      const cells = rawCells
        .map(c => c.trim().replace(/\\\|/g, '|'))
        .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isSeparator = cells.every(c => /^[:\-\s]+$/.test(c) && c.includes('-'));
      
      if (isSeparator) {
        tableHeaderParsed = true;
        continue;
      }
      
      if (!inTable) {
        html += '<table>\n';
        inTable = true;
        tableHeaderParsed = false;
      }
      
      if (!tableHeaderParsed) {
        html += '  <thead>\n    <tr>\n';
        cells.forEach(cell => {
          html += `      <th>${inlineParse(cell)}</th>\n`;
        });
        html += '    </tr>\n  </thead>\n  <tbody>\n';
        tableHeaderParsed = true;
      } else {
        html += '    <tr>\n';
        cells.forEach(cell => {
          html += `      <td>${inlineParse(cell)}</td>\n`;
        });
        html += '    </tr>\n';
      }
      continue;
    } else if (inTable) {
      html += '  </tbody>\n</table>\n';
      inTable = false;
    }

    // 2. Unordered List Handler
    const listMatch = line.match(/^([ \t]*)[-\*\+]\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      let content = inlineParse(listMatch[2]);
      html += `  <li>${content}</li>\n`;
      continue;
    } else if (inList && line.trim() === '') {
      // Empty line within list is ignored or marks the end if followed by non-list
      const nextLine = lines[i + 1];
      if (!nextLine || !nextLine.match(/^[ \t]*[-\*\+]\s+/)) {
        html += '</ul>\n';
        inList = false;
      }
      continue;
    } else if (inList) {
      html += '</ul>\n';
      inList = false;
    }

    // 3. Empty lines
    if (line.trim() === '') {
      continue;
    }

    // 4. Headers
    const h6 = line.match(/^######\s+(.*)$/);
    const h5 = line.match(/^#####\s+(.*)$/);
    const h4 = line.match(/^####\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h1 = line.match(/^#\s+(.*)$/);

    if (h1) { html += `<h1>${inlineParse(h1[1])}</h1>\n`; continue; }
    if (h2) { html += `<h2>${inlineParse(h2[1])}</h2>\n`; continue; }
    if (h3) { html += `<h3>${inlineParse(h3[1])}</h3>\n`; continue; }
    if (h4) { html += `<h4>${inlineParse(h4[1])}</h4>\n`; continue; }
    if (h5) { html += `<h5>${inlineParse(h5[1])}</h5>\n`; continue; }
    if (h6) { html += `<h6>${inlineParse(h6[1])}</h6>\n`; continue; }

    // 5. Blockquote
    const bq = line.match(/^>\s*(.*)$/);
    if (bq) {
      let bqContent = inlineParse(bq[1]);
      // Support alert boxes
      if (bqContent.startsWith('[!NOTE]')) bqContent = '<strong>Note:</strong>' + bqContent.slice(7);
      if (bqContent.startsWith('[!TIP]')) bqContent = '<strong>Tip:</strong>' + bqContent.slice(5);
      if (bqContent.startsWith('[!IMPORTANT]')) bqContent = '<strong>Important:</strong>' + bqContent.slice(12);
      if (bqContent.startsWith('[!WARNING]')) bqContent = '<strong>Warning:</strong>' + bqContent.slice(10);
      
      html += `<blockquote>${bqContent}</blockquote>\n`;
      continue;
    }

    // 6. Standard Paragraph
    html += `<p>${inlineParse(line)}</p>\n`;
  }

  if (inList) html += '</ul>\n';
  if (inTable) html += '  </tbody>\n</table>\n';
  if (inCodeBlock) {
    html += `<pre><code class="language-${escapeHtml(codeBlockLang)}">${escapeHtml(codeLines.join('\n'))}</code></pre>\n`;
  }

  return html;
}

function sanitizeUrl(url) {
  if (!url) return '#';
  
  // Decode HTML entities recursively to prevent nested bypasses
  let decoded = url;
  let prev;
  let limit = 0;
  do {
    prev = decoded;
    decoded = decoded
      .replace(/&colon;/ig, ':')
      .replace(/&#x3a;/ig, ':')
      .replace(/&#58;/ig, ':')
      .replace(/&amp;/ig, '&')
      .replace(/&#([0-9]+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
      
    // Strip control characters and whitespace on every iteration, especially after decoding entities
    decoded = decoded.replace(/[\s\x00-\x1f\x7f]/g, '');
    
    // Check intermediate decoded state to block deep or nested obfuscation early
    const lowerState = decoded.toLowerCase();
    if (/^(javascript|data|vbscript|file):/i.test(lowerState)) {
      return '#';
    }
    const protocolMatch = lowerState.match(/^([a-z0-9\-\.\+]+):/);
    if (protocolMatch) {
      const proto = protocolMatch[1];
      if (proto !== 'http' && proto !== 'https' && proto !== 'mailto' && proto !== 'tel') {
        return '#';
      }
    }
    limit++;
  } while (decoded !== prev && limit < 10);
  
  if (limit >= 10 && decoded !== prev) {
    return '#'; // Block excessively nested entities
  }
  
  return decoded;
}


/**
 * Parses inline formatting like bold, code, links
 */
function inlineParse(text) {
  const links = [];
  // Extract links from raw text first to prevent double HTML escaping of URL parameters
  let parsed = (text || '').replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
    const id = links.length;
    links.push({ linkText, url });
    return `__LINK_PLACEHOLDER_${id}__`;
  });

  // Escape HTML on the rest of the text content
  parsed = escapeHtml(parsed);

  // Parse bold and inline code on the escaped text
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  parsed = parsed.replace(/`(.*?)`/g, '<code>$1</code>');

  // Restore and safely format URLs and link text
  parsed = parsed.replace(/__LINK_PLACEHOLDER_(\d+)__/g, (match, id) => {
    const link = links[parseInt(id, 10)];
    let safeText = escapeHtml(link.linkText);
    // Allow bold and code formatting inside link text
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return `<a href="${escapeHtml(sanitizeUrl(link.url))}">${safeText}</a>`;
  });

  return parsed;
}

/**
 * Injects markdown HTML body into the premium template
 */
function convertMdToHtml(mdContent, title = 'Documentation') {
  const htmlBody = parseMarkdown(mdContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(String(title))}</title>
  <style>
    :root {
      --bg-primary: #fafafa;
      --text-primary: #334155;
      --text-heading: #0f172a;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --border-color: #e2e8f0;
      --code-bg: #f1f5f9;
      --quote-bg: #eff6ff;
      --quote-text: #1e3a8a;
      --quote-border: #3b82f6;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #0f172a;
        --text-primary: #cbd5e1;
        --text-heading: #f8fafc;
        --accent: #3b82f6;
        --accent-hover: #60a5fa;
        --border-color: #334155;
        --code-bg: #1e293b;
        --quote-bg: #1e293b;
        --quote-text: #93c5fd;
        --quote-border: #3b82f6;
      }
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.65;
      color: var(--text-primary);
      background-color: var(--bg-primary);
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
    }

    h1, h2, h3, h4, h5, h6 {
      color: var(--text-heading);
      margin-top: 1.6em;
      margin-bottom: 0.6em;
      font-weight: 700;
    }

    h1 {
      font-size: 2.2em;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 0.3em;
      color: var(--accent);
    }

    h2 {
      font-size: 1.6em;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.3em;
    }

    h3 {
      font-size: 1.3em;
    }

    a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    a:hover {
      color: var(--accent-hover);
      text-decoration: underline;
    }

    pre {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.9em;
      border: 1px solid var(--border-color);
      margin: 20px 0;
    }

    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      background: var(--code-bg);
      color: var(--text-heading);
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }

    pre code {
      background: none;
      padding: 0;
      color: inherit;
      border-radius: 0;
      font-size: inherit;
    }

    ul, ol {
      padding-left: 24px;
      margin: 16px 0;
    }

    li {
      margin-bottom: 0.5em;
    }

    blockquote {
      border-left: 4px solid var(--quote-border);
      padding: 12px 20px;
      margin: 24px 0;
      background: var(--quote-bg);
      color: var(--quote-text);
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }

    blockquote strong {
      font-style: normal;
      font-weight: 600;
      display: block;
      margin-bottom: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 0.9em;
      border: 1px solid var(--border-color);
    }
    th, td {
      border: 1px solid var(--border-color);
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background-color: var(--code-bg);
      font-weight: 600;
      color: var(--text-heading);
    }
    tr:nth-child(even) {
      background-color: rgba(0, 0, 0, 0.02);
    }
    @media (prefers-color-scheme: dark) {
      tr:nth-child(even) {
        background-color: rgba(255, 255, 255, 0.02);
      }
    }

    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 32px 0;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>
`;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/md-to-html.js <input.md> <output.html>');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1]);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const mdContent = fs.readFileSync(inputPath, 'utf8');
    const title = path.basename(inputPath, '.md');
    const htmlContent = convertMdToHtml(mdContent, title);
    
    // Ensure parent dir exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, htmlContent, 'utf8');
    console.log(`Successfully compiled: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
  } catch (err) {
    console.error(`Failed to compile: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = { convertMdToHtml };
}
