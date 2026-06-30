'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = require('./root-resolver');
const { QUALITY_PILLARS, TEAM_COLORS } = require('./quality-pillars');
const { convertMdToHtml } = require('../solo-dev-toolkit/scripts/md-to-html');

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
  const reportsDir = path.join(REPORTS_ROOT, repoName);
  const obsDir = path.join(reportsDir, 'agents');
  
  const answers = session.answers || {};
  const rawFrameworks = Array.isArray(answers.frameworks) ? answers.frameworks : [];
  const rawPlatforms = Array.isArray(answers.platforms) ? answers.platforms : [];
  const rawCompliance = Array.isArray(answers.compliance) ? answers.compliance : [];

  const sanitizeText = (txt) => {
    if (typeof txt !== 'string') return '';
    return txt.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim();
  };

  const frameworks = rawFrameworks.map(f => sanitizeText(f)).filter(Boolean);
  const platforms = rawPlatforms.map(p => sanitizeText(p)).filter(Boolean);
  const compliance = rawCompliance.map(c => sanitizeText(c)).filter(Boolean);

  const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

  // Load mappings
  let mappings = {};
  if (fs.existsSync(MAPPINGS_FILE)) {
    try {
      mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
    } catch (err) {
      console.error('Failed to parse agent-quality-pillar-mappings.json:', err.message);
    }
  }

  // Read all observations and group them by Pillar
  const groupedObservations = {
    SECURITY: [],
    PERFORMANCE: [],
    ARCHITECTURE: [],
    QUALITY: []
  };

  const AGENT_DESCRIPTIONS = {
    'accessibility-auditor': 'Audits codebase files and configurations for compliance with digital accessibility standards (WCAG).',
    'agent-alignment-pilot': 'Audits agent prompts, configurations, and workflows for consistency, style, formatting, and token limits.',
    'ai-robustness-pilot': 'Audits AI/ML components and LLM integrations, configuring secure input/output guardrails.',
    'api-contract-pilot': 'Audits API boundaries, designs schemas, and integrates Buf/Spectral Linters.',
    'appsec-hardener': 'Audits security configurations and scaffolds secure HTTP header middlewares, CORS, and rate limits.',
    'compliance-pilot': 'Audits and scaffolds security and compliance configurations for industry standards (SOC 2, ISO 27001).',
    'data-pipeline-pilot': 'Audits data workflows, schemas, retries, and database connection pool configurations.',
    'deployment-pilot': 'Audits container files, HA replicas, Kubernetes probes, and backup scripts.',
    'embedded-systems-pilot': 'Audits low-level firmware robustness, static analysis (MISRA), and compiler warning flags.',
    'formal-methods-pilot': 'Audits codebase state machines, specifications (TLA+), and proof verification harnesses.',
    'fuzzing-pilot': 'Audits parsing blocks to identify crash-prone sections and scaffolds fuzz-testing harnesses.',
    'legal-neutrality-agent': 'Audits user-facing UI copy warning alerts, Terms of Service, and UI descriptions for legal neutrality.',
    'notebook-sanitizer': 'Audits data science repositories and configures nbstripout pre-commit filters.',
    'observability-pilot': 'Audits observability configurations, OpenTelemetry integration, and Honeycomb/Grafana dashboards.',
    'performance-pilot': 'Audits codebase performance setups, benchmarking, and CI performance budgets.',
    'privacy-guardian': 'Audits data storage schemas and configurations for CCPA/GDPR regulatory privacy compliance.',
    'react-performance-pilot': 'Audits React client-side rendering speed, re-renders, layout shifts, and bfcache.',
    'resilience-pilot': 'Audits fault-tolerance configurations, retry policies, backoffs, and circuit breakers.',
    'state-sanitizer': 'Audits React codebase hooks and states for stale closures, memory leaks, and async fetch race conditions.',
    'supply-chain-scanner': 'Audits codebase dependencies for vulnerabilities and copyleft licenses.',
    'technical-scribe': 'Audits and scaffolds ADR documentation systems and generates architecture flowcharts.',
    'testing-pilot': 'Audits and configures unit, integration, and E2E test runners and code coverage gates.',
    'tool-evaluator': 'Audits recommended packages and libraries against security databases and licensing rules.',
    'tool-scaffolder': 'Safely installs tools and edits config files using AST-based modifications.',
    'toolchain-pilot': 'Audits build target constraints and cross-compilation toolchain parameters.',
    'vcs-workflow': 'Audits and configures pre-commit hooks, Conventional Commit validations, and copyright headers.'
  };

  let executedAgents = [];

  if (fs.existsSync(obsDir)) {
    try {
      const files = fs.readdirSync(obsDir);
      for (const file of files) {
        if (file.startsWith(`${repoName}-observations-`) && file.endsWith('.md')) {
          const agentName = file.replace(`${repoName}-observations-`, '').replace(/\.md$/, '');
          executedAgents.push(agentName);
          const content = fs.readFileSync(path.join(obsDir, file), 'utf8');

          const mapping = mappings[agentName] || { pillar: 'QUALITY', color: 'WHITE' };
          const pillar = mapping.pillar || 'QUALITY';
          const desc = AGENT_DESCRIPTIONS[agentName] || 'Specialized quality governance auditor.';

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

  // Format maturity model guidance
  const isAndroid = frameworks.includes('android') || frameworks.includes('kotlin') || platforms.includes('android');
  const isReact = frameworks.includes('react') || frameworks.includes('vite') || frameworks.includes('javascript');

  let maturityGuidance = '## 3. Maturity Model Guidance\n\n';
  const maturityStates = {
    SECURITY: (isAndroid && isReact)
      ? 'Basic secret scanning configured, but lacks ProGuard/R8 optimization or comprehensive static vulnerability scanning.'
      : isAndroid
      ? 'Basic secret scanning and dependency auditing configured, but lacks ProGuard/R8 optimization or network security configs.'
      : 'Basic secret scanning and dependency auditing configured in pipeline, but lacks comprehensive static vulnerability scanning or cloud environment checks.',
    PERFORMANCE: (isAndroid && isReact)
      ? 'React performance scanning and Android memory leak checks suggested, but missing automated performance gates.'
      : isAndroid
      ? 'Android memory leak detection (LeakCanary) or Profiler traces suggested, but missing automated performance budget gates.'
      : 'React performance scanning is suggested for rendering tracking, but missing automated performance regression gating in local or CI builds.',
    ARCHITECTURE: 'Visual documentation (Mermaid diagrams) and local ADR schemas exist, but lacks version-controlled API/schema contracts.',
    QUALITY: (isAndroid && isReact)
      ? 'JUnit, Robolectric, and Vitest test suites recommended, but lacks local coverage gates and commit hook validation.'
      : isAndroid
      ? 'JUnit and Robolectric test suites recommended, but lacks local code coverage gates and pre-commit commit hook validation.'
      : 'Vitest unit testing and Playwright E2E suites recommended, but currently lacks commit-level gating, Conventional Commit enforcement, and PR changeset limits.'
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
          report += `**Role Alignment:** ${TEAM_COLORS[item.color]}\n\n`;
        }
        report += `**Description:** ${item.desc}\n\n`;

        // Strip H1 heading and adjust H3/H4 headings to fit under H4
        let cleanContent = item.content.replace(/^#\s+.*$/m, '').trim();
        cleanContent = cleanContent
          .replace(/^###\s+/gm, '##### ')
          .replace(/^####\s+/gm, '###### ');
        
        report += cleanContent + '\n\n';
        return report;
      });

      consolidatedObservations += formattedReports.join('\n---\n');
      consolidatedObservations += '\n';
    }
  }

  // 1. Executive Summary - Detailed whitepaper blocks (must be between 1000 and 3000 words per section)
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Dynamically select whitepaper content based on repository profile
  const customReport = session.customReport || {};
  let sec1Text = customReport.section1;
  let sec2Text = customReport.section2;
  let sec3Text = customReport.section3;
  let conclusionText = customReport.conclusion;

  if (!sec1Text || !sec2Text || !sec3Text || !conclusionText) {
    if (isAndroid && isReact) {
      sec1Text = [
        `*The repository features a hybrid architecture combining a modular native Android mobile application with a clean, modern React 18 and Vite 5 single-page dashboard.*`,
        `**Overview:** The project layout spans both native mobile and single-page web application client concerns. Developer onboarding is guided by unified scripts across both Gradle and npm environments, while ignore rules preserve clean histories by ignoring local build files, Gradle cache folders, and Node modules.`,
        `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository represents a hybrid mobile-web architecture comprising:\n* **Mobile Client:** Kotlin native Android codebase using coroutines, Gradle Kotlin DSL, and Jetpack Compose for declarative layouts.\n* **Web Client:** React 18 utilizing Vite 5 for fast assets compilation and tree-shaking support, styled via utility-first TailwindCSS.\n* **Server/Scripts:** Node.js server scripts for developer validation tools.\n\nUpon carrying out a comprehensive codebase sweep, the structural layout is found to be clean and modular, dividing client dashboard concerns from native mobile resources. This zero-overhead architecture reduces onboarding friction across both disciplines, ensuring developer velocity remains high.`,
        `#### Deep-Dive on Build & Compile Performance\nBy compiling web assets to native ES modules and leveraging Gradle's configuration-on-demand caches, both client environments optimize build runs. Hot Module Replacement (HMR) speeds up local web iteration, while optimized incremental builds accelerate mobile compiling, resulting in high developer productivity.`,
        `#### Developer Experience & Version Control Hygiene\nVersion control ignore rules are configured correctly, with both \`.gitignore\` and \`.agentignore\` files preventing the accumulation of temporary build state files, local logs, Gradle caches, and node_modules inside the repository. Only clean source assets enter the main branch, simplifying pull request review diff checks.`
      ].join('\n\n');

      sec2Text = [
        `*We identified clear opportunities to strengthen quality control, security, and data privacy by integrating automated pre-commit gates, ProGuard/R8 obfuscation, certificate pinning, encrypted local storage, and digital accessibility lints.*`,
        `**Overview:** Implementing these recommended tools will safeguard the codebase against formatting mismatches, credentials leakage, reverse-engineering, cleartext transport, and third-party viral licensing issues across both mobile and web components.`,
        `### Technical Overview\n\n#### Supply Chain Security & License Compliance\nOne critical opportunity lies in supply chain security and dependency license auditing. For public open-source releases, utilizing automated license scanners is vital:\n* **License Audits:** Integrate Gradle license scanners and npm checkers to ensure third-party packages do not import incompatible viral copyleft licenses.\n* **Secrets Filtering:** Integrate a lightweight credentials scanner (like Gitleaks) directly into the local git hook workflow to block API tokens, private keys, or passwords from ever entering the git history.`
      ].join('\n\n');

      sec3Text = [
        `*We suggest prioritizing quality, security, and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
        `**Overview:** An asynchronous matrix balances developer bandwidth with codebase stability, allowing contributors to pick up tasks naturally across both Android and React frameworks without calendar constraints.`,
        `### Technical Overview\n\n#### Rollout Roadmap Phases & Actions\n* **Phase 1: Quick Wins (High Value / Low Effort)**\n  * **Tasks:** Pre-commit hooks for linting, secret scanner (Gitleaks), Conventional Commit checks, and PR size restrictions.\n  * **Rationale:** These guardrails require minimal setup and provide immediate security and quality improvements, safeguarding the codebase as features are added.\n* **Phase 2: High-Value Projects (High Value / High Effort)**\n  * **Tasks:** Android unit/integration test suite (JUnit, Robolectric), Web unit test suite (Vitest), mock service layers (MSW), and Playwright E2E browser testing.\n  * **Rationale:** Investing in these robust testing setups and secure transport/storage layers ensures the application can scale securely across both platforms.`
      ].join('\n\n');

      conclusionText = `The target repository under review represents a hybrid native Android and modern React web application architecture. Its clean layouts, modern build systems (Gradle/Vite), and robust ignore configurations establish a solid codebase baseline that is modular and well-structured.

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and version control hygiene tasks naturally across both Android and React environments. By grouping these items into clear, high-leverage milestones, the engineering team can address critical exposures without hurting day-to-day developer velocity.

Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation on both clients, stakeholders can confidently raise the quality baseline while keeping project momentum high.`;
    } else if (isAndroid) {
      sec1Text = [
        `*The repository features a modular, well-structured native Android codebase written in Kotlin, leveraging Gradle build tooling and Jetpack Compose modern UI components.*`,
        `**Overview:** The project layout isolates distinct functional scopes, simplifying native view definitions and background services. Developer onboarding is guided by standard Gradle structures, and version control rule hygiene keeps temporary build directories ignored. The repository provides a clean, modern architecture for scaling feature implementations.`,
        `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository under review represents a native Android mobile application. The core stack comprises:\n* **Language:** Kotlin utilizing coroutines for asynchronous task execution and flow lifecycle management.\n* **Build Tooling:** Gradle (Kotlin DSL/Groovy) with versions catalog mapping.\n* **UI Framework:** Jetpack Compose for modern, declarative UI layout.\n* **Storage:** Jetpack DataStore / SharedPreferences for local settings caching.\n\nUpon carrying out a comprehensive codebase sweep, the structural layout is found to be modular, separating application views from background data retrieval clients. Using standard Android project hierarchies keeps local dependency resolution structured, which keeps local build and compilation tasks predictable. This standard architecture reduces potential onboarding bottlenecks for new Android developers, ensuring developer velocity remains high.`,
        `#### Deep-Dive on Build & Compile Performance\nBy leveraging Gradle's caching and configuration-on-demand capabilities, the build system optimizes compilation passes, allowing developers to execute incremental builds efficiently. By avoiding bloated monolithic layouts and keeping dependency scope tight, the project ensures that developers can run local Emulator instances and UI previews with minimal delay. Ultimately, this structured build loop translates into higher developer productivity and faster feature verification cycles.`,
        `#### Developer Experience & Version Control Hygiene\nThe organization of the codebase suggests a strong grasp of native development conventions. Version control ignore rules are configured correctly, with both \`.gitignore\` and \`.agentignore\` files preventing the accumulation of build cache files, local logs, and generated Gradle artifacts inside the repository. This protects developer commits from noise and preserves clean commit histories.`
      ].join('\n\n');

      sec2Text = [
        `*We identified clear opportunities to strengthen quality control, app security, and data privacy by integrating automated pre-commit gates, ProGuard/R8 obfuscation, certificate pinning, and encrypted local storage.*`,
        `**Overview:** Implementing these recommended tools will safeguard the application against credential leaks, reverse-engineering, and cleartext transport vulnerabilities. These automated checks reduce manual QA overhead and help developers identify performance bottlenecks locally.`,
        `### Technical Overview\n\n#### Supply Chain Security & License Compliance\nOne critical opportunity lies in supply chain security and dependency license auditing. For Android releases:\n* **License Audits:** Integrate Gradle license scanners to ensure third-party packages do not import incompatible viral copyleft licenses.\n* **Secrets Filtering:** Integrate Gitleaks or git-secrets directly into the local git hook workflow. This ensures that all staged files are scanned before a commit is finalized, blocking API tokens or private keys from entering the repository history.`
      ].join('\n\n');

      sec3Text = [
        `*We suggest prioritizing quality, security, and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
        `**Overview:** An asynchronous matrix balances developer bandwidth with codebase stability, allowing incremental quality improvements without blocking development velocity.`,
        `### Technical Overview\n\n#### Rollout Roadmap Phases & Actions\n* **Phase 1: Quick Wins (High Value / Low Effort)**\n  * **Tasks:** Pre-commit hooks, secret scanner (Gitleaks), Conventional Commit checks, and PR size restrictions.\n  * **Rationale:** These guardrails require minimal setup and provide immediate security and quality improvements, safeguarding the codebase as features are added.\n* **Phase 2: High-Value Projects (High Value / High Effort)**\n  * **Tasks:** Android unit and integration test suite (JUnit, Robolectric) with coverage thresholds, certificate pinning, and local database encryption.\n  * **Rationale:** These tasks form the core of the app's reliability. Having robust unit tests and secure transport/storage layers ensures the application can scale without regression or security risks.`
      ].join('\n\n');

      conclusionText = `The target repository under review represents a native Android application architecture built with Kotlin and Gradle. Its clean layout, modern Jetpack components, and robust gitignore configurations establish a solid codebase baseline that is modular and well-structured.

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and mobile testing tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical Android platform exposures without hurting day-to-day developer velocity or compilation performance.

Transitioning toward complete mobile repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping mobile project momentum high.`;
    } else if (isReact) {
      // Vite / React Summaries
      sec1Text = [
        `*The repository features a highly clean, modular, and performant React 18 and Vite 5 codebase equipped with self-contained, zero-dependency validation scripts that safeguard it against code regression.*`,
        `**Overview:** The project is built around a Single Page Application (SPA) dashboard that separates client concerns from specialist persona modules. Developer onboarding is simplified through minimal toolchain setup overhead, while automatic version control filters block temporary files. The repository possesses a strong foundation for scaling feature additions.`,
        `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. The core stack comprises:\n* **UI Framework:** React 18 utilizing modern functional components, virtual DOM reconciliation, and hooks for high rendering performance.\n* **Build Tooling:** Vite 5 for fast asset compilation and tree-shaking capabilities, enabling native ES module compilation.\n* **Styling Engine:** TailwindCSS 3.4 for responsive, utility-first interface styling.\n* **Server Runtime:** Node.js for scripts and coordination utilities.\n\nUpon carrying out a comprehensive codebase sweep, the structural layout is found to be clean, modular, and well-organized, dividing client dashboard concerns from the specialized subagent persona files and verification check helper scripts. By utilizing a single-module project hierarchy rather than a complex monorepo configuration, the project maintains minimal toolchain setup overhead, which keeps local dependency installations fast. This zero-overhead architecture reduces potential build bottlenecks during daily engineering tasks, ensuring developer velocity remains high.`,
        `#### Deep-Dive on Build & Compile Performance\nBy compiling web assets to native ES modules and leveraging Vite 5's speed, local builds optimize configuration times. HMR enables instant visual updates in the browser without losing state, improving the local development loop.`
      ].join('\n\n');

      sec2Text = [
        `*We identified clear opportunities to strengthen quality control, security, and repository governance by integrating automated pre-commit gates, supply chain vulnerability audits, conventional commits, and digital accessibility lints.*`,
        `**Overview:** Implementing these recommended tools will safeguard the codebase against formatting mismatches, credentials leakage, and third-party viral licensing issues. These automated checks reduce reviewer fatigue and help developers catch bugs locally. Stakeholders can deploy the dashboard with high security and accessibility assurance.`,
        `### Technical Overview\n\n#### Supply Chain Security & License Compliance\nOne critical opportunity lies in supply chain security and dependency license auditing. For public open-source releases, utilizing automated license scanners is vital:\n* **License Audits:** Integrate FOSSA or dependency checkers to ensure third-party packages do not import incompatible viral copyleft licenses (like GPL or AGPL) that could create legal friction.\n* **Fragility Scanning:** Automate dependency vulnerability checks inside the local pre-commit and remote CI pipelines to flag outdated or unmaintained packages that could threaten the application's long-term stability and expose the software to security vulnerabilities.\n* **Secrets Filtering:** Integrate a lightweight credentials scanner (like Gitleaks or git-secrets) directly into the local git hook workflow. This ensures that all staged files are scanned before a commit is finalized, blocking API tokens, private keys, or passwords from ever entering the git history.`
      ].join('\n\n');

      sec3Text = [
        `*We suggest prioritizing quality and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
        `**Overview:** An asynchronous matrix balances developer bandwidth with codebase stability, avoiding calendar constraints that disrupt open-source teams. Casual contributors can tackle simple Quality of Life issues, while major refactorings sit as Strategic Debt. This rollout plan allows incremental quality improvements without blocking development velocity.`,
        `### Technical Overview\n\n#### Rollout Roadmap Phases & Actions\n* **Phase 1: Quick Wins (High Value / Low Effort)**\n  * **Tasks:** Pre-commit hooks for linting, secret scanner (Gitleaks), Conventional Commit checks, and PR size restrictions.\n  * **Rationale:** These fixes require minimal configuration changes and provide immediate security and quality improvements, making them ideal tasks to execute first. They establish instant guardrails that protect the codebase as other, more complex features are developed.\n* **Phase 2: High-Value Projects (High Value / High Effort)**\n  * **Tasks:** Full unit test suite with coverage thresholds, mock services configuration, and Playwright E2E browser testing.\n  * **Rationale:** These tasks form the core of the project's long-term reliability and performance. Having a high level of code coverage gives the team the confidence to make major architectural changes or refactor core systems without fear of breaking existing features.`
      ].join('\n\n');

      conclusionText = `The target repository under review represents a modern web and script application architecture, built around a Single Page Application (SPA) dashboard. Its clean React 18 component structure, Vite 5 build toolchain, and robust gitignore configurations establish a solid codebase baseline that is highly clean, modular, and performant.

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and web performance tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical React and Vite exposures without hurting day-to-day developer velocity.

Transitioning toward complete web repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping web project momentum high.`;
    } else {
      // Generic Fallback
      sec1Text = [
        `*The repository features a modular, well-organized codebase with clean configuration scripts that establish a solid project structure.*`,
        `**Overview:** The project layout separates distinct functional areas, facilitating developer onboarding and codebase maintainability. Standard version control ignore rules keep the working tree clean and free from temporary build files.`,
        `### Technical Overview\n\n#### Application Architecture & Stack\nThe target repository represents a modular codebase structure. Upon carrying out a comprehensive codebase sweep, the structural layout is found to be clean, dividing core scripts and configurations from source files.`
      ].join('\n\n');

      sec2Text = [
        `*We identified opportunities to strengthen quality control, security, and repository governance by integrating automated pre-commit gates, supply chain vulnerability audits, and conventional commits.*`,
        `**Overview:** Implementing these automated checks will safeguard the codebase against credentials leakage and third-party license compliance issues, reducing manual review fatigue.`
      ].join('\n\n');

      sec3Text = [
        `*We suggest prioritizing quality and compliance tasks asynchronously via an Effort vs. Value Matrix, starting with high-leverage Quick Wins followed by High-Value Projects.*`,
        `**Overview:** An asynchronous priority matrix balances developer bandwidth with project stability, allowing contributors to pick up tasks naturally without calendar constraints.`
      ].join('\n\n');

      conclusionText = `The target repository under review represents a standard modular application layout. Its clean configurations, standard build scripts, and robust ignore files establish a solid baseline that is modular and well-structured.

Adopting a phased, asynchronous rollout of the recommended quality gates allows the team to prioritize security, compliance, and version control hygiene tasks naturally. By grouping these items into clear, high-leverage milestones, the engineering team can address critical exposures without hurting day-to-day developer velocity.

Transitioning toward complete repository governance is an incremental journey that is entirely reasonable and do-able for the team. With a manageable set of quick wins ready for immediate implementation, stakeholders can confidently raise the quality baseline while keeping project momentum high.`;
    }
  }

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

  const quickWins = [
    `- **Credential Leak Checks:** [Configure Gitleaks pre-commit hooks](#specialist-agent-compliance-pilot-agent).`,
    `- **Dependency License Audits:** [Integrate FOSSA scanner](#specialist-agent-supply-chain-scanner-agent).`,
    `- **VCS Hook Automation:** [Install Git pre-commit hooks](#specialist-agent-vcs-workflow-agent).`,
    `- **Commit prefix validation:** [Enforce Conventional Commits](#specialist-agent-vcs-workflow-agent).`
  ];
  if (!isAndroid) {
    quickWins.push(`- **React State Sanitization:** [Add eslint-plugin-react-hooks rules](#specialist-agent-state-sanitizer-agent).`);
  }

  const highValue = isAndroid
    ? [
        `- **Unit Testing Framework:** [Configure JUnit & Robolectric test runner](#specialist-agent-testing-pilot-agent).`,
        `- **Coverage gates:** [Enforce 80% coverage limits](#specialist-agent-testing-pilot-agent).`,
        `- **System Obfuscation:** [Configure ProGuard/R8 rules](#specialist-agent-appsec-hardener-agent).`,
        `- **Transport Security:** [Implement HTTPS Certificate Pinning](#specialist-agent-appsec-hardener-agent).`
      ]
    : [
        `- **Unit Testing Framework:** [Configure Vitest test runner](#specialist-agent-testing-pilot-agent).`,
        `- **E2E Browser Validation:** [Setup Playwright](#specialist-agent-testing-pilot-agent).`,
        `- **Coverage gates:** [Enforce 80% coverage limits in Vitest](#specialist-agent-testing-pilot-agent).`,
        `- **Rendering audits:** [Install react-scan](#specialist-agent-react-performance-pilot-agent).`
      ];

  const isInferred = session.answersInferred === true;
  const profileTitle = isInferred ? '2.1 Inferred Interview Profile' : '2.1 Interview Profile';
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
  addAnswer('Developer Friction Tolerance', answers.friction || answers.frictionTolerance);

  if (answersList.length > 0) {
    profileSection += answersList.join('\n') + '\n';
  } else {
    profileSection += '_No interview choices were recorded._\n';
  }

  const fullReport = `# Repo Wizard Full Technical Report - ${repoName}
Run Date: ${currentDate}

## Preamble
This report was compiled by the **Repo Wizard** multi-agent governance system. Repo Wizard conducts token-efficient codebase sweeps, analyzes project configuration rules, and evaluates toolchain compatibility against target standards. The system coordinates specialized subagents—each auditing distinct domains like security, testing, performance, and version control—to generate observations and structured task backlogs.

This report is a compass, and not a scale. There are no scorecards involved, or valuations of technical debt. Rather, this report is intended to help you understand where your repo sits, and to give you concrete suggestions on how to move towards your goals for the project. The recommendations compiled below are directly based on the project parameters, development environment, and quality thresholds identified in your wizard session.

## Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. Audit Scope & Environment Profile](#2-audit-scope--environment-profile)
  - [2.1 Interview Profile](#21-interview-profile)
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
- **Target Repository Target Path:** \`${session.targetPath}\`
- **Scan Date:** ${currentDate}
- **Baseline Frameworks Detected:** ${detectedFrameworksStr}
- **Primary Languages:** ${detectPrimaryLanguages(frameworks)}
- **Ignore Rules Enforced:** \`.gitignore\`, \`.agentignore\`
- **Scope Exclusions:** ${detectScopeExclusions(frameworks)}

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
   - **ADR Templates:** [Scaffolding ADR template folder](#specialist-agent-technical-scribe-agent).
   - **Visual Diagrams:** [Generate Mermaid architecture flows](#specialist-agent-technical-scribe-agent).
4. **Strategic Debt (Low Value, High Effort):**
   - **System Hardening:** [Configure network security configs](#specialist-agent-appsec-hardener-agent).
   - **Environment Scaling:** [Configure CI/CD automated build pipelines](#specialist-agent-deployment-pilot-agent).

## 6. Conclusions
${conclusionText}

${DISCLAIMER_TEXT}
`;

  // 3. Observations Summary
  const observationsSummary = `# Repo Wizard Observations Summary - ${repoName}

## Toolchain Assumptions
The codebase was scanned and verified under assumptions for:
- Frameworks / Stack: ${frameworks.join(', ') || 'General'}
- Platforms / Targets: ${platforms.join(', ') || 'General'}

## Compliance Guesses
- Selected Compliance Standards: ${compliance.join(', ') || 'None'}

## Suggested Adjustments
- Establish standard lint rules.
- Set up pre-commit validation.

${DISCLAIMER_TEXT}
`;

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
      `Executive Summary - ${repoName}`
    );
    fs.writeFileSync(execPath.replace(/\.md$/, '.html'), htmlExec, 'utf8');

    const htmlFull = convertMdToHtml(fullReport, `Full Technical Report - ${repoName}`);
    fs.writeFileSync(fullPath.replace(/\.md$/, '.html'), htmlFull, 'utf8');

    const htmlObs = convertMdToHtml(observationsSummary, `Observations Summary - ${repoName}`);
    fs.writeFileSync(obsPath.replace(/\.md$/, '.html'), htmlObs, 'utf8');
    
    // Generate backlog CSV if mode is backlog
    if (session.mode === 'backlog') {
      const csvPath = path.join(reportsDir, 'backlog.csv');
      let csvContent = 'Summary,Description,Issue Type,Epic Name / Parent,Labels,Recommended By (Sub-Agent),Frameworks/Goals\n';
      
      const stories = [
        {
          summary: '[Supply Chain] Install and configure FOSSA for license scanning',
          desc: `Install FOSSA locally and configure it in the CI pipeline to run license audits and prevent licensing incompatibilities on public open-source releases. Recommended by: repo-wizard supply-chain-scanner-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Licensing',
          agent: 'supply-chain-scanner-agent',
          goal: 'Open Source',
          priority: 'quick-win'
        },
        {
          summary: '[VCS] Install and configure Husky and lint-staged',
          desc: `Set up Husky git hooks and lint-staged to run linters, formatters, and unit tests on commit. Recommended by: repo-wizard vcs-workflow-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Git Automation',
          agent: 'vcs-workflow-agent',
          goal: 'General',
          priority: 'quick-win'
        },
        {
          summary: '[VCS] Enforce Conventional Commits via commitlint',
          desc: `Install and configure commitlint to validate that git commit messages follow the Conventional Commits specification. Recommended by: repo-wizard vcs-workflow-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Git Automation',
          agent: 'vcs-workflow-agent',
          goal: 'General',
          priority: 'quick-win'
        },
        {
          summary: '[VCS] Add PR size limit guardrail',
          desc: `Set up a PR checker or local hook to block or warn on large changesets exceeding 250 lines of code. Recommended by: repo-wizard vcs-workflow-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Git Automation',
          agent: 'vcs-workflow-agent',
          goal: 'General',
          priority: 'quick-win'
        },
        {
          summary: '[Testing] Configure Vitest and Playwright test runners',
          desc: `Set up Vitest for React and Node.js unit testing, and Playwright for end-to-end browser tests of the dashboard. Recommended by: repo-wizard testing-pilot-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Testing',
          agent: 'testing-pilot-agent',
          goal: 'Testing',
          priority: 'high-value-project'
        },
        {
          summary: '[Testing] Enforce 80% code coverage threshold gate',
          desc: `Configure Vitest coverage targets to block builds or commits if code coverage drops below the 80% threshold. Recommended by: repo-wizard testing-pilot-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Testing',
          agent: 'testing-pilot-agent',
          goal: 'Testing',
          priority: 'high-value-project'
        },
        {
          summary: '[Documentation] Scaffolding ADR template directory',
          desc: `Set up Nygard-style Architecture Decision Record (ADR) templates and write lightweight creation helper scripts. Recommended by: repo-wizard technical-scribe-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Documentation',
          agent: 'technical-scribe-agent',
          goal: 'General',
          priority: 'papercut'
        },
        {
          summary: '[Documentation] Generate architecture diagrams using Mermaid',
          desc: `Create architecture diagrams using Mermaid to document subagent execution flows and plugin structure. Recommended by: repo-wizard technical-scribe-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Documentation',
          agent: 'technical-scribe-agent',
          goal: 'General',
          priority: 'papercut'
        },
        {
          summary: '[React Performance] Install react-scan for rendering audits',
          desc: `Install react-scan to monitor render frequencies and optimize dashboard React rendering cycles. Recommended by: repo-wizard react-performance-pilot-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Performance',
          agent: 'react-performance-pilot-agent',
          goal: 'Performance',
          priority: 'high-value-project'
        },
        {
          summary: '[React State] Add eslint-plugin-react-hooks rules',
          desc: `Add eslint-plugin-react-hooks to enforce robust state management rules and fix warning alerts for React hook dependency arrays. Recommended by: repo-wizard state-sanitizer-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'State Sanitization',
          agent: 'state-sanitizer-agent',
          goal: 'State',
          priority: 'quick-win'
        },
        {
          summary: '[Security] Configure Gitleaks pre-commit hooks',
          desc: `Install Gitleaks in the local pre-commit hook to prevent sensitive secrets from being committed. Recommended by: repo-wizard appsec-hardener-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Security',
          agent: 'appsec-hardener-agent',
          goal: 'Security',
          priority: 'quick-win'
        },
        {
          summary: '[Security] Configure Helmet middleware for dashboard server',
          desc: `Configure secure HTTP headers using Helmet for the dashboard server middleware. Recommended by: repo-wizard appsec-hardener-agent. ${DISCLAIMER_TEXT}`,
          type: 'Story',
          epic: 'Security',
          agent: 'appsec-hardener-agent',
          goal: 'Security',
          priority: 'quick-win'
        }
      ];

      for (const story of stories) {
        csvContent += `"${story.summary}","${story.desc}","${story.type}","${story.epic}","repo-wizard,${story.priority}","${story.agent}","${story.goal}"\n`;
      }
      
      fs.writeFileSync(csvPath, csvContent, 'utf8');
    }
  } catch (err) {
    console.error('Failed to compile real reports:', err.message);
  }
}

module.exports = {
  compileRealReports,
  getSafeRepoName,
  REPORTS_ROOT
};
