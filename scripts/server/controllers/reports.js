'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { writeLog } = require('../utils');
const { fileExists, convertMdToHtml } = require('../static-server');
const sessionStore = require('../session-store');
const { getSafeRepoName } = require('../../reports-compiler-engine');

const ROOT = sessionStore.ROOT;
const defaultReportRoot = ROOT;
const REPORTS_ROOT_DIR = path.join(defaultReportRoot, '.repo-wizard', 'reports');
const LAST_SESSION_POINTER = sessionStore.getLastSessionPointer();

async function scanDirectoryExtensions(dir, extCounts, fileLimit = { count: 0 }, maxFiles = 1000, visited = new Set(), depth = 0) {
  if (fileLimit.count >= maxFiles || depth > 10) return;

  let realDir;
  try {
    realDir = await fs.promises.realpath(dir);
  } catch (err) {
    realDir = path.resolve(dir);
  }

  if (visited.has(realDir)) return;
  visited.add(realDir);

  let files;
  try {
    files = await fs.promises.readdir(realDir);
  } catch (err) {
    return;
  }

  const ignoreDirs = ['.git', 'node_modules', 'dist', 'build', '.repo-wizard', 'bin', 'obj', '.agents'];

  for (const file of files) {
    if (fileLimit.count >= maxFiles) break;

    const fullPath = path.join(realDir, file);
    let stat;
    try {
      stat = await fs.promises.lstat(fullPath);
    } catch (err) {
      continue;
    }

    if (stat.isSymbolicLink()) {
      continue;
    }

    if (stat.isDirectory()) {
      if (ignoreDirs.includes(file)) continue;
      await scanDirectoryExtensions(fullPath, extCounts, fileLimit, maxFiles, visited, depth + 1);
    } else if (stat.isFile()) {
      fileLimit.count++;
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        extCounts[ext] = (extCounts[ext] || 0) + 1;
      }
    }
  }
}

function scanReports(dir, baseDir, fileList = [], depth = 0, maxFiles = 1000) {
  if (depth > 5 || fileList.length >= maxFiles) return fileList;
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (fileList.length >= maxFiles) break;
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.lstatSync(fullPath);
    } catch (e) {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      if (file !== 'agents' && file !== 'history') {
        scanReports(fullPath, baseDir, fileList, depth + 1, maxFiles);
      }
    } else {
      if (file === 'backlog.csv' || file.endsWith('.md') || file.endsWith('.html')) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        fileList.push(relativePath);
      }
    }
  }
  return fileList;
}

function handleGetReports(req, res, correlationId) {
  try {
    let activeReportsRoot = REPORTS_ROOT_DIR;
    const currentSessionFile = sessionStore.getCurrentSessionFile();
    if (fs.existsSync(currentSessionFile)) {
      try {
        const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
        if (sess.reportPath) {
          activeReportsRoot = path.join(path.resolve(sess.reportPath), '.repo-wizard', 'reports');
        }
      } catch (e) {}
    }
    const reports = scanReports(activeReportsRoot, activeReportsRoot);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reports }));
  } catch (err) {
    writeLog('error', 'Failed to read reports directory', correlationId, { error: err.message });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve reports.' }));
  }
}

function handlePostAnalyzeTarget(req, res, correlationId, reportRoot) {
  let body = '';
  let tooLarge = false;
  const MAX_SIZE = 10 * 1024; // 10KB limit
  req.on('data', chunk => {
    if (tooLarge) return;
    body += chunk;
    if (body.length > MAX_SIZE) {
      tooLarge = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    if (tooLarge) return;
    try {
      const payload = JSON.parse(body);
      let sessionState = sessionStore.getSessionState();
      const targetPath = payload.targetPath || (sessionState && sessionState.targetPath);
      
      if (!targetPath || !fs.existsSync(targetPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing target directory path.' }));
        return;
      }

      // Run initial codebase scan first
      try {
        const scanScriptPath = path.join(ROOT, 'scripts', 'initial-codebase-scan.js');
        const { execFileSync } = require('child_process');
        const args = [scanScriptPath, '--target-path', targetPath];
        if (reportRoot) {
          args.push('--report-path', reportRoot);
        }
        execFileSync('node', args, { stdio: 'pipe' });


        const repoName = getSafeRepoName(targetPath);
        const activeReportRootFinal = reportRoot;
        const activeReportsRootDirFinal = path.join(activeReportRootFinal, '.repo-wizard', 'reports');
        const newSessionFile = path.join(activeReportsRootDirFinal, repoName, 'session.json');

        if (fs.existsSync(newSessionFile)) {
          sessionState = JSON.parse(fs.readFileSync(newSessionFile, 'utf8'));
          sessionStore.setCurrentSessionFile(newSessionFile);
          sessionStore.setSessionState(sessionState);

          // Save pointer atomically
          const tempPointer = LAST_SESSION_POINTER + '.tmp';
          fs.writeFileSync(tempPointer, JSON.stringify({ lastSessionPath: newSessionFile }, null, 2), 'utf8');
          fs.renameSync(tempPointer, LAST_SESSION_POINTER);
        }
      } catch (scanErr) {
        writeLog('error', 'Initial codebase scan script failed', correlationId, { error: scanErr.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Initial codebase scan failed: ${scanErr.stderr ? scanErr.stderr.toString() : scanErr.message}` }));
        return;
      }

      const extCounts = {};
      const fileLimit = { count: 0 };
      scanDirectoryExtensions(targetPath, extCounts, fileLimit, 1000)
        .then(() => {
          // Fetch selected frameworks from current sessionState
          const currentSessionState = sessionStore.getSessionState();
          const selectedFrameworks = (currentSessionState && currentSessionState.answers && currentSessionState.answers.frameworks) || [];

          const warnings = [];

          // Check for selected but missing
          const langMap = {
            'react': { name: 'React / Node.js', extensions: ['.js', '.jsx', '.ts', '.tsx'] },
            'rust': { name: 'Rust (Cargo)', extensions: ['.rs'] },
            '.net': { name: '.NET Core (C#)', extensions: ['.cs'] },
            'swift': { name: 'Swift', extensions: ['.swift'] },
            'unity': { name: 'Unity (C#)', extensions: ['.cs', '.meta'] },
            'godot': { name: 'Godot (GDScript)', extensions: ['.gd', '.tscn'] },
            'cobol': { name: 'COBOL', extensions: ['.cob', '.cbl'] },
            'php': { name: 'PHP', extensions: ['.php'] }
          };

          for (const [key, spec] of Object.entries(langMap)) {
            if (selectedFrameworks.includes(key)) {
              const hasAny = spec.extensions.some(ext => (extCounts[ext] || 0) > 0);
              if (!hasAny) {
                warnings.push(`You selected "${spec.name}" but no matching files (${spec.extensions.join(', ')}) were detected.`);
              }
            }
          }

          // Check for unselected but present
          const unselectedChecks = {
            '.php': { key: 'php', name: 'PHP' },
            '.rs': { key: 'rust', name: 'Rust' },
            '.gd': { key: 'godot', name: 'Godot (GDScript)' },
            '.cob': { key: 'cobol', name: 'COBOL' },
            '.swift': { key: 'swift', name: 'Swift' }
          };

          for (const [ext, info] of Object.entries(unselectedChecks)) {
            if (!selectedFrameworks.includes(info.key)) {
              const count = extCounts[ext] || 0;
              if (count > 5) {
                warnings.push(`We detected ${count} files with extension "${ext}" (${info.name}) which was not selected in your technical stack.`);
              }
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', warnings }));
        })
        .catch(err => {
          writeLog('error', 'Failed in scanDirectoryExtensions async traversal', correlationId, { error: err.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Analysis failed: ${err.message}` }));
        });

    } catch (err) {
      writeLog('error', 'Exception in analyze-target handler', correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Analysis failed: ${err.message}` }));
    }
  });
}

function handlePostCompileHtml(req, res, correlationId, cliReportStyle) {
  let body = '';
  let tooLarge = false;
  const MAX_SIZE = 10 * 1024; // 10KB limit
  req.on('data', chunk => {
    if (tooLarge) return;
    body += chunk;
    if (body.length > MAX_SIZE) {
      tooLarge = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    if (tooLarge) return;
    try {
      const { markdownFile } = JSON.parse(body);
      if (typeof markdownFile !== 'string' || !markdownFile.endsWith('.md')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid markdownFile path. Must end with .md.' }));
        return;
      }

      let activeReportsRoot = REPORTS_ROOT_DIR;
      const currentSessionFile = sessionStore.getCurrentSessionFile();
      if (fs.existsSync(currentSessionFile)) {
        try {
          const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
          if (sess.reportPath) {
            activeReportsRoot = path.join(path.resolve(sess.reportPath), '.repo-wizard', 'reports');
          }
        } catch (e) {}
      }
      const inputPath = path.resolve(activeReportsRoot, markdownFile);

      // Enforce boundary check to prevent Directory Traversal
      const relative = path.relative(activeReportsRoot, inputPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access denied.' }));
        return;
      }

      const outputPath = inputPath.replace(/\.md$/, '.html');

      if (!fs.existsSync(inputPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `File not found: ${markdownFile}` }));
        return;
      }

      writeLog('info', `Compiling markdown to HTML: ${markdownFile}`, correlationId);

      try {
        const mdContent = fs.readFileSync(inputPath, 'utf8');
        const title = path.basename(inputPath, '.md');
        const sessionState = sessionStore.getSessionState();
        const reportStyle = (sessionState && sessionState.reportStyle) ? sessionState.reportStyle : (cliReportStyle || 'whitepaper');
        const htmlContent = convertMdToHtml(mdContent, title, reportStyle);
        fs.writeFileSync(outputPath, htmlContent, 'utf8');

        writeLog('info', `Successfully compiled HTML: ${path.basename(outputPath)}`, correlationId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', htmlFile: path.basename(outputPath) }));
      } catch (err) {
        writeLog('error', 'Failed to run md-to-html compilation in-process', correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'HTML compilation failed.' }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
    }
  });
}

function handleGetReportContent(req, res, url, correlationId) {
  try {
    const fileName = url.searchParams.get('file');
    if (!fileName || fileName.includes('\0') || fileName.includes('%00') || (!fileName.endsWith('.md') && !fileName.endsWith('.html') && !fileName.endsWith('.csv'))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing file name.' }));
      return;
    }

    const baseName = path.basename(fileName);
    const isAllowedFile = baseName === 'backlog.csv' || 
                          baseName.endsWith('-executive-summary.md') || 
                          baseName.endsWith('-executive-summary.html') || 
                          baseName.endsWith('-full-report.md') || 
                          baseName.endsWith('-full-report.html') || 
                          baseName.endsWith('-observations.md') || 
                          baseName.endsWith('-observations.html');
    if (!isAllowedFile) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid file name pattern.' }));
      return;
    }

    let activeReportsRoot = REPORTS_ROOT_DIR;
    const currentSessionFile = sessionStore.getCurrentSessionFile();
    if (fs.existsSync(currentSessionFile)) {
      try {
        const sess = JSON.parse(fs.readFileSync(currentSessionFile, 'utf8'));
        if (sess.reportPath) {
          activeReportsRoot = path.join(path.resolve(sess.reportPath), '.repo-wizard', 'reports');
        }
      } catch (e) {}
    }
    const filePath = path.resolve(activeReportsRoot, fileName);

    // Enforce boundary check to prevent Directory Traversal
    const relative = path.relative(activeReportsRoot, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access denied.' }));
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Report not found.' }));
      return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        writeLog('error', `Failed to read report content: ${fileName}`, correlationId, { error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read report file.' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content: data }));
      }
    });
  } catch (err) {
    writeLog('error', 'Exception in report-content handler', correlationId, { error: err.message });
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Request' }));
  }
}

function handlePostBrowseDirectory(req, res, correlationId) {
  let body = '';
  let tooLarge = false;
  const MAX_SIZE = 10 * 1024; // 10KB limit
  req.on('data', chunk => {
    if (tooLarge) return;
    body += chunk;
    if (body.length > MAX_SIZE) {
      tooLarge = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large' }));
      req.destroy();
    }
  });
  req.on('end', async () => {
    if (tooLarge) return;
    try {
      const payload = JSON.parse(body);
      let target = payload.currentPath;

      async function getWindowsDrives() {
        const drives = [];
        if (process.platform === 'win32') {
          const promises = [];
          for (let charCode = 67; charCode <= 90; charCode++) {
            const drive = String.fromCharCode(charCode) + ':\\';
            const checkPromise = fs.promises.access(drive, fs.constants.F_OK)
              .then(() => drive)
              .catch(() => null);
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 200));
            promises.push(Promise.race([checkPromise, timeoutPromise]));
          }
          const results = await Promise.all(promises);
          for (const res of results) {
            if (res) drives.push(res);
          }
        }
        return drives;
      }
      
      if (target === 'drives') {
        const drives = await getWindowsDrives();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          currentPath: 'drives',
          parentPath: null,
          directories: drives
        }));
        return;
      }

      let resolved = target ? path.resolve(target) : ROOT;
      
      // Path Traversal containment check: restrict system-critical directories
      const winSysDirs = [];
      if (process.env.SystemRoot) winSysDirs.push(path.resolve(process.env.SystemRoot));
      if (process.env.ProgramFiles) winSysDirs.push(path.resolve(process.env.ProgramFiles));
      if (process.env['ProgramFiles(x86)']) winSysDirs.push(path.resolve(process.env['ProgramFiles(x86)']));
      if (process.env.ProgramData) winSysDirs.push(path.resolve(process.env.ProgramData));
      const unixSysDirs = ['/System', '/Library', '/var', '/etc', '/bin', '/sbin', '/private', '/dev', '/proc', '/sys'];
      
      const resolvedLower = resolved.toLowerCase();
      const isRestricted = [...winSysDirs, ...unixSysDirs].some(sysDir => {
        try {
          const sysDirLower = path.resolve(sysDir).toLowerCase();
          return resolvedLower === sysDirLower || resolvedLower.startsWith(sysDirLower + path.sep);
        } catch (e) {
          return false;
        }
      });

      if (isRestricted) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Access to system directory is restricted: ${resolved}` }));
        return;
      }
      
      if (!fs.existsSync(resolved)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Path does not exist: ${target}` }));
        return;
      }

      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        resolved = path.dirname(resolved);
      }

      let parent = path.dirname(resolved);
      if (parent === resolved) {
        parent = process.platform === 'win32' ? 'drives' : null;
      }

      const directories = [];
      try {
        const files = fs.readdirSync(resolved);
        for (const file of files) {
          if (['.git', 'System Volume Information', '$RECYCLE.BIN'].includes(file)) {
            continue;
          }
          try {
            const fullPath = path.join(resolved, file);
            const fileStat = fs.statSync(fullPath);
            if (fileStat.isDirectory()) {
              directories.push(file);
            }
          } catch (e) { /* ignore */ }
        }
      } catch (err) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: `Permission denied or folder inaccessible: ${resolved}`,
          currentPath: resolved,
          parentPath: parent,
          directories: []
        }));
        return;
      }

      directories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        currentPath: resolved,
        parentPath: parent,
        directories: directories
      }));

    } catch (err) {
      writeLog('error', 'Exception in browse-directory handler', correlationId, { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Internal server error: ${err.message}` }));
    }
  });
}

module.exports = {
  handleGetReports,
  handlePostAnalyzeTarget,
  handlePostCompileHtml,
  handleGetReportContent,
  handlePostBrowseDirectory
};
