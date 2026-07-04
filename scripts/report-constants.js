'use strict';

// Word-count thresholds for Executive Summary sections.
const SIZING_THRESHOLDS = {
  XS: { min: 50, max: 600, minParagraphs: 1 },
  S:  { min: 150, max: 1000, minParagraphs: 1 },
  M:  { min: 300, max: 2000, minParagraphs: 2 },
  L:  { min: 500, max: 3000, minParagraphs: 3 },
  XL: { min: 800, max: 4000, minParagraphs: 3 }
};

function getSectionLimits(repoSize) {
  const size = (repoSize || 'L').toUpperCase();
  return SIZING_THRESHOLDS[size] || SIZING_THRESHOLDS.L;
}

// Default values for backwards compatibility (Tier L values)
const SECTION_WORD_COUNT_MIN = 500;
const SECTION_WORD_COUNT_MAX = 3000;

const TEAM_COLORS = {
  GREEN: '🟢 Green Team (Defensive Coding & Build Hygiene)',
  BLUE: '🔵 Blue Team (Active Defense & System Visibility)',
  WHITE: '⚪ White Team (Governance & Audit Compliance)',
  YELLOW: '🟡 Yellow Team (System Builders & Deployment Lifecycle)'
};

const DISCLAIMER_TEXT = 'Disclaimer: Recommended tools are selected for stack compatibility and ecosystem popularity. The developer retains final responsibility for reviewing security, licenses, and executing code changes.';

const agentRegistry = require('../agents/agent-registry.json');

const MOCK_CAPABILITY_MAP = {};
const MOCK_TOOL_MAP = {};

for (const [key, value] of Object.entries(agentRegistry)) {
  if (value.mockCapability) {
    MOCK_CAPABILITY_MAP[key] = value.mockCapability;
  }
  if (value.mockTool) {
    MOCK_TOOL_MAP[key] = value.mockTool;
  }
}

const INCREMENTAL_ADOPTION_THRESHOLD_LOC = 30000;

module.exports = {
  SECTION_WORD_COUNT_MIN,
  SECTION_WORD_COUNT_MAX,
  getSectionLimits,
  TEAM_COLORS,
  DISCLAIMER_TEXT,
  MOCK_CAPABILITY_MAP,
  MOCK_TOOL_MAP,
  INCREMENTAL_ADOPTION_THRESHOLD_LOC
};

