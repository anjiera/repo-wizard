'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = require('./root-resolver');
const { QUALITY_PILLARS } = require('./quality-pillars');
const { TEAM_COLORS, DISCLAIMER_TEXT } = require('./report-constants');
const { DEFAULT_CONCLUSION } = require('./report-templates-helper');
const { convertMdToHtml } = require('../solo-dev-toolkit/scripts/md-to-html');
const { redactReportFiles, redactReportText } = require('./redactor');

const REPORTS_ROOT = path.join(ROOT, '.repo-wizard', 'reports');
const MAPPINGS_FILE = path.join(ROOT, 'agents', 'agent-quality-pillar-mappings.json');

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

function compileRealReports(session) {
  const repoName = getSafeRepoName(session.targetPath);
  const reportsRoot = session.reportPath ? path.join(path.resolve(session.reportPath), '.repo-wizard', 'reports') : REPORTS_ROOT;
  const reportsDir = path.join(reportsRoot, repoName);
  const obsDir = path.join(reportsDir, 'agents');
  const reportStyle = session.reportStyle || 'whitepaper';

  const answers = session.answers || {};
  const rawFrameworks = Array.isArray(answers.frameworks) ? answers.frameworks : [];
  const rawPlatforms = Array.isArray(answers.platforms) ? answers.platforms : [];
  const rawCompliance = Array.isArray(answers.compliance) ? answers.compliance : [];

  const sanitizeText = (txt) => {
    if (typeof txt !== 'string') return '';
    return txt.replace(/[^a-zA-Z0-9_\-\.\s+#]/g, '').trim();
  };



  const frameworks = rawFrameworks.map(f => sanitizeText(f)).filter(Boolean);
  const platforms = rawPlatforms.map(p => sanitizeText(p)).filter(Boolean);
  const compliance = rawCompliance.map(c => sanitizeText(c)).filter(Boolean);



  // Load mappings
  let mappings = {};
  if (fs.existsSync(MAPPINGS_FILE)) {
    try {
      mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
    } catch (err) {
      console.error('Failed to parse agent-quality-pillar-mappings.json:', err.message);
    }
  }

  // Load descriptions from JSON configuration file
  const DESCRIPTIONS_FILE = path.join(ROOT, 'agents', 'agent-descriptions.json');
  let agentDescriptions = {};
  if (fs.existsSync(DESCRIPTIONS_FILE)) {
    try {
      agentDescriptions = JSON.parse(fs.readFileSync(DESCRIPTIONS_FILE, 'utf8'));
    } catch (err) {
      console.error('Failed to parse agent-descriptions.json:', err.message);
    }
  }

  // Read all observations and group them by Pillar
  const groupedObservations = {
    SECURITY: [],
    PERFORMANCE: [],
    ARCHITECTURE: [],
    QUALITY: []
  };

  let executedAgents = [];

  let skippedAgents = new Set();
  const manifestPath = path.join(reportsDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest && Array.isArray(manifest.contracts)) {
        for (const c of manifest.contracts) {
          if (c.status === 'skipped') {
            skippedAgents.add(c.agent_name);
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse manifest.json for relevance check:', err.message);
    }
  }

  if (fs.existsSync(obsDir)) {
    try {
      const files = fs.readdirSync(obsDir);
      for (const file of files) {
        if (file.startsWith(`${repoName}-observations-`) && file.endsWith('.md')) {
          const agentName = file.replace(`${repoName}-observations-`, '').replace(/\.md$/, '');
          if (skippedAgents.has(agentName)) {
            continue;
          }
          const content = fs.readFileSync(path.join(obsDir, file), 'utf8');
          executedAgents.push(agentName);

          const mapping = mappings[agentName] || { pillar: 'QUALITY', color: 'WHITE' };
          const pillar = mapping.pillar || 'QUALITY';
          const desc = agentDescriptions[agentName] || 'Specialized quality governance auditor.';

          const agentData = {
            agentName,
            color: mapping.color,
            desc,
            content
          };

          if (groupedObservations[pillar]) {
            groupedObservations[pillar].push(agentData);
          } else {
            groupedObservations.QUALITY.push(agentData);
          }
        }
      }
    } catch (e) {
      console.error('Failed to read observations directory for compilation:', e.message);
    }
  }

  if (executedAgents.length === 0) {
    executedAgents.push('General Quality Auditor');
  }

  const compiledAnalysis = session.compiledAnalysis || {};
  const missingFields = [];

  const isAndroid = frameworks.includes('android') || frameworks.includes('kotlin') || platforms.includes('android');
  const isReact = frameworks.includes('react') || frameworks.includes('vite') || frameworks.includes('javascript');

  // Format maturity model guidance
  let maturityGuidance = '## 3. Maturity Model Guidance\n\n';
  if (!compiledAnalysis.maturityStates) {
    missingFields.push('maturityStates');
  }
  const maturityStates = compiledAnalysis.maturityStates || {
    SECURITY: 'Error: Security maturity model guidance was not generated.',
    PERFORMANCE: 'Error: Performance maturity model guidance was not generated.',
    ARCHITECTURE: 'Error: Architecture maturity model guidance was not generated.',
    QUALITY: 'Error: Code Quality maturity model guidance was not generated.'
  };

  for (const key of ['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'QUALITY']) {
    maturityGuidance += `* **${QUALITY_PILLARS[key]}:** ${maturityStates[key]}\n`;
  }

  // Format consolidated observations by pillar
  let consolidatedObservations = '';
  const PILLAR_NUMBERS = {
    SECURITY: '4.1',
    PERFORMANCE: '4.2',
    ARCHITECTURE: '4.3',
    QUALITY: '4.4'
  };

  for (const key of ['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'QUALITY']) {
    const list = groupedObservations[key];
    if (list && list.length > 0) {
      const pNum = PILLAR_NUMBERS[key];
      consolidatedObservations += `\n### ${pNum} Pillar: ${QUALITY_PILLARS[key]}\n\n`;

      const formattedReports = list.map((item, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d...
        let report = `#### ${pNum}. ${letter}) Specialist Agent: ${item.agentName}\n\n`;
        if (item.color && TEAM_COLORS[item.color]) {
          report += `**Cybersecurity Role Alignment:** ${TEAM_COLORS[item.color]}\n\n`;
        }
        report += `**Description:** ${item.desc}\n\n`;

        let cleanContent = item.content.replace(/^#\s+.*$/m, '').trim();
        cleanContent = cleanContent
          .replace(/^##\s+/gm, '#### ')
          .replace(/^###\s+/gm, '##### ')
          .replace(/^####\s+/gm, '###### ');

        report += cleanContent + '\n\n';
        return report;
      });

      consolidatedObservations += formattedReports.join('\n---\n');
      consolidatedObservations += '\n';
    }
  }

  // 1. Executive Summary - Detailed whitepaper blocks (word count limits are dynamic based on repoSize; see scripts/report-constants.js)
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Dynamically select whitepaper content based on repository profile
  if (!compiledAnalysis.section1) missingFields.push('section1');
  if (!compiledAnalysis.section2) missingFields.push('section2');
  if (!compiledAnalysis.section3) missingFields.push('section3');
  if (!compiledAnalysis.conclusion) missingFields.push('conclusion');

  let sec1Text = compiledAnalysis.section1 || `*Error: Section 1 (Codebase Health & Strengths) data was not provided by the subagent sweep.*\n\nOverview: Error compiling section.\n\n### Technical Overview\n\n#### Detail\nThe orchestration agent failed to generate the Technical Overview data for Section 1. Please re-run the sweep and verify that the specialist agents executed successfully.`;
  let sec2Text = compiledAnalysis.section2 || `*Error: Section 2 (Tooling & Compliance Opportunities) data was not provided by the subagent sweep.*\n\nOverview: Error compiling section.\n\n### Technical Overview\n\n#### Detail\nThe orchestration agent failed to generate the Technical Overview data for Section 2. Please re-run the sweep and verify that the specialist agents executed successfully.`;
  let sec3Text = compiledAnalysis.section3 || `*Error: Section 3 (Rollout Roadmap) data was not provided by the subagent sweep.*\n\nOverview: Error compiling section.\n\n### Technical Overview\n\n#### Detail\nThe orchestration agent failed to generate the Technical Overview data for Section 3. Please re-run the sweep and verify that the specialist agents executed successfully.`;
  let conclusionText = compiledAnalysis.conclusion || DEFAULT_CONCLUSION;

  const execSummary = `# Repo Wizard Executive Summary - ${repoName}

## Section 1: Codebase Health & Strengths
${sec1Text}

## Section 2: Tooling & Compliance Opportunities
${sec2Text}

## Section 3: Rollout Roadmap (Effort vs. Value)
${sec3Text}

## Section 4: Conclusions
${conclusionText}

${DISCLAIMER_TEXT}
`;

  // 2. Full Technical Report
  const detectedFrameworksStr = frameworks.length > 0
    ? frameworks.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')
    : (isAndroid ? 'Android, Kotlin, Gradle' : 'React, Vite, Node.js');

  const detectPrimaryLanguages = (fws) => {
    const langs = new Set(['Markdown', 'JSON']);
    if (fws.includes('android') || fws.includes('kotlin') || isAndroid) {
      langs.add('Kotlin');
      langs.add('Java');
      langs.add('XML');
      langs.add('Gradle');
    }
    if (fws.includes('react') || fws.includes('javascript') || fws.includes('vite') || isReact) {
      langs.add('JavaScript');
      langs.add('JSX');
      langs.add('HTML');
    }
    return Array.from(langs).join(', ');
  };

  const detectScopeExclusions = (fws) => {
    const exclusions = new Set(['.git/', '.repo-wizard/history/']);
    if (fws.includes('android') || fws.includes('gradle') || isAndroid) {
      exclusions.add('.gradle/');
      exclusions.add('build/');
    }
    if (fws.includes('react') || fws.includes('javascript') || isReact) {
      exclusions.add('node_modules/');
      exclusions.add('dist/');
    }
    return Array.from(exclusions).map(e => `\`${e}\``).join(', ');
  };

  if (!Array.isArray(compiledAnalysis.quickWins)) missingFields.push('quickWins');
  if (!Array.isArray(compiledAnalysis.highValue)) missingFields.push('highValue');
  if (!Array.isArray(compiledAnalysis.papercuts)) missingFields.push('papercuts');
  if (!Array.isArray(compiledAnalysis.strategicDebt)) missingFields.push('strategicDebt');
  if (typeof compiledAnalysis.suggestedAdjustments !== 'string' || !compiledAnalysis.suggestedAdjustments.trim()) {
    missingFields.push('suggestedAdjustments');
  }

  const quickWins = Array.isArray(compiledAnalysis.quickWins) ? compiledAnalysis.quickWins : [
    `- **Error:** Quick Wins recommendations list was not generated by the sweep.`
  ];

  const highValue = Array.isArray(compiledAnalysis.highValue) ? compiledAnalysis.highValue : [
    `- **Error:** High-Value Projects recommendations list was not generated by the sweep.`
  ];

  const papercuts = Array.isArray(compiledAnalysis.papercuts) ? compiledAnalysis.papercuts : [
    `- **Error:** Papercuts recommendations list was not generated by the sweep.`
  ];

  const strategicDebt = Array.isArray(compiledAnalysis.strategicDebt) ? compiledAnalysis.strategicDebt : [
    `- **Error:** Strategic Debt recommendations list was not generated by the sweep.`
  ];



  const isInferred = session.answersInferred === true;
  const profileTitle = isInferred ? '2.3 Inferred Interview Profile' : '2.3 Interview Profile';
  const interviewTocLink = isInferred ? '  - [2.3 Inferred Interview Profile](#23-inferred-interview-profile)' : '  - [2.3 Interview Profile](#23-interview-profile)';
  let profileSection = `### ${profileTitle}\n\n`;
  if (isInferred) {
    profileSection += `*Note: The survey answers in this profile were dynamically inferred by the Repo Wizard orchestration agent using best-guess codebase sweeps rather than user input.*\n\n`;
  }

  const answersList = [];
  const addAnswer = (label, value) => {
    if (value !== undefined && value !== null && value !== '') {
      const valStr = Array.isArray(value) ? value.join(', ') : String(value);
      answersList.push(`- **${label}:** ${valStr}`);
    }
  };

  addAnswer('Target Frameworks', answers.frameworks);
  addAnswer('Target Platforms', answers.platforms);
  addAnswer('Compliance Standards', answers.compliance);
  addAnswer('Scaffolding Mode', answers.scaffoldingMode || answers.mode);
  addAnswer('Coverage Threshold Target', answers.coverageThreshold ? `${answers.coverageThreshold}%` : null);
  addAnswer('Project Context / Target Audience', answers.context || answers.targetAudience);
  addAnswer('Tooling Strictness', answers.strictness || answers.friction || answers.frictionTolerance);

  if (answersList.length > 0) {
    profileSection += answersList.join('\n') + '\n';
  } else {
    profileSection += '_No interview choices were recorded._\n';
  }



  const fullReport = `# Repo Wizard Full Technical Report - ${repoName}
Run Date: ${currentDate}

## Preamble
This report was compiled by the **Repo Wizard** multi-agent LLM-based code analysis and onboarding tool. Repo Wizard conducts token-efficient codebase sweeps, analyzes project configuration rules, and evaluates toolchain compatibility against target standards. The system coordinates specialized subagents—each auditing distinct domains like security, testing, performance, and version control—to generate observations and structured task backlogs.

This report is a compass, and not a scale. There are no scorecards involved, or valuations of technical debt. Rather, this report is intended to help you understand where your repo sits, and to give you concrete suggestions on how to move towards your goals for the project. The recommendations compiled below are directly based on the project parameters, development environment, and quality thresholds identified in your wizard session.

## Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. Audit Scope & Environment Profile](#2-audit-scope--environment-profile)
  - [2.1 Environment Profile](#21-environment-profile)
  - [2.2 Audit Parameters](#22-audit-parameters)
${interviewTocLink}
- [3. Maturity Model Guidance](#3-maturity-model-guidance)
- [4. Detailed Quality Pillars Analysis](#4-detailed-quality-pillars-analysis)
  - [Security & Compliance](#security--compliance)
  - [Performance & Resilience](#performance--resilience)
  - [Architecture & Design](#architecture--design)
  - [Code Quality & Testing](#code-quality--testing)
- [5. Effort vs. Value Rollout Matrix](#5-effort-vs-value-rollout-matrix)
- [6. Conclusions](#6-conclusions)

## 1. Executive Summary
Refer to the separate [Executive Summary](${repoName}-executive-summary.html) for a detailed, high-level business review of the repository's health, Opportunities, and Rollout roadmap.

## 2. Audit Scope & Environment Profile

### 2.1 Environment Profile
- **Target Repository Path:** \`${session.targetPath}\`
- **Scan Date:** ${currentDate}
- **Baseline Frameworks Detected:** ${detectedFrameworksStr}
- **Primary Languages:** ${detectPrimaryLanguages(frameworks)}
- **Ignore Rules Enforced:** \`.gitignore\`, \`.agentignore\`
- **Scope Exclusions:** ${detectScopeExclusions(frameworks)}

### 2.2 Audit Parameters

- **--report-path :** ${session.reportPath ? `\`${session.reportPath}\`` : 'workspace root (default)'}
- **--tos-path :** ${session.tosPath ? `\`${session.tosPath}\`` : 'report path (default)'}
- **--headless :** ${session.answersInferred === true ? 'true' : 'false (default)'}
- **--redact :** ${session.redact === true ? 'true' : 'false (default)'}
- **--mock-cli :** ${session.mockCli === true ? 'true' : 'false (default)'}

${profileSection}

${maturityGuidance}

## 4. Detailed Quality Pillars Analysis
This section compiles the detailed observations, tool comparative matrices, suggested action plans, and rollback scripts generated by each specialist subagent, organized by Core Pillar.

${consolidatedObservations || 'No specialist observations were recorded.'}

## 5. Effort vs. Value Rollout Matrix
This matrix categorizes all suggested actions by crossing their technical value with the implementation effort required by the engineering team, providing an asynchronous execution roadmap:

1. **Quick Wins (High Value, Low Effort):**
${quickWins.join('\n')}

2. **High-Value Projects (High Value, High Effort):**
${highValue.join('\n')}

3. **Papercuts / Quality of Life (Low Value, Low Effort):**
${papercuts.join('\n')}

4. **Strategic Debt (Low Value, High Effort):**
${strategicDebt.join('\n')}

## 6. Conclusions
${conclusionText}

${DISCLAIMER_TEXT}
`;

  // 3. Observations Summary
  const suggestedAdjustmentsText = compiledAnalysis.suggestedAdjustments || `- **Error:** Suggested adjustments recommendations were not generated by the sweep.`;

  const observationsSummary = `# Repo Wizard Observations Summary - ${repoName}

## Toolchain Assumptions
The codebase was scanned and verified under assumptions for:
- Frameworks / Stack: ${frameworks.join(', ') || 'General'}
- Platforms / Targets: ${platforms.join(', ') || 'General'}

## Compliance Guesses
- Selected Compliance Standards: ${compliance.join(', ') || 'None'}

## Suggested Adjustments
${suggestedAdjustmentsText}

${DISCLAIMER_TEXT}
`;

  if (!Array.isArray(compiledAnalysis.backlog)) {
    missingFields.push('backlog');
  }

  if (missingFields.length > 0) {
    throw new Error(`Report compilation failed due to missing dynamic report sections: ${missingFields.join(', ')}.`);
  }

  const execPath = path.join(reportsDir, `${repoName}-executive-summary.md`);
  const fullPath = path.join(reportsDir, `${repoName}-full-report.md`);
  const obsPath = path.join(reportsDir, `${repoName}-observations.md`);

  try {
    fs.writeFileSync(execPath, execSummary.replace(/#specialist-agent-/g, `${repoName}-full-report.md#specialist-agent-`).replace(/#4/g, `${repoName}-full-report.md#4`), 'utf8');
    fs.writeFileSync(fullPath, fullReport, 'utf8');
    fs.writeFileSync(obsPath, observationsSummary, 'utf8');

    // Compile to HTML
    const htmlExec = convertMdToHtml(
      execSummary.replace(/#specialist-agent-/g, `${repoName}-full-report.html#specialist-agent-`).replace(/#4/g, `${repoName}-full-report.html#4`),
      `Executive Summary - ${repoName}`,
      reportStyle
    );
    fs.writeFileSync(execPath.replace(/\.md$/, '.html'), htmlExec, 'utf8');

    const htmlFull = convertMdToHtml(fullReport, `Full Technical Report - ${repoName}`, reportStyle);
    fs.writeFileSync(fullPath.replace(/\.md$/, '.html'), htmlFull, 'utf8');

    const htmlObs = convertMdToHtml(observationsSummary, `Observations Summary - ${repoName}`, reportStyle);
    fs.writeFileSync(obsPath.replace(/\.md$/, '.html'), htmlObs, 'utf8');

    // Generate backlog CSV unconditionally
    const csvPath = path.join(reportsDir, 'backlog.csv');
    let csvContent = 'Summary,Description,Issue Type,Epic Name / Parent,Labels,Recommended By (Sub-Agent),Frameworks/Goals\n';

    const stories = Array.isArray(compiledAnalysis.backlog) ? compiledAnalysis.backlog : [];

    const escapeCsv = (str) => {
      if (!str) return '';
      let escaped = String(str).replace(/"/g, '""');
      if (/^[=\+\-@]/.test(escaped.trim()) || /[\t;,]+[=\+\-@]/.test(escaped)) {
        escaped = "'" + escaped;
      }
      return escaped;
    };

    for (const story of stories) {
      const descText = story.desc || '';
      const cleanDesc = descText.includes(DISCLAIMER_TEXT) ? descText : `${descText} ${DISCLAIMER_TEXT}`;
      csvContent += `"${escapeCsv(story.summary)}","${escapeCsv(cleanDesc)}","${escapeCsv(story.type || 'Story')}","${escapeCsv(story.epic || 'General')}","repo-wizard,${escapeCsv(story.priority || 'quick-win')}","${escapeCsv(story.agent || 'general')}","${escapeCsv(story.goal || 'General')}"\n`;
    }

    fs.writeFileSync(csvPath, csvContent, 'utf8');

    if (session.isRedact || session.redact) {
      const targetWorkspace = session.targetPath || process.cwd();
      
      // 1. Redacted Executive Summary (.md)
      const redactedExecMd = redactReportText(
        execSummary.replace(/#specialist-agent-/g, `redacted-${repoName}-full-report.md#specialist-agent-`).replace(/#4/g, `redacted-${repoName}-full-report.md#4`),
        repoName,
        targetWorkspace
      );
      const redactedExecPath = path.join(reportsDir, 'redacted-executive-summary.md');
      fs.writeFileSync(redactedExecPath, redactedExecMd, 'utf8');
      
      // 2. Redacted Executive Summary (.html)
      const htmlRedactedExec = convertMdToHtml(
        redactReportText(
          execSummary.replace(/#specialist-agent-/g, `redacted-${repoName}-full-report.html#specialist-agent-`).replace(/#4/g, `redacted-${repoName}-full-report.html#4`),
          repoName,
          targetWorkspace
        ),
        'Executive Summary (Redacted)',
        reportStyle
      );
      fs.writeFileSync(redactedExecPath.replace(/\.md$/, '.html'), htmlRedactedExec, 'utf8');

      // 3. Redacted Full Technical Report (.md)
      const redactedFullMd = redactReportText(fullReport, repoName, targetWorkspace);
      const redactedFullPath = path.join(reportsDir, `redacted-${repoName}-full-report.md`);
      fs.writeFileSync(redactedFullPath, redactedFullMd, 'utf8');

      // 4. Redacted Full Technical Report (.html)
      const htmlRedactedFull = convertMdToHtml(redactedFullMd, `Full Technical Report (Redacted) - ${repoName}`, reportStyle);
      fs.writeFileSync(redactedFullPath.replace(/\.md$/, '.html'), htmlRedactedFull, 'utf8');
    }
  } catch (err) {
    console.error('Failed to compile real reports:', err.message);
    throw err;
  }
}
module.exports = {
  compileRealReports,
  getSafeRepoName,
  REPORTS_ROOT,
  redactReportFiles
};
