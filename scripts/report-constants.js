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

module.exports = {
  SECTION_WORD_COUNT_MIN,
  SECTION_WORD_COUNT_MAX,
  TEAM_COLORS,
  DISCLAIMER_TEXT,
};
