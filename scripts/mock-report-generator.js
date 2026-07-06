'use strict';

const path = require('path');

function generateMockCompiledAnalysis(targetPath) {
  const repoName = path.basename(path.resolve(targetPath)).replace(/[^a-zA-Z0-9_\-\.]/g, '') || 'project';

  const makeMockSection = (title, summary, overviewText) => {
    const paras = [
      `*${summary}*`,
      `**Overview: ${overviewText}**`,
      `### Technical Overview`
    ];
    for (let i = 1; i <= 9; i++) {
      paras.push(`This is paragraph number ${i} in the mock technical overview for ${title} designed to verify that the report compiler works correctly under all validation constraints. We are checking that the codebase metrics look stable, the dependencies do not introduce circular references, and the api limits are respected. This section provides detailed technical analysis on security compliance, digital accessibility audits, performance benchmarks, and version control hooks. Developers can refer to this analysis to understand the current state of repository governance. Let us also highlight that the automated test execution was verified across multiple target platforms, mitigating the likelihood of regressions on the main integration branch.`);
    }
    return paras.join('\n\n');
  };

  const defaultMaturity = {
    SECURITY: 'Basic secret scanning and dependency auditing configured in pipeline, but lacks comprehensive static vulnerability scanning or cloud environment checks.',
    PERFORMANCE: 'React performance scanning is suggested for rendering tracking, but missing automated performance regression gating in local or CI builds.',
    ARCHITECTURE: 'Visual documentation (Mermaid diagrams) and local ADR schemas exist, but lacks version-controlled API/schema contracts.',
    QUALITY: 'Vitest unit testing and Playwright E2E suites recommended, but currently lacks commit-level gating, Conventional Commit enforcement, and PR changeset limits.'
  };

  const defaultConclusion = `Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the baseline quality bar.`;
  const defaultAdjustments = `- Establish standard lint rules.\n- Set up pre-commit validation.`;

  const quickWins = [
    `- **Credential Leak Checks:** [Configure Gitleaks pre-commit hooks](#specialist-agent-compliance-auditor).`,
    `- **Dependency License Audits:** [Integrate FOSSA scanner](#specialist-agent-supply-chain-auditor).`,
    `- **VCS Hook Automation:** [Install Git pre-commit hooks](#specialist-agent-vcs-workflow-engineer).`,
    `- **Commit prefix validation:** [Enforce Conventional Commits](#specialist-agent-vcs-workflow-engineer).`
  ];

  const highValue = [
    `- **Unit Testing Framework:** [Configure Vitest test runner](#specialist-agent-qa-engineer).`,
    `- **E2E Browser Validation:** [Setup Playwright](#specialist-agent-qa-engineer).`,
    `- **Coverage gates:** [Enforce 80% coverage limits in Vitest](#specialist-agent-qa-engineer).`,
    `- **Rendering audits:** [Install react-scan](#specialist-agent-react-performance-auditor).`
  ];

  const papercuts = [
    `- **ADR Templates:** [Tooling ADR template folder](#specialist-agent-technical-scribe).`,
    `- **Visual Diagrams:** [Generate Mermaid architecture flows](#specialist-agent-technical-scribe).`
  ];

  const strategicDebt = [
    `- **System Hardening:** [Configure network security configs](#specialist-agent-appsec-hardener).`,
    `- **Environment Scaling:** [Configure CI/CD automated build pipelines](#specialist-agent-deployment-engineer).`
  ];

  const backlog = [
    {
      summary: '[Supply Chain] Install and configure FOSSA for license scanning',
      desc: `Install FOSSA locally and configure it in the CI pipeline to run license audits and reduce licensing incompatibilities on public open-source releases. Recommended by: repo-wizard supply-chain-auditor.`,
      type: 'Story',
      epic: 'Licensing',
      agent: 'supply-chain-auditor',
      goal: 'Open Source',
      priority: 'quick-win'
    },
    {
      summary: '[VCS] Install and configure Husky and lint-staged',
      desc: `Set up Husky git hooks and lint-staged to run linters, formatters, and unit tests on commit. Recommended by: repo-wizard vcs-workflow-engineer.`,
      type: 'Story',
      epic: 'Git Automation',
      agent: 'vcs-workflow-engineer',
      goal: 'General',
      priority: 'quick-win'
    },
    {
      summary: '[VCS] Enforce Conventional Commits via commitlint',
      desc: `Install and configure commitlint to validate that git commit messages follow the Conventional Commits specification. Recommended by: repo-wizard vcs-workflow-engineer.`,
      type: 'Story',
      epic: 'Git Automation',
      agent: 'vcs-workflow-engineer',
      goal: 'General',
      priority: 'quick-win'
    },
    {
      summary: '[VCS] Add PR size limit guardrail',
      desc: `Set up a PR checker or local hook to block or warn on large changesets exceeding 250 lines of code. Recommended by: repo-wizard vcs-workflow-engineer.`,
      type: 'Story',
      epic: 'Git Automation',
      agent: 'vcs-workflow-engineer',
      goal: 'General',
      priority: 'quick-win'
    }
  ];

  return {
    section1: makeMockSection('Section 1', 'The repository features a modular codebase with modern build tooling.', 'Repo Wizard completed the automated sweep successfully.'),
    section2: makeMockSection('Section 2', 'Opportunities exist to strengthen quality control and security gates.', 'Implementing these recommended tools will safeguard the codebase against vulnerabilities.'),
    section3: makeMockSection('Section 3', 'We suggest prioritizing compliance tasks asynchronously.', 'An asynchronous rollout Roadmap balances bandwidth with quality.'),
    maturityGuidance: `## 3. Maturity Model Guidance\n\n* **Security & Compliance:** ${defaultMaturity.SECURITY}\n* **Performance & Resilience:** ${defaultMaturity.PERFORMANCE}\n* **Architecture & Design:** ${defaultMaturity.ARCHITECTURE}\n* **Code Quality & Testing:** ${defaultMaturity.QUALITY}`,
    maturityStates: defaultMaturity,
    conclusion: defaultConclusion,
    suggestedAdjustments: defaultAdjustments,
    quickWins,
    highValue,
    papercuts,
    strategicDebt,
    backlog
  };
}

module.exports = {
  generateMockCompiledAnalysis
};
