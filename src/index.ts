import { runPipeline } from './orchestration/runner.js';
import { contractSchemas } from './schemas/contract-schemas.js';
import * as agents from './agents/specialists.js';
import * as tools from './tools/fs-tools.js';

/**
 * Executes a full repository sweep using the ADK Team orchestration pipeline.
 * @param manifestPath The path to the active session manifest.json
 */
export async function runSweep(manifestPath: string) {
  try {
    await runPipeline(manifestPath);
  } catch (error) {
    console.error('Failed to execute ADK pipeline sweep:', error);
    process.exit(1);
  }
}

export {
  contractSchemas,
  agents,
  tools
};
