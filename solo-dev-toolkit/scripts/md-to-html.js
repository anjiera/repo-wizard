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
 * Slugifies heading text for HTML id attributes to support anchor links
 */
function slugify(text) {
  if (!text) return '';
  let clean = text.replace(/<[^>]*>/g, '');
  let slug = clean.toLowerCase();
  slug = slug.replace(/[.,:;'"?!()\[\]`{}&]/g, '');
  slug = slug.replace(/[\s_]/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  return slug;
}

/**
 * Basic regex-based Markdown parser
 */
function parseMarkdown(md, expanded = false) {
  let html = '';
  const lines = md.split(/\r?\n/);
  
  let listStack = [];
  let openDetails = {
    h2: false,
    h3: false,
    h4: false
  };
  let inCodeBlock = false;
  let inTable = false;
  let tableHeaderParsed = false;
  let codeBlockLang = '';
  let codeLines = [];
  let paragraphLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      html += `<p>${inlineParse(paragraphLines.join(' '))}</p>\n`;
      paragraphLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 1. Code Block Handler
    if (line.trim().startsWith('```')) {
      flushParagraph();
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
      flushParagraph();
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

    // 2. List Handler
    const listMatch = line.match(/^([ \t]*)([-\*\+]|\d+\.)\s+(.*)$/);
    const isListContinuation = listStack.length > 0 && line.trim() !== '' &&
      (line.startsWith(' ') || line.startsWith('\t') || (!line.match(/^[#<|>]/) && line.trim() !== '---'));

    if (listStack.length > 0 && !listMatch && !isListContinuation) {
      if (line.trim() === '') {
        const nextLine = lines[i + 1];
        if (!nextLine || !nextLine.match(/^[ \t]*(?:[-\*\+]|\d+\.)\s+/)) {
          while (listStack.length > 0) {
            const popped = listStack.pop();
            html += `</${popped.type}>\n`;
            if (popped.parentOpen) {
              html += '</li>\n';
            }
          }
        }
        continue;
      } else {
        while (listStack.length > 0) {
          const popped = listStack.pop();
          html += `</${popped.type}>\n`;
          if (popped.parentOpen) {
            html += '</li>\n';
          }
        }
      }
    }

    if (listMatch) {
      flushParagraph();
      const indent = listMatch[1].replace(/\t/g, '    ').length;
      const listType = listMatch[2].match(/^\d+\./) ? 'ol' : 'ul';
      const content = inlineParse(listMatch[3]);

      if (listStack.length === 0) {
        html += `<${listType}>\n`;
        listStack.push({ indent, type: listType });
      } else {
        let top = listStack[listStack.length - 1];
        if (indent > top.indent) {
          if (html.endsWith('</li>\n')) {
            html = html.slice(0, -6);
          }
          html += `<${listType}>\n`;
          listStack.push({ indent, type: listType, parentOpen: true });
        } else if (indent < top.indent) {
          while (listStack.length > 1 && listStack[listStack.length - 1].indent > indent) {
            const popped = listStack.pop();
            html += `</${popped.type}>\n`;
            if (popped.parentOpen) {
              html += '</li>\n';
            }
          }
        }
      }
      html += `  <li>${content}</li>\n`;
      continue;
    } else if (isListContinuation) {
      let content = inlineParse(line.trim());
      if (html.endsWith('</li>\n')) {
        html = html.slice(0, -6) + ' ' + content + '</li>\n';
      } else {
        html += `  <li>${content}</li>\n`;
      }
      continue;
    }

    // Horizontal Rule Handler
    if (line.trim() === '---') {
      flushParagraph();
      html += '<hr />\n';
      continue;
    }

    // 3. Empty lines
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // 4. Headers
    const h6 = line.match(/^######\s+(.*)$/);
    const h5 = line.match(/^#####\s+(.*)$/);
    const h4 = line.match(/^####\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h1 = line.match(/^#\s+(.*)$/);

    if (h1 || h2 || h3 || h4 || h5 || h6) {
      flushParagraph();
      const match = h1 || h2 || h3 || h4 || h5 || h6;
      const headingText = match[1];
      const id = slugify(headingText);
      
      let extraAnchor = '';
      const matchSpecialist = headingText.match(/Specialist Agent:\s*(.*)/i);
      if (matchSpecialist) {
        const secondaryId = 'specialist-agent-' + slugify(matchSpecialist[1]);
        extraAnchor = `<a id="${secondaryId}"></a>`;
      }
      
      const contentText = `${extraAnchor}${inlineParse(headingText)}`;
      
      if (h1 || h2) {
        if (openDetails.h4) { html += `    </div>\n  </details>\n`; openDetails.h4 = false; }
        if (openDetails.h3) { html += `  </div>\n</details>\n`; openDetails.h3 = false; }
        if (openDetails.h2) { html += `</div>\n</details>\n`; openDetails.h2 = false; }
      } else if (h3) {
        if (openDetails.h4) { html += `    </div>\n  </details>\n`; openDetails.h4 = false; }
        if (openDetails.h3) { html += `  </div>\n</details>\n`; openDetails.h3 = false; }
      } else if (h4) {
        if (openDetails.h4) { html += `    </div>\n  </details>\n`; openDetails.h4 = false; }
      }
      
      const openAttr = expanded ? ' open' : '';
      if (h1) { html += `<h1 id="${id}">${contentText}</h1>\n`; continue; }
      if (h2) {
        html += `<details class="section-details" id="details-${id}"${openAttr}>\n`;
        html += `  <summary class="section-summary"><h2 id="${id}" style="display: inline-block; margin: 0;">${contentText}</h2></summary>\n`;
        html += `  <div class="section-content">\n`;
        openDetails.h2 = true;
        continue;
      }
      if (h3) {
        html += `<details class="subsection-details h3-details" id="details-${id}"${openAttr}>\n`;
        html += `  <summary class="subsection-summary"><h3 id="${id}" style="display: inline-block; margin: 0;">${contentText}</h3></summary>\n`;
        html += `  <div class="subsection-content">\n`;
        openDetails.h3 = true;
        continue;
      }
      if (h4) {
        html += `<details class="subsection-details h4-details" id="details-${id}"${openAttr}>\n`;
        html += `  <summary class="subsection-summary"><h4 id="${id}" style="display: inline-block; margin: 0;">${contentText}</h4></summary>\n`;
        html += `  <div class="subsection-content">\n`;
        openDetails.h4 = true;
        continue;
      }
      if (h5) { html += `<h5 id="${id}">${contentText}</h5>\n`; continue; }
      if (h6) { html += `<h6 id="${id}">${contentText}</h6>\n`; continue; }
    }

    // 5. Blockquote
    const bq = line.match(/^>\s*(.*)$/);
    if (bq) {
      flushParagraph();
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
    paragraphLines.push(line.trim());
  }

  flushParagraph();
  if (listStack.length > 0) {
    while (listStack.length > 0) {
      const popped = listStack.pop();
      html += `</${popped.type}>\n`;
      if (popped.parentOpen) {
        html += '</li>\n';
      }
    }
  }
  if (openDetails.h4) {
    html += `    </div>\n  </details>\n`;
    openDetails.h4 = false;
  }
  if (openDetails.h3) {
    html += `  </div>\n</details>\n`;
    openDetails.h3 = false;
  }
  if (openDetails.h2) {
    html += `</div>\n</details>\n`;
    openDetails.h2 = false;
  }
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
      .replace(/&NewLine;/ig, '\n')
      .replace(/&Tab;/ig, '\t')
      .replace(/&colon;/ig, ':')
      .replace(/&#x3a;/ig, ':')
      .replace(/&#58;/ig, ':')
      .replace(/&amp;/ig, '&')
      .replace(/&#([0-9]+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
      
    // Strip control characters, ASCII whitespace, and Unicode zero-width/bidirectional/formatting characters
    decoded = decoded.replace(/[\s\x00-\x1f\x7f\u200b-\u200d\ufeff\u200e\u200f\u202a-\u202e]/gi, '');
    
    // Check intermediate decoded state to block deep or nested obfuscation early
    const lowerState = decoded.toLowerCase();
    if (/^(javascript|data|vbscript):/i.test(lowerState)) {
      return '#';
    }
    const protocolMatch = lowerState.match(/^([a-z][a-z0-9\-\.\+]*):(.*)$/);
    if (protocolMatch) {
      const proto = protocolMatch[1];
      const rest = protocolMatch[2];
      // If it looks like a port number (digits followed by slash or end of string), it's a port, not a scheme
      if (!/^\d+(?:\/|$)/.test(rest)) {
        if (proto !== 'http' && proto !== 'https' && proto !== 'mailto' && proto !== 'tel' && proto !== 'file' && proto.length !== 1) {
          return '#';
        }
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
  const salt = Math.random().toString(36).substring(2, 10);
  const codePlaceholderPrefix = `@@CODEPLACEHOLDER${salt}X`;
  const linkPlaceholderPrefix = `@@LINKPLACEHOLDER${salt}X`;
  const anchorPlaceholderPrefix = `@@ANCHORPLACEHOLDER${salt}X`;
  const imagePlaceholderPrefix = `@@IMAGEPLACEHOLDER${salt}X`;

  const anchors = [];
  // Extract anchors first to shield them from formatting and HTML escaping
  let parsed = (text || '').replace(/<a\s+id="([^"]+)">\s*<\/a>/gi, (match, anchorId) => {
    const id = anchors.length;
    anchors.push(anchorId);
    return `${anchorPlaceholderPrefix}${id}@@`;
  });

  const images = [];
  // Extract images from raw text first to avoid conflict with links
  parsed = parsed.replace(/!\[([^\]]*?)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g, (match, altText, url) => {
    const id = images.length;
    images.push({ altText, url });
    return `${imagePlaceholderPrefix}${id}@@`;
  });

  const links = [];
  // Extract links from raw text next to prevent double HTML escaping of URL parameters
  parsed = parsed.replace(/\[([^\]]*?)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g, (match, linkText, url) => {
    const id = links.length;
    links.push({ linkText, url });
    return `${linkPlaceholderPrefix}${id}@@`;
  });

  const codes = [];
  // Extract code blocks next from the remaining text to shield their contents from formatting and HTML escaping
  parsed = parsed.replace(/`(.*?)`/g, (match, codeText) => {
    const id = codes.length;
    codes.push(codeText);
    return `${codePlaceholderPrefix}${id}@@`;
  });

  // Escape HTML on the rest of the text content
  parsed = escapeHtml(parsed);

  // Parse bold and italics on the escaped text
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  parsed = parsed.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Restore code blocks (escaping their contents first)
  parsed = parsed.replace(new RegExp(`${codePlaceholderPrefix}(\\d+)@@`, 'g'), (match, id) => {
    const codeIndex = parseInt(id, 10);
    if (codeIndex < 0 || codeIndex >= codes.length) {
      return match;
    }
    return `<code>${escapeHtml(codes[codeIndex])}</code>`;
  });

  // Restore and safely format URLs and link text
  parsed = parsed.replace(new RegExp(`${linkPlaceholderPrefix}(\\d+)@@`, 'g'), (match, id) => {
    const linkIndex = parseInt(id, 10);
    if (linkIndex < 0 || linkIndex >= links.length) {
      return match;
    }
    const link = links[linkIndex];
    let safeText = escapeHtml(link.linkText);
    // Allow bold and code formatting inside link text (Note: safeText is already escaped, so do not double escape)
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/`(.*?)`/g, (m, codeText) => `<code>${codeText}</code>`);
    
    return `<a href="${escapeHtml(sanitizeUrl(link.url))}">${safeText}</a>`;
  });

  // Restore images
  parsed = parsed.replace(new RegExp(`${imagePlaceholderPrefix}(\\d+)@@`, 'g'), (match, id) => {
    const imgIndex = parseInt(id, 10);
    if (imgIndex < 0 || imgIndex >= images.length) {
      return match;
    }
    const img = images[imgIndex];
    return `<img src="${escapeHtml(sanitizeUrl(img.url))}" alt="${escapeHtml(img.altText)}" />`;
  });

  // Restore anchors
  parsed = parsed.replace(new RegExp(`${anchorPlaceholderPrefix}(\\d+)@@`, 'g'), (match, id) => {
    const anchorIndex = parseInt(id, 10);
    if (anchorIndex < 0 || anchorIndex >= anchors.length) {
      return match;
    }
    return `<a id="${escapeHtml(anchors[anchorIndex])}"></a>`;
  });

  // Final validation check to ensure no placeholder patterns remain in the returned text
  if (parsed.includes(codePlaceholderPrefix) || parsed.includes(linkPlaceholderPrefix) || parsed.includes(anchorPlaceholderPrefix) || parsed.includes(imagePlaceholderPrefix)) {
    parsed = parsed
      .replace(new RegExp(`${codePlaceholderPrefix}\\d+@@`, 'g'), '')
      .replace(new RegExp(`${linkPlaceholderPrefix}\\d+@@`, 'g'), '')
      .replace(new RegExp(`${anchorPlaceholderPrefix}\\d+@@`, 'g'), '')
      .replace(new RegExp(`${imagePlaceholderPrefix}\\d+@@`, 'g'), '');
  }

  return parsed;
}

/**
 * Strict, zero-dependency HTML sanitizer to mitigate XSS
 */
function sanitizeHtml(html) {
  if (!html) return '';
  let clean = html;
  // Remove script tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove iframe, object, embed, frame, frameset tags
  clean = clean.replace(/<(iframe|object|embed|frame|frameset)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  // Remove inline on* event handlers safely only inside HTML tags
  clean = clean.replace(/<[^>]+>/g, (tag) => {
    return tag.replace(/[\s/]+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  });
  // Remove inline on* event handlers safely only inside escaped HTML tags (&lt;...&gt;)
  clean = clean.replace(/&lt;(?:(?!&gt;).)*&gt;/g, (tag) => {
    return tag.replace(/(?:[\s/]|&quot;)+on[a-z]+\s*=\s*(?:&quot;[^&]*&quot;|'[^']*'|[^\s&>]*)/gi, '');
  });
  // Remove javascript: links
  clean = clean.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
  return clean;
}

/**
 * Loads style config from report-styles.json or falls back to built-in styles.
 * Logs a warning if the requested style is not found or is malformed.
 */
function loadStyleConfig(styleName) {
  const defaultStyles = {
    "whitepaper": {
      "light": {
        "bg-primary": "#ffffff",
        "text-primary": "#1f2937",
        "text-heading": "#111827",
        "accent": "#1e3a8a",
        "accent-hover": "#2563eb",
        "border-color": "#e5e7eb",
        "code-bg": "#f3f4f6",
        "quote-bg": "#f9fafb",
        "quote-text": "#374151",
        "quote-border": "#9ca3af"
      },
      "dark": {
        "bg-primary": "#ffffff",
        "text-primary": "#1f2937",
        "text-heading": "#111827",
        "accent": "#1e3a8a",
        "accent-hover": "#2563eb",
        "border-color": "#e5e7eb",
        "code-bg": "#f3f4f6",
        "quote-bg": "#f9fafb",
        "quote-text": "#374151",
        "quote-border": "#9ca3af"
      }
    },
    "dark-blue": {
      "light": {
        "bg-primary": "#fafafa",
        "text-primary": "#334155",
        "text-heading": "#0f172a",
        "accent": "#2563eb",
        "accent-hover": "#1d4ed8",
        "border-color": "#e2e8f0",
        "code-bg": "#f1f5f9",
        "quote-bg": "#eff6ff",
        "quote-text": "#1e3a8a",
        "quote-border": "#3b82f6"
      },
      "dark": {
        "bg-primary": "#0f172a",
        "text-primary": "#cbd5e1",
        "text-heading": "#f8fafc",
        "accent": "#3b82f6",
        "accent-hover": "#60a5fa",
        "border-color": "#334155",
        "code-bg": "#1e293b",
        "quote-bg": "#1e293b",
        "quote-text": "#93c5fd",
        "quote-border": "#3b82f6"
      }
    }
  };

  let resolvedStyle = "whitepaper";
  let loadedConfig = null;

  const configPath = path.join(__dirname, '..', '..', '.repo-wizard', 'report-styles.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.styles) {
        loadedConfig = data.styles;
        if (data.defaultStyle && data.styles[data.defaultStyle]) {
          resolvedStyle = data.defaultStyle;
        }
      }
    }
  } catch (err) {
    console.warn(`[Warning] Failed to load/parse report-styles.json: ${err.message}. Falling back to built-in styles.`);
  }

  const stylesSource = loadedConfig || defaultStyles;
  let targetStyleName = styleName || resolvedStyle;
  
  if (!stylesSource[targetStyleName]) {
    console.error(`[Warning] Requested style "${targetStyleName}" was not found or is invalid. Falling back to "whitepaper" style.`);
    targetStyleName = "whitepaper";
  }

  const styleObj = stylesSource[targetStyleName];
  
  const requiredKeys = [
    "bg-primary", "text-primary", "text-heading", "accent", 
    "accent-hover", "border-color", "code-bg", "quote-bg", 
    "quote-text", "quote-border"
  ];

  const validateSubStyle = (sub) => {
    if (!sub || typeof sub !== 'object') return false;
    for (const key of requiredKeys) {
      if (typeof sub[key] !== 'string') return false;
    }
    return true;
  };

  if (!styleObj || !validateSubStyle(styleObj.light) || !validateSubStyle(styleObj.dark)) {
    console.error(`[Warning] Style "${targetStyleName}" is malformed or missing required keys. Falling back to built-in "whitepaper".`);
    return defaultStyles["whitepaper"];
  }

  return styleObj;
}

/**
 * Injects markdown HTML body into the premium template
 */
function convertMdToHtml(mdContent, title = 'Documentation', styleName = 'whitepaper', expanded = false) {
  const htmlBody = sanitizeHtml(parseMarkdown(mdContent, expanded));
  const styleConfig = loadStyleConfig(styleName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(String(title))}</title>
  <style>
    :root {
      --bg-primary: ${styleConfig.light["bg-primary"]};
      --text-primary: ${styleConfig.light["text-primary"]};
      --text-heading: ${styleConfig.light["text-heading"]};
      --accent: ${styleConfig.light["accent"]};
      --accent-hover: ${styleConfig.light["accent-hover"]};
      --border-color: ${styleConfig.light["border-color"]};
      --code-bg: ${styleConfig.light["code-bg"]};
      --quote-bg: ${styleConfig.light["quote-bg"]};
      --quote-text: ${styleConfig.light["quote-text"]};
      --quote-border: ${styleConfig.light["quote-border"]};
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: ${styleConfig.dark["bg-primary"]};
        --text-primary: ${styleConfig.dark["text-primary"]};
        --text-heading: ${styleConfig.dark["text-heading"]};
        --accent: ${styleConfig.dark["accent"]};
        --accent-hover: ${styleConfig.dark["accent-hover"]};
        --border-color: ${styleConfig.dark["border-color"]};
        --code-bg: ${styleConfig.dark["code-bg"]};
        --quote-bg: ${styleConfig.dark["quote-bg"]};
        --quote-text: ${styleConfig.dark["quote-text"]};
        --quote-border: ${styleConfig.dark["quote-border"]};
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

    details.section-details {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin: 20px 0;
      background-color: var(--bg-primary);
      overflow: hidden;
      transition: border-color 0.2s ease;
    }

    details.section-details:hover {
      border-color: var(--accent);
    }

    summary.section-summary {
      padding: 14px 20px;
      background-color: var(--quote-bg);
      cursor: pointer;
      display: flex;
      align-items: center;
      list-style: none;
      user-select: none;
    }

    summary.section-summary::-webkit-details-marker {
      display: none;
    }

    summary.section-summary::before {
      content: "▶";
      display: inline-block;
      margin-right: 12px;
      transition: transform 0.2s ease;
      color: var(--accent);
      font-size: 0.8em;
    }

    details[open] > summary.section-summary::before {
      transform: rotate(90deg);
    }

    summary.section-summary h2 {
      border-bottom: none !important;
      padding-bottom: 0 !important;
      margin: 0 !important;
    }

    .section-content {
      padding: 20px;
      border-top: 1px solid var(--border-color);
      background-color: var(--bg-primary);
    }

    details.subsection-details {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      margin: 15px 0;
      background-color: var(--bg-primary);
      overflow: hidden;
      transition: border-color 0.2s ease;
    }

    details.subsection-details:hover {
      border-color: var(--accent);
    }

    summary.subsection-summary {
      padding: 10px 15px;
      background-color: var(--bg-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      list-style: none;
      user-select: none;
    }

    summary.subsection-summary::-webkit-details-marker {
      display: none;
    }

    summary.subsection-summary::before {
      content: "▶";
      display: inline-block;
      margin-right: 10px;
      transition: transform 0.2s ease;
      color: var(--accent);
      font-size: 0.75em;
    }

    details[open] > summary.subsection-summary::before {
      transform: rotate(90deg);
    }

    summary.subsection-summary h3,
    summary.subsection-summary h4 {
      border-bottom: none !important;
      padding-bottom: 0 !important;
      margin: 0 !important;
    }

    .subsection-content {
      padding: 15px;
      border-top: 1px solid var(--border-color);
      background-color: var(--bg-primary);
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

    img {
      display: block;
      margin: 0 auto;
      max-width: 100%;
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
  
  let reportStyle = 'whitepaper';
  const styleIdx = args.indexOf('--report-style');
  if (styleIdx !== -1) {
    if (args[styleIdx + 1] && !args[styleIdx + 1].startsWith('-')) {
      reportStyle = args[styleIdx + 1];
      args.splice(styleIdx, 2);
    } else {
      args.splice(styleIdx, 1);
    }
  }

  let expanded = false;
  const expandedIdx = args.indexOf('--expanded');
  if (expandedIdx !== -1) {
    if (args[expandedIdx + 1] && !args[expandedIdx + 1].startsWith('-')) {
      expanded = args[expandedIdx + 1].toLowerCase() === 'true';
      args.splice(expandedIdx, 2);
    } else {
      args.splice(expandedIdx, 1);
    }
  }

  if (args.length < 2) {
    console.error('Usage: node scripts/md-to-html.js <input.md> <output.html> [--report-style <style>] [--expanded true|false]');
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
    const htmlContent = convertMdToHtml(mdContent, title, reportStyle, expanded);
    
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
  module.exports = { convertMdToHtml, inlineParse };
}
