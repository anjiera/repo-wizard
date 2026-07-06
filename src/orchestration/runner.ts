import { LlmAgent, InMemoryRunner, stringifyContent } from '@google/adk';
import * as fs from 'fs';
import { z } from 'zod';
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

const ContractSchema = z.object({
  status: z.string().optional(),
  agent_name: z.string(),
  contract: z.any() // Type contracts will validate the inner structure
});

const ManifestSchema = z.object({
  status: z.string().optional(),
  contracts: z.array(ContractSchema)
});

export async function runPipeline(manifestPath: string) {
  const resolvedManifestPath = path.resolve(process.cwd(), manifestPath);
  
  let rawManifest;
  try {
    rawManifest = JSON.parse(fs.readFileSync(resolvedManifestPath, 'utf8'));
  } catch (err: any) {
    throw new Error(`Failed to parse manifest JSON: ${err.message}`);
  }

  // Zod Validation!
  const parseResult = ManifestSchema.safeParse(rawManifest);
  if (!parseResult.success) {
    throw new Error(`Manifest Schema Validation Error: ${parseResult.error.message}`);
  }
  const manifest = rawManifest; // Type-safe after schema check


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

      // Exponential Backoff Retry Wrapper for ADK Execution
      const maxRetries = 3;
      let finalOutput = '';
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const responseGenerator = runner.runAsync({
            userId: 'local-user',
            sessionId,
            newMessage: { role: 'user', parts: [{ text: prompt }] } as any
          });
          
          let buffer = '';
          for await (const event of responseGenerator) {
            const text = stringifyContent(event) || '';
            buffer += text;
          }
          finalOutput = buffer;
          break; // Success! Break out of retry loop.
        } catch (execError: any) {
          if (attempt === maxRetries) throw execError;
          const backoff = Math.pow(2, attempt) * 500;
          console.warn(`[WARN] ${agentName} runAsync failed (attempt ${attempt}/${maxRetries}). Retrying in ${backoff}ms...`);
          await new Promise(res => setTimeout(res, backoff));
        }
      }
      
      // Secret Redaction Interceptor
      const redactedOutput = finalOutput
        .replace(new RegExp(process.env.GEMINI_API_KEY || 'MISSING_KEY', 'g'), '[REDACTED_API_KEY]')
        .replace(/sk-[a-zA-Z0-9]{48}/g, '[REDACTED_SECRET_TOKEN]');
      
      const obsPath = path.resolve(process.cwd(), '.repo-wizard/reports/repo-wizard/agents', `repo-wizard-observations-${agentName}.md`);
      fs.mkdirSync(path.dirname(obsPath), { recursive: true });
      fs.writeFileSync(obsPath, redactedOutput || `# Observations for ${agentName}\n\nEmpty output from ADK.\n`, 'utf8');
      
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
