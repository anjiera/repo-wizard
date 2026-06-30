'use strict';

const QUALITY_PILLARS = {
  SECURITY: 'Security & Compliance',
  PERFORMANCE: 'Performance & Resilience',
  ARCHITECTURE: 'Architecture & Design',
  QUALITY: 'Code Quality & Testing',
  ORCHESTRATOR: 'System Orchestrators',
  HELPER: 'System Helpers'
};

const TEAM_COLORS = {
  GREEN: '🟢 Green Team (Defensive Coding & Build Hygiene)',
  BLUE: '🔵 Blue Team (Active Defense & System Visibility)',
  WHITE: '⚪ White Team (Governance & Audit Compliance)',
  YELLOW: '🟡 Yellow Team (System Builders & Deployment Lifecycle)'
};

const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

module.exports = {
  QUALITY_PILLARS,
  TEAM_COLORS,
  DISCLAIMER_TEXT
};

