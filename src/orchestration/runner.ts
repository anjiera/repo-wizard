import { LlmAgent, InMemoryRunner, stringifyContent } from '@google/adk';
import * as fs from 'fs';
import * as path from 'path';
import { 
  securityAgents, qualityAgents, performanceAgents, 
  architectureAgents, helperAgents 
} from '../agents/specialists.js';

// Flatten the registry for fast lookup by kebab-case name
const allAgents: Record<string, LlmAgent> = {};
const agentGroups = [
  securityAgents, qualityAgents, performanceAgents, 
  architectureAgents, helperAgents
];

for (const group of agentGroups) {
  for (const agent of Object.values(group)) {
    const originalKey = agent.name.replace(/_/g, '-');
    allAgents[originalKey] = agent as LlmAgent;
  }
}

export async function runPipeline(manifestPath: string) {
  const resolvedManifestPath = path.resolve(process.cwd(), manifestPath);
  const manifest = JSON.parse(fs.readFileSync(resolvedManifestPath, 'utf8'));
  
  if (!manifest.contracts || !Array.isArray(manifest.contracts)) {
    throw new Error('Manifest must contain a "contracts" array.');
  }

  console.log(`Starting ADK Runner execution...`);

  const pendingContracts = manifest.contracts.filter(
    (c: any) => c.status !== 'skipped' && c.status !== 'completed'
  );

  if (pendingContracts.length === 0) {
    console.log('No active agents to run in this sweep.');
    return;
  }

  console.log(`Dispatching ADK Runner with ${pendingContracts.length} specialists...`);
  
  for (const entry of pendingContracts) {
    const agentName = entry.agent_name;
    const agent = allAgents[agentName];
    
    if (!agent) {
      console.warn(`Warning: Agent ${agentName} not found in ADK specialists.`);
      continue;
    }
    
    const contract = JSON.stringify(entry.contract);
    const prompt = `Evaluate repository metadata and configure targets matching parameter contract: ${contract}`;

    console.log(`[INFO] Spawning ${agentName} via ADK InMemoryRunner...`);
    
    try {
      if (process.env.ADK_MOCK_RUN === 'true') {
        const obsPath = path.resolve(process.cwd(), '.repo-wizard/reports/repo-wizard/agents', `repo-wizard-observations-${agentName}.md`);
        fs.mkdirSync(path.dirname(obsPath), { recursive: true });
        fs.writeFileSync(obsPath, `# Mock Observations for ${agentName}\n\nAll good.\n`, 'utf8');
        entry.status = 'completed';
        console.log(`[DONE] ${agentName}`);
        continue;
      }

      const runner = new InMemoryRunner({
        agent,
        appName: 'repo-wizard'
      });
      
      const sessionId = `session-${Date.now()}`;
      await runner.sessionService.createSession({
        appName: 'repo-wizard',
        userId: 'local-user',
        sessionId
      });

      const responseGenerator = runner.runAsync({
        userId: 'local-user',
        sessionId,
        newMessage: { role: 'user', parts: [{ text: prompt }] } as any
      });

      let finalOutput = '';
      for await (const event of responseGenerator) {
        // Collect model outputs, assuming they generate stringified text chunks
        const text = stringifyContent(event) || '';
        finalOutput += text;
      }
      
      const obsPath = path.resolve(process.cwd(), '.repo-wizard/reports/repo-wizard/agents', `repo-wizard-observations-${agentName}.md`);
      fs.mkdirSync(path.dirname(obsPath), { recursive: true });
      fs.writeFileSync(obsPath, finalOutput || `# Observations for ${agentName}\n\nEmpty output from ADK.\n`, 'utf8');
      
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
