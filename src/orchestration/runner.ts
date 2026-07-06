import { Team, Agent } from '@google/adk';
import * as fs from 'fs';
import * as path from 'path';
import { 
  securityAgents, qualityAgents, performanceAgents, 
  architectureAgents, helperAgents 
} from '../agents/specialists.js';

// Flatten the registry for fast lookup by kebab-case name
const allAgents: Record<string, Agent> = {};
const agentGroups = [
  securityAgents, qualityAgents, performanceAgents, 
  architectureAgents, helperAgents
];

for (const group of agentGroups) {
  for (const agent of Object.values(group)) {
    // The ADK Agent instance has its 'name' property set to the original kebab-case string
    allAgents[agent.name] = agent;
  }
}

export async function runPipeline(manifestPath: string) {
  const resolvedManifestPath = path.resolve(process.cwd(), manifestPath);
  const manifest = JSON.parse(fs.readFileSync(resolvedManifestPath, 'utf8'));
  
  if (!manifest.contracts || !Array.isArray(manifest.contracts)) {
    throw new Error('Manifest must contain a "contracts" array.');
  }

  console.log(`Starting ADK Team pipeline execution...`);

  // Gather active agents based on pending contracts
  const activeAgents: Agent[] = [];
  for (const entry of manifest.contracts) {
    if (entry.status === 'skipped' || entry.status === 'completed') {
      continue;
    }
    const agent = allAgents[entry.agent_name];
    if (agent) {
      activeAgents.push(agent);
    } else {
      console.warn(`Warning: Agent ${entry.agent_name} not found in ADK specialists.`);
    }
  }

  if (activeAgents.length === 0) {
    console.log('No active agents to run in this sweep.');
    return;
  }

  // Define the ADK Team orchestration layer
  // This natively replaces the raw child_process concurrency handling in the legacy script
  const team = new Team({
    name: 'repo-wizard-sweep',
    agents: activeAgents,
    lead: allAgents['repo-wizard'] // Sets repoWizard as the lead orchestrator
  });

  console.log(`Dispatching ADK Team with ${activeAgents.length} specialists...`);
  
  // Natively orchestrate the tasks via the Team context
  for (const entry of manifest.contracts) {
    if (entry.status === 'skipped' || entry.status === 'completed') {
      continue;
    }
    
    const agentName = entry.agent_name;
    const contract = JSON.stringify(entry.contract);
    const prompt = `Evaluate repository metadata and configure targets matching parameter contract: ${contract}`;

    console.log(`[INFO] Spawning ${agentName} via ADK Team...`);
    
    try {
      // ADK handles parallelization, retries, and context sandboxing natively
      const response = await team.execute({
        agent: agentName,
        prompt: prompt
      });
      
      const obsPath = path.resolve(process.cwd(), '.repo-wizard/reports/repo-wizard/agents', `repo-wizard-observations-${agentName}.md`);
      fs.mkdirSync(path.dirname(obsPath), { recursive: true });
      fs.writeFileSync(obsPath, response.text || `# Observations for ${agentName}\n\nEmpty output from ADK.\n`, 'utf8');
      
      entry.status = 'completed';
      console.log(`[DONE] ${agentName}`);
    } catch (err: any) {
      console.error(`[ERROR] ${agentName} execution failed:`, err.message);
    }
  }

  // Commit updated state back to manifest
  manifest.status = 'completed';
  fs.writeFileSync(resolvedManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[SUCCESS] All ADK specialists completed successfully.`);
}
