'use strict';

const fs = require('fs');
const path = require('path');

let fileCache = null;

function buildFileCache(targetDir) {
  if (fileCache) return;
  fileCache = [];
  const visited = new Set();
  const MAX_FILES = 10000;

  const traverse = (dir, depth = 0) => {
    if (depth > 8 || fileCache.length >= MAX_FILES) return;
    let absPath;
    try {
      absPath = fs.realpathSync(dir);
    } catch (e) {
      absPath = path.resolve(dir);
    }
    if (visited.has(absPath)) return;
    visited.add(absPath);

    let files;
    try {
      files = fs.readdirSync(absPath);
    } catch (e) {
      return;
    }

    for (const file of files) {
      if (fileCache.length >= MAX_FILES) return;
      if (['.git', 'node_modules', 'dist', 'build', '.repo-wizard', 'bin', 'obj', '.agents', 'temp_e2e_sandbox', 'temp_mock_repo'].includes(file)) {
        continue;
      }
      const fullPath = path.join(absPath, file);
      try {
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
          continue;
        }
        fileCache.push({ name: file, path: fullPath, isDir: stat.isDirectory() });
        if (stat.isDirectory()) {
          traverse(fullPath, depth + 1);
        }
      } catch (e) { /* ignore */ }
    }
  };

  traverse(targetDir);
}

function clearFileCache() {
  fileCache = null;
}

function checkFilesExist(dir, predicate, maxDepth = 4, targetDir = dir) {
  buildFileCache(targetDir);
  const resolvedDir = path.resolve(dir);
  const resolvedDirWithSep = resolvedDir.endsWith(path.sep) ? resolvedDir : resolvedDir + path.sep;
  for (const item of fileCache) {
    if (item.path === resolvedDir || item.path.startsWith(resolvedDirWithSep)) {
      const relativePath = path.relative(resolvedDir, item.path);
      const parts = relativePath.split(path.sep);
      const relativeDepth = parts.length - 1;
      if (relativeDepth <= maxDepth) {
        if (predicate(item.name, item.path)) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkAgentRelevance(agentName, targetDir) {
  // Always relevant core agents
  if (['supply-chain-auditor', 'vcs-workflow-engineer', 'technical-scribe', 'maintainability-auditor'].includes(agentName)) {
    return { relevance: 'High', rationale: 'Core governance/VCS agent' };
  }

  const hasExtension = (dir, ext, maxDepth = 4) => {
    return checkFilesExist(dir, (file) => file.toLowerCase().endsWith(ext.toLowerCase()), maxDepth, targetDir);
  };

  const hasFile = (dir, name) => {
    return checkFilesExist(dir, (file) => file.toLowerCase() === name.toLowerCase(), 4, targetDir);
  };

  const hasAnyFileOf = (dir, names) => {
    return checkFilesExist(dir, (file) => names.map(n => n.toLowerCase()).includes(file.toLowerCase()), 4, targetDir);
  };

  // Notebook Auditor
  if (agentName === 'notebook-auditor') {
    if (!hasExtension(targetDir, '.ipynb')) {
      return { relevance: 'Low', rationale: 'No Jupyter Notebooks (.ipynb) found in workspace' };
    }
    return { relevance: 'High', rationale: 'Jupyter Notebooks detected' };
  }

  // React Performance / State Hardener
  if (['react-performance-auditor', 'state-hardener'].includes(agentName)) {
    let hasReact = false;
    const pkgJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if ((pkg.dependencies && pkg.dependencies.react) || (pkg.devDependencies && pkg.devDependencies.react)) {
          hasReact = true;
        }
      } catch (e) { /* ignore */ }
    }
    if (!hasReact) {
      hasReact = checkFilesExist(targetDir, (file, fullPath) => {
        if (file === 'package.json') {
          try {
            const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            if ((pkg.dependencies && pkg.dependencies.react) || (pkg.devDependencies && pkg.devDependencies.react)) {
              return true;
            }
          } catch (e) { /* ignore */ }
        }
        return false;
      }, 5, targetDir);
    }
    if (!hasReact) {
      hasReact = hasExtension(targetDir, '.jsx', 8) || hasExtension(targetDir, '.tsx', 8);
    }
    if (!hasReact) {
      return { relevance: 'Low', rationale: 'No React dependency or JSX/TSX files found in workspace' };
    }
    return { relevance: 'High', rationale: 'React elements detected in workspace' };
  }

  // Embedded Systems
  if (agentName === 'embedded-systems-auditor') {
    const isFirmware = hasAnyFileOf(targetDir, ['CMakeLists.txt', 'Makefile']) || hasExtension(targetDir, '.ino');
    if (!isFirmware) {
      return { relevance: 'Low', rationale: 'No firmware build files (CMakeLists.txt, Makefile) or Arduino files found' };
    }
    return { relevance: 'High', rationale: 'Firmware build configurations detected' };
  }

  // Toolchain / Formal Methods / Fuzzing
  if (['toolchain-architect', 'state-integrity-auditor', 'fuzz-engineer'].includes(agentName)) {
    const hasRust = hasFile(targetDir, 'Cargo.toml');
    const hasCpp = hasExtension(targetDir, '.cpp') || hasExtension(targetDir, '.c') || hasExtension(targetDir, '.h');
    const hasGo = hasFile(targetDir, 'go.mod');
    
    if (agentName === 'state-integrity-auditor' || agentName === 'fuzz-engineer') {
      if (!hasRust && !hasCpp && !hasGo) {
        return { relevance: 'Low', rationale: 'No Rust, Go, or C/C++ files found for formal verification or fuzzing' };
      }
    } else { // toolchain-architect
      const hasToolchainStack = hasRust || hasCpp || hasFile(targetDir, 'CMakeLists.txt');
      if (!hasToolchainStack) {
        return { relevance: 'Low', rationale: 'No compiled language toolchain files (Cargo.toml, C/C++ source) found' };
      }
    }
    return { relevance: 'Medium', rationale: 'Compiled language files detected' };
  }

  // Data Pipeline
  if (agentName === 'data-pipeline-architect') {
    const hasDataStack = hasAnyFileOf(targetDir, ['dags', 'airflow', 'prefect']) || hasExtension(targetDir, '.py');
    if (!hasDataStack) {
      return { relevance: 'Low', rationale: 'No Python scripts or Airflow DAG folders found' };
    }
    return { relevance: 'Medium', rationale: 'Python or data pipeline files present' };
  }

  // Database Lifecycle Auditor
  if (agentName === 'database-lifecycle-auditor') {
    const hasSql = hasExtension(targetDir, '.sql');
    const hasDbLib = hasAnyFileOf(targetDir, ['prisma', 'drizzle']) || checkFilesExist(targetDir, (file, fullPath) => {
      if (file === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          const libs = ['pg', 'pg-pool', 'mysql2', 'sequelize', 'mongoose', 'mongodb', 'redis', 'ioredis', 'sqlite3', 'better-sqlite3', '@supabase/supabase-js', 'firebase-admin', 'aws-sdk', 'cassandra-driver'];
          return libs.some(lib => deps[lib] !== undefined);
        } catch (e) { /* ignore */ }
      }
      return false;
    }, 5, targetDir);
    if (!hasSql && !hasDbLib) {
      return { relevance: 'Low', rationale: 'No SQL files or direct database library dependencies found' };
    }
    return { relevance: 'High', rationale: 'SQL files or database dependencies detected' };
  }

  // Dev Onboarding Auditor
  if (agentName === 'dev-onboarding-auditor') {
    return { relevance: 'High', rationale: 'Always high relevance for workspace setup and contributor onboarding reviews' };
  }

  // Deployment Engineer
  if (agentName === 'deployment-engineer') {
    const hasDocker = hasAnyFileOf(targetDir, ['docker-compose.yml', 'docker-compose.yaml', 'Dockerfile']);
    if (!hasDocker) {
      return { relevance: 'Low', rationale: 'No Dockerfile or docker-compose files found in workspace' };
    }
    return { relevance: 'High', rationale: 'Container configurations detected' };
  }

  // Default is relevant
  return { relevance: 'High', rationale: 'Relevant to requested workspace features' };
}

function getRepoSize(totalLOC, totalFiles) {
  if (totalLOC < 1000 || totalFiles < 10) {
    return 'XS';
  } else if (totalLOC >= 1000 && totalLOC < 10000) {
    return 'S';
  } else if (totalLOC >= 10000 && totalLOC < 50000) {
    return 'M';
  } else if (totalLOC >= 50000 && totalLOC < 150000) {
    return 'L';
  } else {
    return 'XL';
  }
}

function getSafeRepoName(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return 'project';
  const resolved = path.resolve(targetPath);
  let name = path.basename(resolved);
  name = name.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!name || name === '.' || name === '..' || name.toLowerCase() === 'reports' || name.toLowerCase() === 'history') {
    return 'project';
  }
  return name;
}

function archiveSession(reportRoot = process.cwd(), options = {}) {
  const wsPath = (reportRoot && typeof reportRoot === 'string') ? reportRoot : process.cwd();
  const opt = options || {};
  const wizardDir = path.join(wsPath, '.repo-wizard');
  const repoName = opt.repoName || getSafeRepoName(wsPath);

  if (!fs.existsSync(wizardDir)) {
    return;
  }

  const reportsDir = path.join(wizardDir, 'reports', repoName);
  const rootSession = path.join(wizardDir, 'session.json');
  const reportsSession = path.join(reportsDir, 'session.json');

  const formatTimestamp = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
           `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  let sessionTime = new Date();
  try {
    if (fs.existsSync(rootSession)) {
      sessionTime = fs.statSync(rootSession).mtime;
    } else if (fs.existsSync(reportsSession)) {
      sessionTime = fs.statSync(reportsSession).mtime;
    }
  } catch (err) {
    // Fallback
  }
  const timestamp = formatTimestamp(sessionTime);

  const historyDir = path.join(wizardDir, 'reports', 'history', repoName, timestamp);

  try {
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create history directory:', err.message);
    return;
  }

  const archivedFiles = [];

  const archiveFile = (srcPath) => {
    if (fs.existsSync(srcPath)) {
      const ext = path.extname(srcPath);
      const base = path.basename(srcPath, ext);
      const isReportFile = srcPath.startsWith(reportsDir);
      const prefix = isReportFile && (base === 'session' || base === 'manifest') ? 'reports_' : '';
      const destPath = path.join(historyDir, `${prefix}${base}_${timestamp}${ext}`);
      
      try {
        fs.copyFileSync(srcPath, destPath);
        fs.unlinkSync(srcPath);
        archivedFiles.push({
          original: path.relative(wsPath, srcPath),
          archived: path.relative(wsPath, destPath)
        });
      } catch (e) {
        // Ignore
      }
    }
  };

  const rmRecursive = (dirPath) => {
    if (fs.existsSync(dirPath)) {
      if (fs.rmSync) {
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
        } catch (e) {}
      } else {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          if (fs.lstatSync(itemPath).isDirectory()) {
            rmRecursive(itemPath);
          } else {
            try {
              fs.unlinkSync(itemPath);
            } catch (e) {}
          }
        }
        try {
          fs.rmdirSync(dirPath);
        } catch (e) {}
      }
    }
  };

  // Ensure reportsDir exists
  try {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create reports directory:', err.message);
    return;
  }

  let answersInferred = true;
  try {
    const sessionFileToCheck = fs.existsSync(rootSession) ? rootSession : (fs.existsSync(reportsSession) ? reportsSession : null);
    if (sessionFileToCheck) {
      const sess = JSON.parse(fs.readFileSync(sessionFileToCheck, 'utf8'));
      if (sess.answersInferred === false) {
        answersInferred = false;
      }
    }
  } catch (e) {}

  const rootManifest = path.join(wizardDir, 'manifest.json');
  const reportsManifest = path.join(reportsDir, 'manifest.json');

  if (answersInferred) {
    archiveFile(reportsSession);
  }
  archiveFile(reportsManifest);

  if (fs.existsSync(rootSession) && answersInferred) {
    try {
      fs.copyFileSync(rootSession, reportsSession);
    } catch (e) {}
  }

  if (fs.existsSync(rootManifest)) {
    try {
      fs.copyFileSync(rootManifest, reportsManifest);
    } catch (e) {}
  }

  if (answersInferred) {
    archiveFile(rootSession);
  }
  archiveFile(rootManifest);

  if (fs.existsSync(reportsDir)) {
    try {
      const items = fs.readdirSync(reportsDir);
      for (const item of items) {
        const itemPath = path.join(reportsDir, item);
        try {
          if (fs.statSync(itemPath).isFile()) {
            const ext = path.extname(item);
            if (ext === '.md' || ext === '.html') {
              archiveFile(itemPath);
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  const agentsDir = path.join(reportsDir, 'agents');
  rmRecursive(agentsDir);

  if (opt.pruneContracts === true) {
    const contractsDir = path.join(reportsDir, 'contracts');
    rmRecursive(contractsDir);
  }

  try {
    if (fs.readdirSync(reportsDir).length === 0) {
      fs.rmdirSync(reportsDir);
      const reportsParent = path.dirname(reportsDir);
      if (fs.readdirSync(reportsParent).length === 0) {
        fs.rmdirSync(reportsParent);
      }
    }
  } catch (e) {}

  if (archivedFiles.length > 0) {
    console.log(`\n\x1b[1m\x1b[34m==>\x1b[0m \x1b[1mArchived prior wizard configurations and reports to history:\x1b[0m`);
    archivedFiles.forEach(f => {
      console.log(`  \x1b[32m✓\x1b[0m ${f.original} -> ${f.archived}`);
    });
  }
}

function promoteStateFiles(reportRoot, repoName) {
  const wizardDir = path.join(reportRoot, '.repo-wizard');
  const rootSession = path.join(wizardDir, 'session.json');
  const rootManifest = path.join(wizardDir, 'manifest.json');
  
  const reportsDir = path.join(wizardDir, 'reports', repoName);
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  if (fs.existsSync(rootSession)) {
    fs.copyFileSync(rootSession, path.join(reportsDir, 'session.json'));
  }
  if (fs.existsSync(rootManifest)) {
    fs.copyFileSync(rootManifest, path.join(reportsDir, 'manifest.json'));
  }
}

function ensureReportDirectories(reportRoot, repoName) {
  const wizardDir = path.join(reportRoot, '.repo-wizard');
  const reportsDir = path.join(wizardDir, 'reports', repoName);
  const agentsDir = path.join(reportsDir, 'agents');
  const contractsDir = path.join(reportsDir, 'contracts');
  
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(contractsDir, { recursive: true });
  
  return { reportsDir, agentsDir, contractsDir };
}

module.exports = {
  buildFileCache,
  clearFileCache,
  checkFilesExist,
  checkAgentRelevance,
  getRepoSize,
  getSafeRepoName,
  archiveSession,
  promoteStateFiles,
  ensureReportDirectories
};

