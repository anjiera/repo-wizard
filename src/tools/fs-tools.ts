import * as fs from 'fs/promises';
import * as path from 'path';
import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Validates that the requested file path is within the allowed workspace boundary
 * to prevent path traversal vulnerabilities.
 */
function ensureSafePath(targetPath: string, workspaceRoot: string): string {
  const resolvedPath = path.resolve(workspaceRoot, targetPath);
  if (!resolvedPath.startsWith(path.resolve(workspaceRoot))) {
    throw new Error(`Security Error: Path traversal detected. Access to ${targetPath} is forbidden.`);
  }
  return resolvedPath;
}

export const readFileTool = new FunctionTool({
  name: 'read_file',
  description: 'Reads the contents of a file from the local workspace.',
  parameters: z.object({
    filePath: z.string().transform(v => v.replace(/\0/g, '').trim()).describe('The path to the file, relative to the workspace root.'),
  }),
  execute: async ({ filePath }) => {
    const workspaceRoot = process.cwd();
    const safePath = ensureSafePath(filePath, workspaceRoot);
    
    try {
      const content = await fs.readFile(safePath, 'utf8');
      return { success: true, content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});

export const writeFileTool = new FunctionTool({
  name: 'write_file',
  description: 'Writes content to a file in the local workspace. Creates directories if they do not exist.',
  parameters: z.object({
    filePath: z.string().transform(v => v.replace(/\0/g, '').trim()).describe('The path to the file, relative to the workspace root.'),
    content: z.string().describe('The content to write to the file.'),
  }),
  execute: async ({ filePath, content }) => {
    const workspaceRoot = process.cwd();
    const safePath = ensureSafePath(filePath, workspaceRoot);
    
    try {
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      await fs.writeFile(safePath, content, 'utf8');
      return { success: true, message: `Successfully wrote to ${filePath}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});

export const listDirectoryTool = new FunctionTool({
  name: 'list_directory',
  description: 'Lists the files and folders in a given directory.',
  parameters: z.object({
    dirPath: z.string().transform(v => v.replace(/\0/g, '').trim()).describe('The directory path to list, relative to the workspace root. Use "." for the root.'),
  }),
  execute: async ({ dirPath }) => {
    const workspaceRoot = process.cwd();
    const safePath = ensureSafePath(dirPath, workspaceRoot);
    
    try {
      const entries = await fs.readdir(safePath, { withFileTypes: true });
      const formatted = entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        isFile: e.isFile()
      }));
      return { success: true, entries: formatted };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});
