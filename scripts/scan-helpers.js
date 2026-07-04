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

module.exports = {
  buildFileCache,
  clearFileCache,
  checkFilesExist,
  checkAgentRelevance,
  getRepoSize
};
