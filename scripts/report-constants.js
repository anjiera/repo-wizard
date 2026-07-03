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
  'accessibility-auditor-agent': 'Accessibility Auditing',
  'compliance-auditor-agent': 'Compliance Hardening',
  'privacy-hardener-agent': 'PII Logging Audits',
  'supply-chain-auditor-agent': 'Dependency Licensing',
  'qa-engineer-agent': 'Unit Testing',
  'vcs-workflow-engineer-agent': 'Git Hook Automation',
  'technical-scribe-agent': 'ADR & Architecture Diagrams',
  'appsec-hardener-agent': 'Application Hardening',
  'resilience-architect-agent': 'Retry & Circuit Breaker Setup',
  'deployment-engineer-agent': 'Container Orchestration & Backup',
  'api-contract-architect-agent': 'API Linting & Schema Checking',
  'data-pipeline-architect-agent': 'Data Integrity Checks',
  'notebook-auditor-agent': 'Jupyter Notebook Cleaners',
  'embedded-systems-auditor-agent': 'Embedded Warning Linters',
  'fuzz-engineer-agent': 'Fuzz Testing Harnesses',
  'toolchain-architect-agent': 'Cross-Compilation Toolchains',
  'state-integrity-auditor-agent': 'Formal Model Verification',
  'ai-robustness-hardener-agent': 'AI Input/Output Guardrails',
  'react-performance-auditor-agent': 'React Performance Auditing',
  'state-hardener-agent': 'State Sanitization Auditing'
};

const MOCK_TOOL_MAP = {
  'accessibility-auditor-agent': 'axe-core',
  'compliance-auditor-agent': 'checkov',
  'privacy-hardener-agent': 'gdpr-sanitizer',
  'supply-chain-auditor-agent': 'fossa',
  'qa-engineer-agent': 'vitest',
  'vcs-workflow-engineer-agent': 'husky',
  'technical-scribe-agent': 'mermaid-cli',
  'appsec-hardener-agent': 'helmet',
  'resilience-architect-agent': 'opossum',
  'deployment-engineer-agent': 'docker-compose',
  'api-contract-architect-agent': 'spectral',
  'data-pipeline-architect-agent': 'pandera',
  'notebook-auditor-agent': 'nbstripout',
  'embedded-systems-auditor-agent': 'cppcheck',
  'fuzz-engineer-agent': 'cargo-fuzz',
  'toolchain-architect-agent': 'riscv-gcc',
  'state-integrity-auditor-agent': 'kani',
  'ai-robustness-hardener-agent': 'llm-guard',
  'react-performance-auditor-agent': 'react-scan',
  'state-hardener-agent': 'eslint-plugin-react-hooks'
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

