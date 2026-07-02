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
  'compliance-pilot-agent': 'Compliance Hardening',
  'privacy-guardian-agent': 'PII Logging Audits',
  'supply-chain-scanner-agent': 'Dependency Licensing',
  'testing-pilot-agent': 'Unit Testing',
  'vcs-workflow-agent': 'Git Hook Automation',
  'technical-scribe-agent': 'ADR & Architecture Diagrams',
  'appsec-hardener-agent': 'Application Hardening',
  'resilience-pilot-agent': 'Retry & Circuit Breaker Setup',
  'deployment-pilot-agent': 'Container Orchestration & Backup',
  'api-contract-pilot-agent': 'API Linting & Schema Checking',
  'data-pipeline-pilot-agent': 'Data Integrity Checks',
  'notebook-sanitizer-agent': 'Jupyter Notebook Cleaners',
  'embedded-systems-pilot-agent': 'Embedded Warning Linters',
  'fuzzing-pilot-agent': 'Fuzz Testing Harnesses',
  'toolchain-pilot-agent': 'Cross-Compilation Toolchains',
  'formal-methods-pilot-agent': 'Formal Model Verification',
  'ai-robustness-pilot-agent': 'AI Input/Output Guardrails',
  'react-performance-pilot-agent': 'React Performance Auditing',
  'state-sanitizer-agent': 'State Sanitization Auditing'
};

const MOCK_TOOL_MAP = {
  'accessibility-auditor-agent': 'axe-core',
  'compliance-pilot-agent': 'checkov',
  'privacy-guardian-agent': 'gdpr-sanitizer',
  'supply-chain-scanner-agent': 'fossa',
  'testing-pilot-agent': 'vitest',
  'vcs-workflow-agent': 'husky',
  'technical-scribe-agent': 'mermaid-cli',
  'appsec-hardener-agent': 'helmet',
  'resilience-pilot-agent': 'opossum',
  'deployment-pilot-agent': 'docker-compose',
  'api-contract-pilot-agent': 'spectral',
  'data-pipeline-pilot-agent': 'pandera',
  'notebook-sanitizer-agent': 'nbstripout',
  'embedded-systems-pilot-agent': 'cppcheck',
  'fuzzing-pilot-agent': 'cargo-fuzz',
  'toolchain-pilot-agent': 'riscv-gcc',
  'formal-methods-pilot-agent': 'kani',
  'ai-robustness-pilot-agent': 'llm-guard',
  'react-performance-pilot-agent': 'react-scan',
  'state-sanitizer-agent': 'eslint-plugin-react-hooks'
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

