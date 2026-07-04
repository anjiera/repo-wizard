'use strict';

// Word-count thresholds for Executive Summary sections.
// This is the single canonical source; all other files reference these constants.
const SECTION_WORD_COUNT_MIN = 800;
const SECTION_WORD_COUNT_MAX = 3000;

const TEAM_COLORS = {
  GREEN: '🟢 Green Team (Defensive Coding & Build Hygiene)',
  BLUE: '🔵 Blue Team (Active Defense & System Visibility)',
  WHITE: '⚪ White Team (Governance & Audit Compliance)',
  YELLOW: '🟡 Yellow Team (System Builders & Deployment Lifecycle)'
};

const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

const MOCK_CAPABILITY_MAP = {
  'accessibility-auditor': 'Accessibility Auditing',
  'compliance-auditor': 'Compliance Hardening',
  'privacy-hardener': 'PII Logging Audits',
  'supply-chain-auditor': 'Dependency Licensing',
  'qa-engineer': 'Unit Testing',
  'vcs-workflow-engineer': 'Git Hook Automation',
  'technical-scribe': 'ADR & Architecture Diagrams',
  'appsec-hardener': 'Application Hardening',
  'resilience-architect': 'Retry & Circuit Breaker Setup',
  'deployment-engineer': 'Container Orchestration & Backup',
  'api-contract-architect': 'API Linting & Schema Checking',
  'data-pipeline-architect': 'Data Integrity Checks',
  'notebook-auditor': 'Jupyter Notebook Cleaners',
  'embedded-systems-auditor': 'Embedded Warning Linters',
  'fuzz-engineer': 'Fuzz Testing Harnesses',
  'toolchain-architect': 'Cross-Compilation Toolchains',
  'state-integrity-auditor': 'Formal Model Verification',
  'ai-robustness-hardener': 'AI Input/Output Guardrails',
  'react-performance-auditor': 'React Performance Auditing',
  'state-hardener': 'State Sanitization Auditing',
  'maintainability-auditor': 'Maintainability Auditing'
};

const MOCK_TOOL_MAP = {
  'accessibility-auditor': 'axe-core',
  'compliance-auditor': 'checkov',
  'privacy-hardener': 'gdpr-sanitizer',
  'supply-chain-auditor': 'fossa',
  'qa-engineer': 'vitest',
  'vcs-workflow-engineer': 'husky',
  'technical-scribe': 'mermaid-cli',
  'appsec-hardener': 'helmet',
  'resilience-architect': 'opossum',
  'deployment-engineer': 'docker-compose',
  'api-contract-architect': 'spectral',
  'data-pipeline-architect': 'pandera',
  'notebook-auditor': 'nbstripout',
  'embedded-systems-auditor': 'cppcheck',
  'fuzz-engineer': 'cargo-fuzz',
  'toolchain-architect': 'riscv-gcc',
  'state-integrity-auditor': 'kani',
  'ai-robustness-hardener': 'llm-guard',
  'react-performance-auditor': 'react-scan',
  'state-hardener': 'eslint-plugin-react-hooks',
  'maintainability-auditor': 'eslint-plugin-complexity'
};

const INCREMENTAL_ADOPTION_THRESHOLD_LOC = 30000;

module.exports = {
  SECTION_WORD_COUNT_MIN,
  SECTION_WORD_COUNT_MAX,
  TEAM_COLORS,
  DISCLAIMER_TEXT,
  MOCK_CAPABILITY_MAP,
  MOCK_TOOL_MAP,
  INCREMENTAL_ADOPTION_THRESHOLD_LOC
};

