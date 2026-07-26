import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { RawParserOutput } from '@smart-map/shared';
import { parseTypeScriptProject } from './languages/typescript.js';
import { parsePythonProject } from './languages/python.js';

export type { RawParserOutput } from '@smart-map/shared';

/**
 * Detect project language/framework by inspecting root files.
 */
function detectLanguage(rootDir: string): 'typescript' | 'python' | 'unknown' {
  if (
    existsSync(join(rootDir, 'tsconfig.json')) ||
    existsSync(join(rootDir, 'package.json'))
  ) {
    return 'typescript';
  }
  if (
    existsSync(join(rootDir, 'pyproject.toml')) ||
    existsSync(join(rootDir, 'requirements.txt')) ||
    existsSync(join(rootDir, 'setup.py'))
  ) {
    return 'python';
  }
  return 'unknown';
}

/**
 * Parse a project directory and return raw parser output per service.
 * Supports TypeScript (Express / Fastify / NestJS) and Python (FastAPI).
 */
export async function parseProject(
  rootDir: string,
): Promise<RawParserOutput[]> {
  const lang = detectLanguage(rootDir);

  if (lang === 'typescript') {
    return parseTypeScriptProject(rootDir);
  }

  if (lang === 'python') {
    return parsePythonProject(rootDir);
  }

  console.warn(`[layer-1-parser] Unknown language in: ${rootDir}`);
  return [];
}
