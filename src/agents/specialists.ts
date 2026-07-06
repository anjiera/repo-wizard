import * as fs from 'fs';
import * as path from 'path';
import { Agent } from '@google/adk';
import { readFileTool, writeFileTool, listDirectoryTool } from '../tools/fs-tools.js';

// Base registry type helper
interface RegistryEntry {
  title: string;
  description: string;
  pillar: string;
  alias: string;
  color: string;
  command: string | null;
  adkSpec: {
    model: string;
    tools: string[];
    temperature: number;
  };
}

const registryPath = path.resolve(process.cwd(), 'agents/agent-registry.json');
const registry: Record<string, RegistryEntry> = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

/**
 * Loads instructions from corresponding markdown file.
 */
function loadInstructions(agentKey: string): string {
  const filePath = path.resolve(process.cwd(), 'agents', `${agentKey}.md`);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return `You are the ${registry[agentKey]?.title || agentKey}. Audit the repository and verify compliance.`;
  }
}

/**
 * Helper to build an ADK Agent using the registry metadata and markdown prompt files
 */
function createAdkAgent(key: string): Agent {
  const meta = registry[key];
  if (!meta) {
    throw new Error(`Agent key ${key} not found in registry`);
  }
  return new Agent({
    name: key,
    description: meta.description,
    systemInstruction: loadInstructions(key),
    tools: [readFileTool, writeFileTool, listDirectoryTool]
  });
}

// ==========================================
// SECURITY PILLAR AGENTS (Commit 6a)
// ==========================================
export const aiRobustnessHardener = createAdkAgent('ai-robustness-hardener');
export const appsecHardener = createAdkAgent('appsec-hardener');
export const complianceAuditor = createAdkAgent('compliance-auditor');
export const legalNeutralityAuditor = createAdkAgent('legal-neutrality-auditor');
export const privacyHardener = createAdkAgent('privacy-hardener');
export const supplyChainAuditor = createAdkAgent('supply-chain-auditor');

export const securityAgents = {
  aiRobustnessHardener,
  appsecHardener,
  complianceAuditor,
  legalNeutralityAuditor,
  privacyHardener,
  supplyChainAuditor
};

// ==========================================
// QUALITY PILLAR AGENTS (Commit 6b)
// ==========================================
export const accessibilityAuditor = createAdkAgent('accessibility-auditor');
export const agentAlignmentAuditor = createAdkAgent('agent-alignment-auditor');
export const devOnboardingAuditor = createAdkAgent('dev-onboarding-auditor');
export const embeddedSystemsAuditor = createAdkAgent('embedded-systems-auditor');
export const fuzzEngineer = createAdkAgent('fuzz-engineer');
export const notebookAuditor = createAdkAgent('notebook-auditor');
export const qaEngineer = createAdkAgent('qa-engineer');
export const stateHardener = createAdkAgent('state-hardener');
export const vcsWorkflowEngineer = createAdkAgent('vcs-workflow-engineer');

export const qualityAgents = {
  accessibilityAuditor,
  agentAlignmentAuditor,
  devOnboardingAuditor,
  embeddedSystemsAuditor,
  fuzzEngineer,
  notebookAuditor,
  qaEngineer,
  stateHardener,
  vcsWorkflowEngineer
};

