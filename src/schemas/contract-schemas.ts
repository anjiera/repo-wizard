import { z } from 'zod';

/**
 * Base schema for generic agent contracts.
 */
export const baseContractSchema = z.object({
  targetDir: z.string().describe('The root directory for the audit.'),
  strictMode: z.boolean().default(true).describe('Whether to apply strict validation rules.'),
  skipTests: z.boolean().default(false).describe('Whether to skip scaffolded tests.'),
});

/**
 * Validates the overarching orchestrator session configuration payload
 */
export const sessionConfigSchema = z.object({
  mode: z.enum(['INTERACTIVE_LOCAL', 'HEADLESS']).default('HEADLESS'),
  compliance: z.array(z.string()).optional(),
  languages: z.array(z.string()).min(1, 'At least one programming language must be defined'),
  testTargets: z.array(z.string()).optional(),
  strictness: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  legacyStrategy: z.string().optional()
});

/**
 * Generic configuration for specialist subagents.
 */
export const specialistContractSchema = baseContractSchema.extend({
  subsystem: z.string().optional().describe('Specific subsystem to audit if applicable'),
  customRules: z.record(z.string(), z.any()).optional().describe('Custom rule overrides for this agent')
});

/**
 * Exports a centralized registry of all Zod schemas used to validate
 * parameter contracts and block injection vectors.
 */
export const contractSchemas = {
  baseContract: baseContractSchema,
  sessionConfig: sessionConfigSchema,
  specialistContract: specialistContractSchema
};
